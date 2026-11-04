"""Post-signature documents: MSME payment demand notice and BSA s.63 certificate draft.

Both are deterministic. The demand notice computes s.16 interest with the rate history in
app.legal.rates; the certificate pre-fills Part A of the BSA Schedule with the SHA-256 the
escrow anchored. Neither replaces a lawyer or the expert who signs Part B.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from fractions import Fraction

from pydantic import BaseModel, ConfigDict, Field

from app.drafting.engine import canonical
from app.drafting.text import clean, days, long_date
from app.legal.rates import msmed_interest
from app.models import ETH_ADDRESS, MAX_PAISE, Party
from app.money import format_inr, inr_in_words

IST = timezone(timedelta(hours=5, minutes=30))


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Invoice(_Strict):
    number: str = Field(min_length=1, max_length=60)
    amount_paise: int = Field(gt=0, le=MAX_PAISE)
    accepted_on: date = Field(description="Date of acceptance or deemed acceptance of the goods/services.")
    agreed_days: int = Field(ge=0, le=45, description="Agreed payment period; capped at 45 by s.15.")


class DemandRequest(_Strict):
    supplier: Party
    buyer: Party
    invoices: list[Invoice] = Field(min_length=1, max_length=50)
    paid_on: date | None = Field(default=None, description="Date to compute interest to; defaults to today.")
    bank_rate_override_pct: Fraction | None = Field(default=None, ge=0, le=20)
    agreement_reference: str | None = Field(default=None, max_length=200)


class NotMse(ValueError):
    pass


def demand_notice(req: DemandRequest, today: date) -> dict:
    if not req.supplier.is_mse:
        raise NotMse("sections 15-16 protect micro and small suppliers only; set the supplier's MSME category")
    as_of = req.paid_on or today
    rows, total_principal, total_interest, sources = [], 0, 0, []
    for inv in req.invoices:
        due = inv.accepted_on + timedelta(days=min(inv.agreed_days, 45))
        r = msmed_interest(inv.amount_paise, due, as_of, req.bank_rate_override_pct)
        total_principal += inv.amount_paise
        total_interest += r.interest_paise
        sources += [s for s in r.rate_sources if s not in sources]
        rows.append({
            "invoice": inv.number, "principal_paise": inv.amount_paise, "due_date": due.isoformat(),
            "days_late": max(0, r.days_late), "interest_paise": r.interest_paise,
        })
    s, b = req.supplier, req.buyer
    table = ["| Invoice | Amount | Due date | Days late | Interest (s.16) |", "|---|---|---|---|---|"]
    for r in rows:
        table.append(
            f"| {clean(r['invoice'])} | {format_inr(r['principal_paise'])} | {long_date(date.fromisoformat(r['due_date']))} "
            f"| {r['days_late']} | {format_inr(r['interest_paise'])} |"
        )
    table.append(f"| **Total** | {format_inr(total_principal)} | | | {format_inr(total_interest)} |")
    claim = total_principal + total_interest
    ref = f" under {clean(req.agreement_reference)}" if req.agreement_reference else ""
    udyam = f" (Udyam Registration No. {s.udyam_number})" if s.udyam_number else ""
    body = f"""# Notice of Demand for Payment under the MSMED Act, 2006

Date: {long_date(today)}

To: {clean(b.name)}, {clean(b.address)}, {b.state.value} ({clean(b.email)})

From: {clean(s.name)}{udyam}, {clean(s.address)}, {s.state.value} ({clean(s.email)})

## Subject: Overdue payment for goods or services supplied{ref}

1. We are a {s.msme_category.value} enterprise. We supplied the goods or services in the invoices below, which you accepted or are deemed to have accepted on the dates stated.

2. Under section 15 of the Micro, Small and Medium Enterprises Development Act, 2006, you were required to pay each invoice by the agreed date, and in no case later than {days(45)} from acceptance or deemed acceptance. You have not paid.

3. Under section 16 of the Act, you are liable to pay compound interest with monthly rests at three times the bank rate notified by the Reserve Bank of India, from the day after each due date, notwithstanding any agreement to the contrary. Interest computed to {long_date(as_of)}:

{chr(10).join(table)}

Rate applied: three times the Bank Rate in force at each monthly rest ({"; ".join(_rate_lines(sources))}).

4. You are called upon to pay {format_inr(claim)} ({inr_in_words(claim)}), being the principal of {format_inr(total_principal)} and interest of {format_inr(total_interest)}, within {days(15)} of this notice. Interest continues to accrue until payment.

5. If payment is not made, we will refer the dispute to the Micro and Small Enterprises Facilitation Council under section 18 of the Act, without further notice. Under section 23 of the Act, interest paid under section 16 is not deductible for income tax, and a business buyer's deduction for the principal depends on timely payment.

For {clean(s.name)}

Authorised signatory: {clean(s.signatory_name or s.name)}
"""
    return {
        "text": canonical(body),
        "rows": rows,
        "principal_paise": total_principal,
        "interest_paise": total_interest,
        "claim_paise": claim,
        "as_of": as_of.isoformat(),
        "rate_sources": sources,
    }


def _rate_lines(sources: list[str]) -> list[str]:
    return [s.split(" (")[0] for s in sources] or ["no interest accrued"]


class CertificateRequest(_Strict):
    document_title: str = Field(min_length=1, max_length=200)
    document_hash: str = Field(pattern=r"^0x[0-9a-fA-F]{64}$")
    certifier_name: str = Field(min_length=1, max_length=200)
    certifier_role: str = Field(min_length=1, max_length=200)
    chain: str | None = Field(default=None, max_length=40)
    escrow_address: str | None = None
    tx_hash: str | None = Field(default=None, pattern=r"^0x[0-9a-fA-F]{64}$")
    anchored_at: datetime | None = None


def bsa_certificate_part_a(req: CertificateRequest, now: datetime) -> str:
    if req.escrow_address and not ETH_ADDRESS.fullmatch(req.escrow_address):
        raise ValueError("escrow_address must be a 0x-prefixed 20-byte hex address")
    anchor = ""
    if req.escrow_address:
        when = (req.anchored_at or now).astimezone(IST).strftime("%d %B %Y, %H:%M IST")
        anchor = (
            f"\nThe same hash value was recorded on {clean(req.chain or 'a public blockchain test network')} in the "
            f"escrow contract at address {req.escrow_address}"
            + (f" by transaction {req.tx_hash}" if req.tx_hash else "")
            + f", at or before {when}. This on-chain record corroborates the integrity of the document; it does not "
            "replace this certificate.\n"
        )
    text = f"""# Certificate under Section 63(4)(c) of the Bharatiya Sakshya Adhiniyam, 2023

## Part A (to be filled by the party)

I, {clean(req.certifier_name)}, {clean(req.certifier_role)}, do hereby solemnly affirm and sincerely state as follows:

1. I have produced the electronic record titled "{clean(req.document_title)}", obtained from the Clausewright document service (cloud server).

2. The electronic record was produced from a computer or communication device in the ordinary course of activities, over which I had lawful control, and the device was operating properly throughout the material part of the period.

3. The hash value of the electronic record is as follows:

| Algorithm | Hash value |
|---|---|
| SHA256 | {req.document_hash.removeprefix('0x').lower()} |
{anchor}
4. A hash report is enclosed.

Place: ____________  Date: ____________

Signature: ____________

## Part B (to be filled by the expert)

To be completed and signed by an expert, who independently computes the hash value and confirms it matches Part A.
"""
    return canonical(text)
