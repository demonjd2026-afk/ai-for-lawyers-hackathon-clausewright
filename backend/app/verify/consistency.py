"""Three-way consistency proof: term sheet <-> contract prose <-> escrow parameters.

The verifier never trusts the generator: it re-parses the rendered text (figures *and*
words), re-derives parameters from the term sheet, and compares both against whatever was
actually deployed (read back from chain by the client). Any single disagreement fails.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from datetime import datetime

from app.codegen.escrow import DAY, EscrowParams, end_of_day_ist
from app.drafting.engine import sha256_hex, terms_hash
from app.models import AgreementType, TermSheet
from app.money import _words_to_int, parse_inr_figure, parse_inr_words


@dataclass(frozen=True)
class Check:
    id: str
    ok: bool
    expected: str
    actual: str
    where: str


def _sections(text: str) -> dict[str, str]:
    """heading (without number) -> body"""
    parts = re.split(r"^## (?:\d+\. )?(.+)$", text, flags=re.M)
    return {parts[i].strip(): parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}


def _table(body: str) -> list[list[str]]:
    rows = []
    for ln in body.splitlines():
        if ln.startswith("|") and not ln.startswith("|---"):
            rows.append([c.strip() for c in ln.strip().strip("|").split("|")])
    return rows[1:]  # drop header


_DAYS = re.compile(r"([a-z][a-z\- ]*?) \((\d+)\) (?:days?|months?|years?|hours?)\b")


def _days_phrases(body: str) -> list[tuple[int, int | None]]:
    """[(figure, value_of_words)] for every 'fifteen (15) days' phrase."""
    out = []
    for words, fig in _DAYS.findall(body):
        # take the trailing number words only ("within fifteen" -> "fifteen")
        toks = words.split()
        num = []
        for t in reversed(toks):
            try:
                _words_to_int([t])
                num.insert(0, t)
            except ValueError:
                break
        try:
            val = _words_to_int(num) if num else None
        except ValueError:
            val = None
        out.append((int(fig), val))
    return out


def _c(checks: list[Check], id: str, expected, actual, where: str) -> None:
    checks.append(Check(id, expected == actual, str(expected), str(actual), where))


def verify(ts: TermSheet, text: str, params: EscrowParams | None = None,
           onchain: dict | None = None) -> list[Check]:
    checks: list[Check] = []
    sec = _sections(text)

    # every "N (N) days" phrase anywhere must agree with itself
    for heading, body in sec.items():
        for fig, val in _days_phrases(body):
            if val is not None and fig != val:
                checks.append(Check("words-vs-figures.days", False, str(fig), str(val), heading))

    _verify_common(ts, sec, checks)
    if ts.agreement_type is AgreementType.EMPLOYMENT and ts.employment:
        _verify_employment_text(ts, sec, checks)
    if ts.agreement_type is AgreementType.SERVICE:
        _verify_service_text(ts, sec, checks)
        if ts.escrow.enabled:
            if params is None:
                checks.append(Check("escrow.params", False, "derived parameters", "none", "Schedule B"))
            else:
                _verify_params(ts, params, text, sec, checks)
                if onchain is not None:
                    _verify_onchain(params, onchain, checks)
    return checks


def _verify_service_text(ts: TermSheet, sec: dict[str, str], checks: list[Check]) -> None:
    acc = sec.get("Delivery and Acceptance", "")
    acc_days = {fig for fig, _ in _days_phrases(acc)}
    _c(checks, "text.acceptance_days", {ts.acceptance_days}, acc_days, "Delivery and Acceptance")

    fees = sec.get("Fees and Payment", "")
    m = re.search(r"payable within [a-z\- ]+ \((\d+)\) days? of its acceptance", fees)
    _c(checks, "text.payment_days", ts.payment_days, int(m.group(1)) if m else None, "Fees and Payment")
    m = re.search(r"total fee of (₹[\d,]+\.\d{2}) \((Rupees .+? Only)\)", fees)
    if m:
        _c(checks, "text.total.figure", ts.total_paise, parse_inr_figure(m.group(1)), "Fees and Payment")
        _c(checks, "text.total.words", ts.total_paise, parse_inr_words(m.group(2)), "Fees and Payment")
    else:
        checks.append(Check("text.total", False, "total fee statement", "not found", "Fees and Payment"))

    rows = _table(sec.get("Schedule A: Milestones", ""))
    body_rows = [r for r in rows if r and r[0].isdigit()]
    _c(checks, "schedule_a.count", len(ts.milestones), len(body_rows), "Schedule A")
    for i, (m_ts, r) in enumerate(zip(ts.milestones, body_rows, strict=False), 1):
        where = f"Schedule A row {i}"
        try:
            fig, words = parse_inr_figure(r[4]), parse_inr_words(r[5])
        except (ValueError, IndexError) as e:
            checks.append(Check(f"schedule_a.{i}.parse", False, "amount", str(e), where))
            continue
        _c(checks, f"schedule_a.{i}.figure", m_ts.amount_paise, fig, where)
        _c(checks, f"schedule_a.{i}.words", m_ts.amount_paise, words, where)
        try:
            due = datetime.strptime(r[3], "%d %B %Y").date()
        except ValueError:
            due = r[3]
        _c(checks, f"schedule_a.{i}.due", m_ts.due_date, due, where)
    total_row = next((r for r in rows if len(r) > 1 and "Total" in r[1]), None)
    if total_row:
        _c(checks, "schedule_a.total", ts.total_paise, parse_inr_figure(total_row[4]), "Schedule A total")


def _verify_common(ts: TermSheet, sec: dict[str, str], checks: list[Check]) -> None:
    from app.drafting.engine import long_date
    from app.drafting.text import clean

    first = next(iter(sec.values()), "")
    for role, p in (("client", ts.client), ("provider", ts.provider)):
        name = clean(p.name)
        _c(checks, f"parties.{role}.named", True, f"**{name}**" in first, "Parties")
        sign = sec.get("Execution", "")
        _c(checks, f"execution.{role}.block", True, f": {name}\n" in sign + "\n", "Execution")
    _c(checks, "parties.effective_date", True, long_date(ts.effective_date) in first, "Parties")
    if ts.agreement_type is AgreementType.NDA:
        term = sec.get("Term and Return", "")
        m = re.search(r"last for [a-z\- ]+ \((\d+)\) years?", term)
        _c(checks, "nda.confidentiality_years", ts.confidentiality_years, int(m.group(1)) if m else None,
           "Term and Return")
        purpose = sec.get("Purpose", "")
        _c(checks, "nda.purpose", True, clean(ts.nda_purpose or "", multiline=True) in purpose, "Purpose")
    if ts.non_solicit_months_after_term:
        ns = next((b for h, b in sec.items() if h.startswith("Non-Solicitation")), "")
        m = re.search(r"\((\d+)\) months?", ns)
        _c(checks, "non_solicit.months", ts.non_solicit_months_after_term, int(m.group(1)) if m else None,
           "Non-Solicitation")
    else:
        _c(checks, "non_solicit.absent", False, any(h.startswith("Non-Solicitation") for h in sec),
           "Non-Solicitation")
    # a void post-term non-compete must never be drafted, whatever the term sheet says
    _c(checks, "non_compete.absent", False, any("compet" in h.lower() for h in sec), "whole document")


def _verify_employment_text(ts: TermSheet, sec: dict[str, str], checks: list[Check]) -> None:
    from app.drafting.engine import _pay_rows

    e = ts.employment
    rows = {r[0].strip("*"): r for r in _table(sec.get("Remuneration", "")) if len(r) >= 3}
    expected = dict(_pay_rows(e)) | {"Gross monthly remuneration": e.gross, "Annual gross remuneration": e.gross * 12}
    _c(checks, "pay.components", sorted(expected), sorted(rows), "Remuneration")
    for k, v in expected.items():
        r = rows.get(k)
        if not r:
            continue
        try:
            _c(checks, f"pay.{k}.figure", v, parse_inr_figure(r[1]), "Remuneration")
            _c(checks, f"pay.{k}.words", v, parse_inr_words(r[2]), "Remuneration")
        except ValueError as err:
            checks.append(Check(f"pay.{k}.parse", False, str(v), str(err), "Remuneration"))
    _c(checks, "pay.gross_sum", e.gross, sum(v for _, v in _pay_rows(e)), "Remuneration")
    part = {r[0]: r[1] for r in _table(sec.get("Schedule: Particulars of Employment", "")) if len(r) >= 2}
    from app.money import format_inr

    _c(checks, "particulars.wages", f"{format_inr(e.deemed_wages)} per month", part.get("Wages (Code on Wages)"),
       "Particulars")
    _c(checks, "particulars.gross", f"{format_inr(e.gross)} per month", part.get("Gross remuneration"), "Particulars")


def _verify_params(ts: TermSheet, p: EscrowParams, text: str, sec: dict[str, str], checks: list[Check]) -> None:
    w = "escrow parameters"
    _c(checks, "params.document_hash", sha256_hex(text), p.document_hash, w)
    _c(checks, "params.terms_hash", terms_hash(ts), p.terms_hash, w)
    _c(checks, "params.payer", (ts.client.wallet or "").lower(), p.payer.lower(), w)
    _c(checks, "params.payee", (ts.provider.wallet or "").lower(), p.payee.lower(), w)
    _c(checks, "params.arbiter", (ts.escrow.arbiter_wallet or "").lower(), p.arbiter.lower(), w)
    _c(checks, "params.acceptance_window", ts.acceptance_days * DAY, p.acceptance_window_s, w)
    _c(checks, "params.msme_mode", ts.provider.is_mse, p.msme_mode, w)
    _c(checks, "params.milestone_count", len(ts.milestones), len(p.milestones), w)
    for i, (m_ts, m_p) in enumerate(zip(ts.milestones, p.milestones, strict=False), 1):
        _c(checks, f"params.{i}.amount", m_ts.amount_paise, m_p.amount, w)
        _c(checks, f"params.{i}.due", end_of_day_ist(m_ts.due_date), m_p.due_date, w)
    _c(checks, "params.total", ts.total_paise, p.total, w)

    # Schedule B in the prose must print exactly these parameters.
    sb = {r[0]: r[1] for r in _table(sec.get("Schedule B: Escrow Parameters", "")) if len(r) >= 2}
    where = "Schedule B"
    _c(checks, "schedule_b.payer", p.payer, sb.get("Payer (Client) wallet"), where)
    _c(checks, "schedule_b.payee", p.payee, sb.get("Payee (Service Provider) wallet"), where)
    _c(checks, "schedule_b.arbiter", p.arbiter, sb.get("Escrow Arbiter wallet"), where)
    _c(checks, "schedule_b.terms_hash", p.terms_hash, sb.get("Term sheet hash (SHA-256)"), where)
    _c(checks, "schedule_b.funding_deadline", str(p.funding_deadline), sb.get("Funding deadline (Unix time)"), where)
    win = sb.get("Acceptance window", "")
    _c(checks, "schedule_b.acceptance_window", str(p.acceptance_window_s), win.split(" ")[0] if win else None, where)
    for i, m in enumerate(p.milestones, 1):
        _c(checks, f"schedule_b.{i}", f"{m.amount} / {m.due_date}",
           sb.get(f"Milestone {i} amount (paise) / due (Unix time)"), where)


def _verify_onchain(p: EscrowParams, chain: dict, checks: list[Check]) -> None:
    """`chain` is what the browser read back from the deployed contract."""
    w = "deployed contract"

    def low(x):
        return str(x).lower() if x is not None else None

    _c(checks, "chain.document_hash", low(p.document_hash), low(chain.get("documentHash")), w)
    _c(checks, "chain.terms_hash", low(p.terms_hash), low(chain.get("termsHash")), w)
    _c(checks, "chain.token", low(p.token), low(chain.get("token")), w)
    _c(checks, "chain.payer", low(p.payer), low(chain.get("payer")), w)
    _c(checks, "chain.payee", low(p.payee), low(chain.get("payee")), w)
    _c(checks, "chain.arbiter", low(p.arbiter), low(chain.get("arbiter")), w)
    _c(checks, "chain.acceptance_window", p.acceptance_window_s, _int(chain.get("acceptanceWindow")), w)
    _c(checks, "chain.funding_deadline", p.funding_deadline, _int(chain.get("fundingDeadline")), w)
    _c(checks, "chain.msme_mode", p.msme_mode, chain.get("msmeMode"), w)
    _c(checks, "chain.total", p.total, _int(chain.get("totalAmount")), w)
    ms = chain.get("milestones") or []
    _c(checks, "chain.milestone_count", len(p.milestones), len(ms), w)
    for i, (m, c) in enumerate(zip(p.milestones, ms, strict=False), 1):
        _c(checks, f"chain.{i}.amount", m.amount, _int(c.get("amount")), w)
        _c(checks, f"chain.{i}.due", m.due_date, _int(c.get("dueDate")), w)


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def summary(checks: list[Check]) -> dict:
    failed = [asdict(c) for c in checks if not c.ok]
    return {"ok": not failed, "passed": len(checks) - len(failed), "total": len(checks), "failed": failed}
