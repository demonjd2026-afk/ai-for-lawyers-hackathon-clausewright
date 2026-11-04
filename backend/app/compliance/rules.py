"""Deterministic Indian-law checks over a TermSheet.

Every finding cites knowledge-base entries (app.legal.kb). Blockers stop drafting; most
carry a safe autofix the UI can apply in one click.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterator
from datetime import date

from app.legal.kb import cite
from app.legal.rates import stamp_advice
from app.models import (
    AgreementType,
    ArbitratorAppointment,
    EmploymentType,
    EntityType,
    FeeNature,
    Finding,
    IpModel,
    MsmeCategory,
    Severity,
    TermSheet,
)
from app.money import format_inr

Rule = Callable[[TermSheet, date], Iterator[Finding]]
RULES: list[Rule] = []


def rule(fn: Rule) -> Rule:
    RULES.append(fn)
    return fn


def _f(rule_id: str, severity: Severity, title: str, detail: str, kb_ids: list[str], **kw) -> Finding:
    return Finding(rule_id=rule_id, severity=severity, title=title, detail=detail, citations=cite(*kb_ids), **kw)


def _service(ts: TermSheet) -> bool:
    return ts.agreement_type is AgreementType.SERVICE


# ------------------------------------------------------------------------ capacity


@rule
def capacity(ts: TermSheet, today: date) -> Iterator[Finding]:
    if ts.agreement_type is AgreementType.EMPLOYMENT and ts.employment:
        e = ts.employment
        dob, doj = e.employee_date_of_birth, e.date_of_joining
        age = doj.year - dob.year - ((doj.month, doj.day) < (dob.month, dob.day))
        if age < 18:
            yield _f(
                "EMP-MINOR", Severity.BLOCKER,
                f"Employee will be {age} on the date of joining",
                "A contract with a minor is void, and employing children and adolescents is restricted by separate "
                "child-labour law. Clausewright does not draft appointment letters for persons under 18.",
                ["ica_s11", "mohori_bibee_1903"],
                field="employment.employee_date_of_birth",
            )
    for role, p in (("client", ts.client), ("provider", ts.provider)):
        if ts.agreement_type is AgreementType.EMPLOYMENT and role == "provider":
            continue  # age is computed from the date of birth above
        if p.entity_type is EntityType.INDIVIDUAL and not p.is_adult_confirmed:
            yield _f(
                "ICA-11-MINOR", Severity.BLOCKER,
                f"Confirm the {role} is at least 18",
                "An agreement with a minor is void, not merely voidable, so it cannot bind them or be ratified later.",
                ["ica_s11", "mohori_bibee_1903"],
                fix="Confirm the individual has attained majority, or contract through a guardian or entity.",
                field=f"{role}.is_adult_confirmed",
            )


# -------------------------------------------------------------------------- MSMED


@rule
def msme_payment(ts: TermSheet, today: date) -> Iterator[Finding]:
    if not _service(ts):
        return
    p = ts.provider
    if p.is_mse:
        if ts.payment_days > 45:
            yield _f(
                "MSMED-15-45DAY", Severity.BLOCKER,
                f"Payment term of {ts.payment_days} days exceeds the 45-day statutory cap",
                "For a micro or small supplier, payment must be made by the agreed date, and in no case later than "
                "45 days from acceptance or deemed acceptance, notwithstanding any contract term. Delay attracts "
                "compound interest at three times the RBI bank rate.",
                ["msmed_s15", "msmed_s16"],
                fix="Set the payment term to 45 days or less.",
                field="payment_days", autofix={"path": "payment_days", "value": 45},
            )
        if ts.acceptance_days > 15:
            yield _f(
                "MSMED-2B-15DAY", Severity.BLOCKER,
                f"Acceptance window of {ts.acceptance_days} days is longer than the law allows the buyer",
                "If the buyer does not object in writing within 15 days of delivery, the day of delivery is deemed "
                "the day of acceptance. A longer window misstates the law and would let payment drift.",
                ["msmed_s2b"],
                fix="Set the acceptance window to 15 days or less.",
                field="acceptance_days", autofix={"path": "acceptance_days", "value": 15},
            )
        if not p.udyam_number:
            yield _f(
                "MSMED-UDYAM", Severity.WARNING,
                "No Udyam registration number for the MSE service provider",
                "MSMED protections, including the Facilitation Council route, are tied to Udyam registration; the "
                "Supreme Court has held the supplier must be registered when the contract is made to claim them.",
                ["udyam", "silpi_2021"],
                fix="Add the provider's Udyam number (format UDYAM-XX-00-0000000), or register before signing.",
                field="provider.udyam_number",
            )
        elif p.udyam_registration_date and p.udyam_registration_date > ts.effective_date:
            yield _f(
                "MSMED-UDYAM-LATE", Severity.WARNING,
                "Udyam registration is dated after the agreement",
                "The Supreme Court has held benefits apply only to contracts made after registration; a larger bench "
                "is reconsidering this, so the Facilitation Council route may be contested for this contract.",
                ["silpi_2021", "nbcc_2025"],
                field="provider.udyam_registration_date",
            )
        if ts.client.entity_type is not EntityType.INDIVIDUAL:
            yield _f(
                "IT-43BH", Severity.INFO,
                "Client's tax deduction depends on paying this MSE on time",
                "Under section 37(2)(g) of the Income-tax Act, 2025 (formerly section 43B(h)), a business buyer can "
                "claim the expense only in the year it actually pays a micro or small enterprise, unless it pays "
                "within the MSMED time limit. Paying late costs the client both statutory interest and the "
                "deduction, which is a strong argument in negotiation.",
                ["it_43bh"],
            )
    elif p.msme_category is MsmeCategory.MEDIUM:
        yield _f(
            "MSMED-MEDIUM", Severity.INFO,
            "Medium enterprises are outside the delayed-payment protections",
            "Sections 15 to 18 protect micro and small suppliers only, so the 45-day cap and statutory interest do "
            "not apply. Negotiate a contractual late-payment interest clause instead.",
            ["msmed_s15"],
        )


# ------------------------------------------------------------ restraint of trade / s.27, s.28


@rule
def restraint(ts: TermSheet, today: date) -> Iterator[Finding]:
    if ts.non_compete_months_after_term:
        yield _f(
            "ICA-27-NONCOMPETE", Severity.BLOCKER,
            "Post-term non-compete is void in India",
            "Agreements restraining anyone from a lawful profession, trade or business are void except on sale of "
            "goodwill. Courts enforce restraints only during the term of the relationship, so a post-term "
            "non-compete gives false comfort.",
            ["ica_s27", "percept_2006", "varun_tyagi_2025", "parraj_2026"],
            fix="Remove it; rely on confidentiality and a reasonable non-solicitation clause instead.",
            field="non_compete_months_after_term",
            autofix={"path": "non_compete_months_after_term", "value": 0},
        )
    if ts.non_solicit_months_after_term > 12:
        yield _f(
            "ICA-27-NONSOLICIT", Severity.WARNING,
            f"Non-solicitation of {ts.non_solicit_months_after_term} months is likely to be read down",
            "Post-term non-solicitation is tested against section 27; courts have upheld a narrow staff "
            "non-solicit tied to protecting confidential information, so keep it short.",
            ["ica_s27", "parraj_2026"],
            fix="Use 12 months or less.",
            field="non_solicit_months_after_term",
            autofix={"path": "non_solicit_months_after_term", "value": 12},
        )
    if ts.claims_window_days is not None:
        yield _f(
            "ICA-28-LIMITATION", Severity.INFO,
            "Claims-notice period drafted as notice only",
            "A clause that extinguishes rights or bars remedies after a period shorter than the statutory "
            "limitation is void. Clausewright drafts your period as a notice obligation that does not cut short "
            "the right to sue.",
            ["ica_s28", "limitation_act"],
        )


# ------------------------------------------------------------------------- arbitration


@rule
def arbitration(ts: TermSheet, today: date) -> Iterator[Finding]:
    if ts.agreement_type is AgreementType.EMPLOYMENT:
        return  # appointment letters use the labour-code machinery and courts
    a = ts.arbitration
    if not a.enabled:
        if _service(ts) and ts.escrow.enabled:
            yield _f(
                "ESCROW-NO-ARB", Severity.BLOCKER,
                "Escrow needs a neutral dispute forum",
                "The escrow arbiter gives effect to an arbitral award or settlement; without arbitration there is no "
                "neutral process for it to follow.",
                ["aca_1996"],
                field="arbitration.enabled", autofix={"path": "arbitration.enabled", "value": True},
            )
        return
    if a.appointment is ArbitratorAppointment.UNILATERAL:
        yield _f(
            "ACA-UNILATERAL", Severity.BLOCKER,
            "One party cannot appoint the sole arbitrator",
            "Unilateral appointment clauses breach equal treatment of parties; a Constitution Bench of the Supreme "
            "Court held in November 2024 that such clauses are invalid, following earlier rulings on ineligible "
            "appointing authorities.",
            ["core_2024", "perkins_2019", "aca_s12_5"],
            fix="Use appointment by mutual consent (court-appointed under section 11 if that fails) or by an institution.",
            field="arbitration.appointment",
            autofix={"path": "arbitration.appointment", "value": ArbitratorAppointment.MUTUAL.value},
        )
    if not a.seat_city:
        yield _f(
            "ACA-SEAT", Severity.BLOCKER,
            "Arbitration seat is missing",
            "The seat decides which courts supervise the arbitration; leaving it out invites a jurisdiction fight "
            "before the dispute is even heard.",
            ["aca_s20"],
            field="arbitration.seat_city",
            autofix={"path": "arbitration.seat_city", "value": ts.jurisdiction_city},
        )
    if a.appointment is ArbitratorAppointment.INSTITUTION and not a.institution:
        yield _f(
            "ACA-INSTITUTION", Severity.BLOCKER,
            "Institutional arbitration chosen but no institution named",
            "An unnamed institution makes the clause unworkable.",
            ["aca_1996"],
            field="arbitration.institution",
        )
    if _service(ts) and ts.provider.is_mse:
        yield _f(
            "MSMED-18-MSEFC", Severity.INFO,
            "MSE supplier keeps the Facilitation Council route",
            "Section 18 of the MSMED Act overrides a private arbitration clause for payment disputes, and the "
            "Council where the supplier is located has jurisdiction regardless of the contractual seat. The draft "
            "says so expressly to avoid a jurisdiction fight.",
            ["msmed_s18", "mahakali_2022", "harcharan_2025", "msmed_amend_2026"],
        )


# --------------------------------------------------------------- damages and liability


@rule
def damages(ts: TermSheet, today: date) -> Iterator[Finding]:
    if not _service(ts):
        return
    if ts.liquidated_damages_pct_per_week:
        sev = Severity.WARNING if ts.liquidated_damages_pct_per_week > 2 else Severity.INFO
        yield _f(
            "ICA-74-LD", sev,
            "Liquidated damages are capped at reasonable compensation",
            "Courts award only reasonable compensation up to the stated sum, and expect proof of loss unless loss is "
            "hard to prove. Keep the rate a genuine pre-estimate; the draft also caps it at 10% of the milestone fee.",
            ["ica_s74", "kailash_nath_2015"],
            field="liquidated_damages_pct_per_week",
        )
    if ts.liability_cap_multiple is None:
        yield _f(
            "LIABILITY-UNCAPPED", Severity.WARNING,
            "Liability is uncapped",
            "Without a cap a small provider is exposed to losses far above the contract value.",
            ["ica_s73"],
            field="liability_cap_multiple", autofix={"path": "liability_cap_multiple", "value": 1.0},
        )
    if ts.termination_notice_days == 0:
        yield _f(
            "TERMINATION-NOTICE", Severity.WARNING,
            "Termination for convenience with no notice",
            "Zero notice lets either side walk away mid-milestone; the draft still pays pro rata for work done.",
            [],
            field="termination_notice_days", autofix={"path": "termination_notice_days", "value": 15},
        )


# ------------------------------------------------------------------------- copyright


@rule
def copyright_rules(ts: TermSheet, today: date) -> Iterator[Finding]:
    if not _service(ts) or ts.ip_model is not IpModel.ASSIGNMENT:
        return
    if not ts.ip_assignment_worldwide:
        yield _f(
            "COPYRIGHT-19-6", Severity.WARNING,
            "Assignment limited to India",
            "If territory is not specified the law presumes India; the client may need worldwide rights to exploit "
            "the work abroad or online.",
            ["copyright_s19"],
            field="ip_assignment_worldwide", autofix={"path": "ip_assignment_worldwide", "value": True},
        )
    if not ts.ip_assignment_full_term:
        yield _f(
            "COPYRIGHT-19-5", Severity.WARNING,
            "Assignment limited to five years",
            "If duration is not specified an assignment is deemed to last five years, after which rights revert.",
            ["copyright_s19"],
            field="ip_assignment_full_term", autofix={"path": "ip_assignment_full_term", "value": True},
        )


# ----------------------------------------------------------------------------- DPDP

_PERSONAL_DATA = re.compile(
    r"\b(personal data|customer data|user data|patient|health records?|aadhaar|kyc|phone numbers?|email lists?|"
    r"crm|payroll|employee records?)\b",
    re.I,
)


@rule
def data_protection(ts: TermSheet, today: date) -> Iterator[Finding]:
    if ts.agreement_type is AgreementType.EMPLOYMENT:
        return  # the appointment letter carries its own employee-data clause
    text = " ".join(filter(None, [ts.scope, ts.nda_purpose] + [m.deliverable for m in ts.milestones]))
    if ts.processes_personal_data:
        yield _f(
            "DPDP-8-PROCESSOR", Severity.INFO,
            "Data processing clause included",
            "A Data Fiduciary may engage a Data Processor only under a valid contract and stays responsible for "
            "it. The draft adds processor terms: instructions only, safeguards with one-year access logs, 24-hour "
            "breach notice so the client can meet the 72-hour report to the Board, sub-processor consent and "
            "erasure. Most DPDP Rules apply from 13 May 2027; drafting to them now avoids re-papering.",
            ["dpdp_s8", "dpdp_rules_2025"],
        )
    elif hit := _PERSONAL_DATA.search(text):
        yield _f(
            "DPDP-8-UNDECLARED", Severity.WARNING,
            f"Scope mentions \"{hit.group(0)}\" but personal-data processing is off",
            "If the provider will touch personal data on the client's behalf, the DPDP Act requires a processor "
            "contract.",
            ["dpdp_s8"],
            field="processes_personal_data", autofix={"path": "processes_personal_data", "value": True},
        )


# ------------------------------------------------------------------------ execution


@rule
def execution(ts: TermSheet, today: date) -> Iterator[Finding]:
    if ts.agreement_type is not AgreementType.EMPLOYMENT:
        advice = stamp_advice(ts.governing_state)
        if advice["verified"]:
            detail = (
                f"Verified rate for a general agreement in {advice['state']}: "
                f"{format_inr(advice['duty_paise'])} ({advice['article']}, from {advice['effective_from']}). "
            )
        else:
            detail = advice["message"] + " "
        yield _f(
            "STAMP-DUTY", Severity.INFO,
            f"Pay stamp duty in {ts.governing_state.value} before signing",
            detail + "An unstamped agreement is not void but cannot be admitted in evidence until duty and penalty "
            "are paid; the Supreme Court has held this curable and that it does not stop arbitration.",
            ["stamp_act", "interplay_2023"],
        )
    if ts.e_sign:
        yield _f(
            "ITACT-ESIGN", Severity.INFO,
            "Electronic execution is valid for this document",
            "Contracts formed electronically are enforceable, and Aadhaar eSign or a digital signature certificate "
            "is a recognised electronic signature. Wills, trusts and most powers of attorney still cannot be "
            "e-signed, so Clausewright does not offer them.",
            ["itact_s10a", "itact_s3a", "itact_sch1"],
        )


# --------------------------------------------------------------------------- tax


@rule
def tax(ts: TermSheet, today: date) -> Iterator[Finding]:
    if not _service(ts):
        return
    if ts.prices_exclusive_of_gst and not ts.provider.gstin:
        yield _f(
            "GST-UNREGISTERED", Severity.WARNING,
            "Fees say \"plus GST\" but the provider has no GSTIN",
            "An unregistered supplier cannot charge GST. Either add the GSTIN or make the fee inclusive.",
            ["cgst_registration"],
            field="provider.gstin",
            autofix={"path": "prices_exclusive_of_gst", "value": False},
        )
    rate = "10%" if ts.fee_nature is FeeNature.PROFESSIONAL else "2%"
    yield _f(
        "TDS-NATURE", Severity.INFO,
        f"Fees treated as {ts.fee_nature.value} services: TDS at {rate} if the client must deduct",
        "Professional services attract 10% and technical services 2% above ₹50,000 a year per payee. The draft "
        "records the agreed classification, which avoids the most common TDS dispute between freelancers and "
        "clients.",
        ["it_tds_professional"],
        field="fee_nature",
    )


# ------------------------------------------------------------------- dates & money


@rule
def schedule(ts: TermSheet, today: date) -> Iterator[Finding]:
    if not _service(ts):
        return
    prev = None
    for i, m in enumerate(ts.milestones, 1):
        if m.due_date < ts.effective_date:
            yield _f(
                "DATES-BEFORE-START", Severity.BLOCKER,
                f"Milestone {i} is due before the agreement starts",
                f"Due {m.due_date.isoformat()} but effective date is {ts.effective_date.isoformat()}.",
                [], field=f"milestones.{i - 1}.due_date",
            )
        elif m.due_date < today:
            yield _f(
                "DATES-PAST", Severity.BLOCKER if ts.escrow.enabled else Severity.WARNING,
                f"Milestone {i} due date is in the past",
                "A past due date makes the milestone immediately overdue"
                + (" and the escrow contract will refuse to deploy." if ts.escrow.enabled else "."),
                [], field=f"milestones.{i - 1}.due_date",
            )
        if prev and m.due_date < prev:
            yield _f(
                "DATES-ORDER", Severity.WARNING,
                f"Milestone {i} is due before milestone {i - 1}",
                "Out-of-order milestones are usually a typo.",
                [], field=f"milestones.{i - 1}.due_date",
            )
        prev = m.due_date


# ----------------------------------------------------------------------------- escrow

# Hardhat's published development accounts 1-3. They exist only on a throwaway local
# chain, so offering them as a fix there is safe and lets the demo run without a wallet.
LOCAL_DEV_WALLETS = {
    "client.wallet": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "provider.wallet": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "escrow.arbiter_wallet": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
}
_ROLE = {"client.wallet": "client", "provider.wallet": "service provider", "escrow.arbiter_wallet": "escrow arbiter"}


@rule
def escrow(ts: TermSheet, today: date) -> Iterator[Finding]:
    if not (_service(ts) and ts.escrow.enabled):
        return
    from app.codegen.escrow import end_of_day_ist
    from app.drafting.engine import funding_deadline

    wallets = {"client.wallet": ts.client.wallet, "provider.wallet": ts.provider.wallet,
               "escrow.arbiter_wallet": ts.escrow.arbiter_wallet}
    for path, w in wallets.items():
        if not w:
            local = ts.escrow.chain == "local"
            yield _f(
                "ESCROW-WALLET", Severity.BLOCKER, f"Missing wallet: {_ROLE[path]}",
                "Each role needs its own wallet before the escrow can be generated."
                + (" On the local test chain, use its built-in test accounts." if local else ""),
                [], field=path,
                autofix={"path": path, "value": LOCAL_DEV_WALLETS[path]} if local else None,
            )
    present = [w.lower() for w in wallets.values() if w]
    if len(present) != len(set(present)):
        yield _f(
            "ESCROW-NEUTRAL", Severity.BLOCKER,
            "Client, provider and arbiter wallets must all be different",
            "An arbiter controlled by either party is not neutral, and the contract refuses to deploy.",
            ["core_2024"], field="escrow.arbiter_wallet",
        )
    if end_of_day_ist(funding_deadline(ts)) < end_of_day_ist(today):
        yield _f(
            "ESCROW-FUNDING-PAST", Severity.BLOCKER,
            "Funding deadline has already passed",
            "Move the effective date forward or extend the funding period.",
            [], field="escrow.funding_days",
        )
    yield _f(
        "ESCROW-TESTNET", Severity.INFO,
        "Escrow runs on a test network with a no-value demo token",
        "This demonstrates programmable payment; moving real money on-chain raises virtual digital asset tax and "
        "regulatory questions, and production use should settle through regulated rails.",
        ["vda_tax", "bsa_s63"],
    )


# ------------------------------------------------------------------------ employment


@rule
def employment(ts: TermSheet, today: date) -> Iterator[Finding]:
    if ts.agreement_type is not AgreementType.EMPLOYMENT or ts.employment is None:
        return
    e = ts.employment
    yield _f(
        "OSH-APPOINTMENT", Severity.INFO,
        "Appointment letter is mandatory under the Labour Codes",
        "Since 21 November 2025 no one may be employed without an appointment letter carrying the prescribed "
        "particulars; this draft includes them in its schedule.",
        ["osh_s6"],
    )
    if e.weekly_hours > 48:
        yield _f(
            "OSH-HOURS", Severity.BLOCKER,
            f"{e.weekly_hours} normal hours a week exceeds the 48-hour limit",
            "Normal hours above 48 a week are not permitted; extra time must be voluntary overtime at twice the "
            "ordinary rate.",
            ["osh_hours"],
            field="employment.weekly_hours", autofix={"path": "employment.weekly_hours", "value": 48},
        )
    if e.deemed_wages > e.wages:
        share = e.wages * 100 / e.gross
        yield _f(
            "WAGES-50", Severity.WARNING,
            f"Basic + DA is only {share:.0f}% of gross pay",
            f"Allowances above half of total remuneration are added back to wages, so statutory wages are "
            f"{format_inr(e.deemed_wages)} a month, not {format_inr(e.wages)}. Provident fund, gratuity and bonus are "
            "computed on the higher figure; budget for it or restructure pay.",
            ["wages_s2y"],
            field="employment.basic",
        )
    if e.employment_type is EmploymentType.FIXED_TERM:
        yield _f(
            "FTE-PARITY", Severity.INFO,
            "Fixed-term employee: parity and gratuity after one year",
            "Fixed-term staff get the same wages and benefits as permanent staff doing similar work, and gratuity "
            "pro rata after one year of continuous service. The draft says so.",
            ["ir_fte", "ss_s53"],
        )
    if e.epf_applicable and not e.uan:
        yield _f(
            "EMP-UAN", Severity.INFO,
            "UAN to be allotted",
            "The schedule records the UAN as pending; update it once allotted so the letter carries all particulars.",
            ["osh_s6"],
            field="employment.uan",
        )
    if e.date_of_joining < ts.effective_date:
        yield _f(
            "EMP-DATES", Severity.WARNING,
            "Date of joining is before the letter's date",
            "Letters for existing staff are allowed, but say so explicitly and pay any arrears from the joining date.",
            [], field="employment.date_of_joining",
        )


def evaluate(ts: TermSheet, today: date | None = None) -> list[Finding]:
    today = today or date.today()
    findings = [f for r in RULES for f in r(ts, today)]
    order = {Severity.BLOCKER: 0, Severity.WARNING: 1, Severity.INFO: 2}
    return sorted(findings, key=lambda f: order[f.severity])


def apply_autofixes(ts: TermSheet, findings: list[Finding]) -> TermSheet:
    data = ts.model_dump(mode="json")
    for f in findings:
        if not f.autofix:
            continue
        target = data
        parts = f.autofix["path"].split(".")
        for p in parts[:-1]:
            target = target[int(p)] if p.isdigit() else target[p]
        target[parts[-1]] = f.autofix["value"]
    return TermSheet.model_validate(data)

