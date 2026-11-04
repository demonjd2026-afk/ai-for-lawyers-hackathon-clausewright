"""Deterministic contract assembly from a validated TermSheet.

The same TermSheet always yields byte-identical text, so its SHA-256 can be committed
on-chain and re-derived by anyone. The LLM never writes binding clause text here; it only
fills the TermSheet (intake) and explains clauses (plain-language mode).
"""

from __future__ import annotations

import hashlib
import json
import unicodedata
from dataclasses import dataclass, field
from datetime import timedelta

from app.drafting.text import clean, days, long_date, months, years
from app.models import (
    AgreementType,
    ArbitratorAppointment,
    EmploymentType,
    EntityType,
    FeeNature,
    IpModel,
    Party,
    TermSheet,
)
from app.money import format_inr, inr_in_words


@dataclass(frozen=True)
class Clause:
    id: str  # stable id used by the clause<->code map and the verifier
    heading: str
    body: str
    cites: tuple[str, ...] = ()  # knowledge-base ids
    binds: tuple[str, ...] = ()  # escrow parameters this clause governs


@dataclass
class Draft:
    title: str
    clauses: list[Clause] = field(default_factory=list)

    def _labels(self) -> list[str]:
        """Operative clauses are numbered; schedules keep their own names and follow execution."""
        labels, n = [], 0
        for c in self.clauses:
            if c.id.startswith("schedule_"):
                labels.append("")
            else:
                n += 1
                labels.append(f"{n}. ")
        return labels

    def _ordered(self) -> list[Clause]:
        body = [c for c in self.clauses if not c.id.startswith("schedule_")]
        return body + [c for c in self.clauses if c.id.startswith("schedule_")]

    def text(self) -> str:
        self.clauses = self._ordered()
        out = [f"# {self.title}", ""]
        for label, c in zip(self._labels(), self.clauses, strict=True):
            out += [f"## {label}{c.heading}", "", c.body, ""]
        return canonical("\n".join(out))

    def numbered(self) -> list[dict]:
        self.clauses = self._ordered()
        return [
            {"number": label.rstrip(". ") or None, "id": c.id, "heading": c.heading, "body": c.body,
             "cites": list(c.cites), "binds": list(c.binds)}
            for label, c in zip(self._labels(), self.clauses, strict=True)
        ]


def canonical(text: str) -> str:
    """NFC, LF line endings, no trailing spaces, single trailing newline."""
    text = unicodedata.normalize("NFC", text).replace("\r\n", "\n")
    lines = [ln.rstrip() for ln in text.split("\n")]
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines) + "\n"


def sha256_hex(data: str) -> str:
    return "0x" + hashlib.sha256(data.encode("utf-8")).hexdigest()


def terms_hash(ts: TermSheet) -> str:
    payload = json.dumps(ts.model_dump(mode="json"), sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return sha256_hex(payload)


# ----------------------------------------------------------------------------- parties


def _party_line(p: Party, role: str) -> str:
    kind = {
        EntityType.INDIVIDUAL: "an individual",
        EntityType.PROPRIETORSHIP: "a sole proprietorship",
        EntityType.PARTNERSHIP: "a partnership firm",
        EntityType.LLP: "a limited liability partnership",
        EntityType.COMPANY: "a company",
    }[p.entity_type]
    line = f"**{clean(p.name)}**, {kind} having its address at {clean(p.address)}, {p.state.value}"
    if p.entity_type is EntityType.INDIVIDUAL:
        line = f"**{clean(p.name)}**, an individual residing at {clean(p.address)}, {p.state.value}"
    if p.gstin:
        line += f", GSTIN {p.gstin}"
    if p.udyam_number:
        line += f", Udyam Registration No. {p.udyam_number}"
    return f"{line} (the **\"{role}\"**)"


def _signature_block(ts: TermSheet, a: str, b: str) -> Clause:
    def block(p: Party, role: str) -> str:
        sig = clean(p.signatory_name) if p.signatory_name else clean(p.name)
        des = clean(p.signatory_designation) if p.signatory_designation else {
            EntityType.INDIVIDUAL: "Self",
            EntityType.PROPRIETORSHIP: "Proprietor",
            EntityType.PARTNERSHIP: "Partner",
            EntityType.LLP: "Designated Partner",
            EntityType.COMPANY: "Authorised Signatory",
        }[p.entity_type]
        return f"For the {role}: {clean(p.name)}\nName: {sig}\nDesignation: {des}\nSignature: ____________  Date: ____________"

    noun = "This letter" if ts.agreement_type is AgreementType.EMPLOYMENT else "This Agreement"
    mode = (
        f"{noun} may be executed by electronic signature under the Information Technology Act, 2000."
        if ts.e_sign
        else f"{noun} shall be executed in ink."
    )
    return Clause("sign", "Execution", f"{mode}\n\n{block(ts.client, a)}\n\n{block(ts.provider, b)}", ("itact_s10a", "itact_s3a"))


# ------------------------------------------------------------------------ shared clauses


def _confidentiality(ts: TermSheet) -> Clause:
    return Clause(
        "confidentiality",
        "Confidentiality",
        "Each party shall keep confidential all non-public business, technical and financial information "
        "received from the other party in connection with this Agreement, use it only to perform this Agreement, "
        "and disclose it only to its personnel and advisers who need to know it and are bound by equivalent "
        "obligations. These obligations do not apply to information that is or becomes public without breach, "
        "was lawfully known to the recipient before disclosure, is independently developed, or is received from "
        "a third party without restriction. A party may disclose information when required by law, court or "
        "regulator, after giving the other party prompt notice where lawful. These obligations survive for "
        f"{years(ts.confidentiality_years)} after this Agreement ends, and indefinitely for trade secrets.",
        ("ica_s27",),
    )


def _data_protection(fiduciary: str = "Client", processor: str = "Service Provider") -> Clause:
    return Clause(
        "data_protection",
        "Personal Data",
        f"Where the {processor} processes digital personal data on behalf of the {fiduciary}, the {fiduciary} acts "
        f"as Data Fiduciary and the {processor} as Data Processor under the Digital Personal Data Protection Act, "
        f"2023 and the rules made under it. The {processor} shall: (a) process such data only on the {fiduciary}'s "
        "documented instructions and only for the purpose of this Agreement; (b) maintain reasonable security "
        "safeguards, including encryption or masking where appropriate, access controls, and logs of access kept for "
        f"at least one (1) year; (c) notify the {fiduciary} of any personal data breach within twenty-four (24) "
        f"hours of becoming aware of it, with the details the {fiduciary} needs to report to the Data Protection "
        f"Board within its statutory time; (d) not engage a sub-processor without the {fiduciary}'s prior written "
        f"consent and on terms no less protective; (e) assist the {fiduciary} in responding to Data Principal "
        "requests and in any audit; and (f) on completion, termination or instruction, erase or return the data "
        "unless retention is required by law, and confirm erasure in writing.",
        ("dpdp_s8", "dpdp_rules_2025"),
    )


def _restrictive(ts: TermSheet) -> list[Clause]:
    out = []
    if ts.non_solicit_months_after_term and ts.agreement_type is AgreementType.EMPLOYMENT:
        out.append(
            Clause(
                "non_solicit",
                "Non-Solicitation of Staff",
                f"For {months(ts.non_solicit_months_after_term)} after leaving, the Employee shall not induce any "
                "employee of the Employer with whom the Employee worked to leave the Employer. This does not restrict "
                "the Employee from taking up any employment, profession, trade or business.",
                ("ica_s27", "parraj_2026"),
            )
        )
        return out
    if ts.non_solicit_months_after_term:
        out.append(
            Clause(
                "non_solicit",
                "Non-Solicitation of Personnel",
                "During the term and for "
                f"{months(ts.non_solicit_months_after_term)} after it ends, neither party shall directly solicit "
                "for employment any employee of the other party with whom it worked under this Agreement. General "
                "advertisements not targeted at such employees are not solicitation. The parties acknowledge that "
                "this clause protects confidential information and working relationships and does not restrain any "
                "person from exercising a lawful profession, trade or business.",
                ("ica_s27",),
            )
        )
    return out


def _disputes(ts: TermSheet) -> Clause:
    arb = ts.arbitration
    body = (
        "The parties shall first try in good faith to resolve any dispute arising out of or in connection with "
        f"this Agreement through discussions between senior representatives for {days(15)} from a written notice "
        "of dispute. "
    )
    cites = ["aca_1996"]
    if arb.enabled:
        if arb.appointment is ArbitratorAppointment.INSTITUTION and arb.institution:
            appoint = f"a sole arbitrator appointed by {clean(arb.institution)} under its rules"
        else:
            appoint = (
                "a sole arbitrator appointed by mutual written consent of the parties or, failing agreement within "
                f"{days(30)}, by the court under section 11 of the Arbitration and Conciliation Act, 1996"
            )
        body += (
            "Any dispute not so resolved shall be referred to final and binding arbitration under the Arbitration "
            f"and Conciliation Act, 1996 before {appoint}. The seat and venue of arbitration shall be "
            f"{clean(arb.seat_city or ts.jurisdiction_city)}, and the language shall be {clean(arb.language)}. "
            "Neither party shall unilaterally appoint the arbitrator."
        )
        cites += ["core_2024"]
    else:
        body += f"Any dispute not so resolved shall be subject to the courts at {clean(ts.jurisdiction_city)}."
    if ts.agreement_type is AgreementType.SERVICE and ts.provider.is_mse:
        body += (
            " Nothing in this clause restricts the Service Provider's right, as a micro or small enterprise, to "
            "refer a dispute regarding amounts due to the Micro and Small Enterprises Facilitation Council having "
            "jurisdiction where the Service Provider is located, under section 18 of the Micro, Small and Medium "
            "Enterprises Development Act, 2006, and that right prevails over the seat stated above."
        )
        cites += ["msmed_s18", "mahakali_2022", "harcharan_2025", "msmed_amend_2026"]
    return Clause("disputes", "Dispute Resolution", body, tuple(cites))


def _law(ts: TermSheet) -> Clause:
    return Clause(
        "law",
        "Governing Law and Jurisdiction",
        "This Agreement is governed by the laws of India. Subject to the dispute resolution clause, the courts at "
        f"{clean(ts.jurisdiction_city)} shall have exclusive jurisdiction.",
    )


def _stamp(ts: TermSheet) -> Clause:
    return Clause(
        "stamp",
        "Stamp Duty",
        "The Client shall pay the stamp duty payable on this Agreement under the stamp law applicable in "
        f"{ts.governing_state.value}, including through e-stamping, before or at the time of execution.",
        ("stamp_act", "interplay_2023"),
    )


def _general(ts: TermSheet) -> Clause:
    claims = ""
    if ts.claims_window_days is not None:
        claims = (
            " A party shall notify the other in writing of any claim within "
            f"{days(ts.claims_window_days)} of becoming aware of it; this notice requirement does not limit the "
            "period within which a party may enforce its rights in law."
        )
    return Clause(
        "general",
        "General",
        "This Agreement, with its Schedules, is the entire agreement between the parties on its subject and "
        "supersedes earlier understandings. It may be amended only in writing signed by both parties. Neither "
        "party may assign it without the other's written consent, except to a successor of its whole business. "
        "If any provision is held invalid, the rest continues in force and the invalid provision is replaced by "
        "a valid one closest to its intent. Notices shall be in writing to the email addresses in this Agreement. "
        "Neither party is liable for delay caused by events beyond its reasonable control, provided it notifies "
        "the other promptly and resumes performance as soon as practicable." + claims,
        ("ica_s28",) if ts.claims_window_days is not None else (),
    )


# --------------------------------------------------------------------- service agreement


def _service(ts: TermSheet) -> Draft:
    d = Draft("Service Agreement")
    c, p = ts.client, ts.provider
    d.clauses.append(
        Clause(
            "parties",
            "Parties",
            f"This Service Agreement is made on {long_date(ts.effective_date)} (the \"Effective Date\") between "
            f"{_party_line(c, 'Client')} and {_party_line(p, 'Service Provider')}.",
            ("ica_s10", "ica_s11"),
        )
    )
    d.clauses.append(
        Clause(
            "scope",
            "Services",
            "The Service Provider shall provide the following services (the \"Services\") with reasonable skill, care "
            f"and diligence:\n\n{clean(ts.scope or '', multiline=True)}\n\nThe Services are divided into the milestones "
            "in Schedule A. The Service Provider acts as an independent contractor and nothing in this Agreement "
            "creates employment, partnership or agency.",
        )
    )
    d.clauses.append(
        Clause(
            "acceptance",
            "Delivery and Acceptance",
            "The Service Provider shall notify the Client in writing when a milestone is delivered. The Client may, "
            f"within {days(ts.acceptance_days)} of delivery, either accept the milestone or object in writing "
            "stating the specific respects in which the deliverable does not conform to Schedule A. If the Client "
            f"does not object within {days(ts.acceptance_days)}, the milestone is deemed accepted on the day of "
            "delivery.",
            ("msmed_s2b",) if p.is_mse else (),
            ("acceptanceWindow",),
        )
    )
    total = ts.total_paise
    pay = (
        f"The Client shall pay the Service Provider a total fee of {format_inr(total)} ({inr_in_words(total)}), "
        "payable milestone-wise as set out in Schedule A. "
        f"Each milestone fee is payable within {days(ts.payment_days)} of its acceptance or deemed acceptance. "
    )
    pay += (
        "Fees are exclusive of GST, which the Client shall pay in addition at the applicable rate against a valid tax invoice. "
        if ts.prices_exclusive_of_gst
        else "Fees are inclusive of all applicable taxes. "
    )
    nature = "professional" if ts.fee_nature is FeeNature.PROFESSIONAL else "technical"
    pay += (
        f"The parties treat the Services as {nature} services for the purpose of tax deduction at source. The Client "
        "may deduct tax at source as required by the Income-tax Act, 2025, shall deposit it within the statutory "
        "time, and shall issue the corresponding certificate."
    )
    pay_cites = ["it_tds_professional"]
    if p.is_mse:
        pay += (
            " The Service Provider is a micro or small enterprise. Under section 15 of the Micro, Small and Medium "
            "Enterprises Development Act, 2006, payment shall in no case be made later than "
            f"{days(45)} from the day of acceptance or deemed acceptance, and any delay attracts compound interest "
            "with monthly rests at three times the bank rate notified by the Reserve Bank of India under section 16."
        )
        pay_cites += ["msmed_s15", "msmed_s16", "it_43bh"]
    d.clauses.append(Clause("fees", "Fees and Payment", pay, tuple(pay_cites), ("milestones", "totalAmount")))

    if ts.escrow.enabled:
        d.clauses.append(
            Clause(
                "escrow",
                "Escrow of Fees",
                "To secure payment, the Client shall deposit the total fee into the escrow smart contract described in "
                f"Schedule B within {days(ts.escrow.funding_days)} of the Effective Date. The escrow releases each "
                "milestone fee to the Service Provider on acceptance or deemed acceptance under the Delivery and "
                "Acceptance clause, returns it to the Client if the Service Provider waives it or fails to deliver by "
                "its due date plus the acceptance period, and holds it if the Client objects in time, until the "
                "parties settle or the Escrow Arbiter gives effect to the outcome under the Dispute Resolution clause. "
                "The escrow is a payment mechanism only. If its operation differs from this Agreement, this Agreement "
                "prevails and the parties shall make the payments needed to give effect to it. The escrow contract "
                "records the SHA-256 hash of this Agreement's text, and both parties confirm the hash on-chain before "
                "funding.",
                ("bsa_s63", "itact_s10a"),
                ("documentHash", "termsHash", "fundingDeadline", "arbiter", "payer", "payee", "token"),
            )
        )

    if ts.ip_model is IpModel.ASSIGNMENT:
        territory = "throughout the world" if ts.ip_assignment_worldwide else "in India"
        duration = "for the full term of copyright and any renewals" if ts.ip_assignment_full_term else f"for {years(5)}"
        ip = (
            "On payment of the fee for each milestone, the Service Provider assigns to the Client all rights, title "
            "and interest, including all copyright and the rights to reproduce, adapt, publish, communicate to the "
            "public, translate and commercially exploit, in the deliverables of that milestone, "
            f"{territory}, {duration}, in all media now known or later developed. The consideration for this "
            "assignment is included in the fee. The parties agree that this assignment shall not lapse under "
            "section 19(4) of the Copyright Act, 1957 if the Client does not exercise the rights within one year. "
            "The Service Provider retains its pre-existing tools and know-how and grants the Client a perpetual, "
            "royalty-free licence to use any of them embedded in the deliverables. Until payment for a milestone, "
            "its deliverables remain the property of the Service Provider. The author's moral rights under section 57 "
            "of the Copyright Act, 1957 are not affected, and the Service Provider agrees not to assert them to "
            "prevent reasonable modification of the deliverables by the Client."
        )
        ip_cites = ("copyright_s17", "copyright_s18", "copyright_s19", "copyright_s57")
    else:
        ip = (
            "The Service Provider retains all intellectual property in the deliverables and, on payment, grants the "
            "Client a non-exclusive, perpetual, royalty-free licence throughout the world to use, copy and modify "
            "them for its internal business purposes. Any assignment or licence of copyright must be in writing "
            "under section 19 or section 30 of the Copyright Act, 1957."
        )
        ip_cites = ("copyright_s19", "copyright_s30")
    d.clauses.append(Clause("ip", "Intellectual Property", ip, ip_cites))

    d.clauses.append(_confidentiality(ts))
    if ts.processes_personal_data:
        d.clauses.append(_data_protection())
    d.clauses += _restrictive(ts)

    liab = (
        "Neither party is liable for indirect or consequential loss. "
        if ts.liability_cap_multiple is None
        else (
            "Each party's total liability under this Agreement is limited to "
            f"{_multiple(ts.liability_cap_multiple)} the total fee, except for unpaid fees, breach of confidentiality, "
            "infringement of intellectual property, fraud and liability that cannot be limited by law. Neither "
            "party is liable for indirect or consequential loss. "
        )
    )
    liab_cites = ["ica_s73"]
    if ts.liquidated_damages_pct_per_week:
        liab += (
            "If a milestone is delivered late for reasons attributable to the Service Provider, the Service "
            f"Provider shall pay {ts.liquidated_damages_pct_per_week:g}% of that milestone's fee for each full week "
            "of delay, up to 10% of that fee, as a genuine pre-estimate of the Client's loss. The parties "
            "acknowledge that under section 74 of the Indian Contract Act, 1872 only reasonable compensation not "
            "exceeding this amount is recoverable."
        )
        liab_cites.append("ica_s74")
    d.clauses.append(Clause("liability", "Liability", liab.strip(), tuple(liab_cites)))

    d.clauses.append(
        Clause(
            "termination",
            "Term and Termination",
            "This Agreement starts on the Effective Date and continues until all milestones are accepted and paid. "
            f"Either party may terminate it for convenience on {days(ts.termination_notice_days)} written notice, "
            f"or for material breach not cured within {days(15)} of written notice. On termination the Client shall "
            "pay for milestones accepted and, pro rata, for work performed on the current milestone up to the "
            "termination date, and each party shall return the other's confidential information.",
        )
    )
    d.clauses += [_disputes(ts), _law(ts), _stamp(ts), _general(ts)]
    d.clauses.append(_schedule_a(ts))
    if ts.escrow.enabled:
        d.clauses.append(_schedule_b(ts))
    d.clauses.append(_signature_block(ts, "Client", "Service Provider"))
    return d


def _multiple(m: float) -> str:
    if m == 1:
        return "the amount of"
    return f"{m:g} times"


def _schedule_a(ts: TermSheet) -> Clause:
    rows = ["| # | Milestone | Deliverable | Due date | Fee | Fee in words |", "|---|---|---|---|---|---|"]
    for i, m in enumerate(ts.milestones, 1):
        rows.append(
            f"| {i} | {clean(m.title)} | {clean(m.deliverable)} | {long_date(m.due_date)} | "
            f"{format_inr(m.amount_paise)} | {inr_in_words(m.amount_paise)} |"
        )
    rows.append(f"| | **Total** | | | {format_inr(ts.total_paise)} | {inr_in_words(ts.total_paise)} |")
    return Clause("schedule_a", "Schedule A: Milestones", "\n".join(rows), (), ("milestones", "totalAmount"))


def _schedule_b(ts: TermSheet) -> Clause:
    from app.codegen.escrow import derive_params

    p = derive_params(ts)
    lines = [
        "| Parameter | Value |",
        "|---|---|",
        f"| Network | {p.chain} (test network; no real value) |",
        f"| Settlement token | {p.token} |",
        f"| Payer (Client) wallet | {p.payer} |",
        f"| Payee (Service Provider) wallet | {p.payee} |",
        f"| Escrow Arbiter wallet | {p.arbiter} |",
        f"| Acceptance window | {p.acceptance_window_s} seconds ({days(ts.acceptance_days)}) |",
        f"| Funding deadline (Unix time) | {p.funding_deadline} |",
        f"| MSME mode | {'yes' if p.msme_mode else 'no'} |",
        f"| Term sheet hash (SHA-256) | {p.terms_hash} |",
    ]
    for i, m in enumerate(p.milestones, 1):
        lines.append(f"| Milestone {i} amount (paise) / due (Unix time) | {m.amount} / {m.due_date} |")
    lines.append(f"| Total (paise) | {p.total} |")
    lines.append("")
    lines.append(
        "The Escrow Arbiter wallet shall be controlled by the arbitrator or institution appointed under the "
        "Dispute Resolution clause, and shall be used only to give effect to a settlement or arbitral award."
    )
    return Clause("schedule_b", "Schedule B: Escrow Parameters", "\n".join(lines), ("bsa_s63",), ("*",))


# ----------------------------------------------------------------------------------- NDA


def _nda(ts: TermSheet) -> Draft:
    d = Draft("Mutual Non-Disclosure Agreement" if ts.nda_mutual else "Non-Disclosure Agreement")
    a, b = ("Party A", "Party B") if ts.nda_mutual else ("Disclosing Party", "Receiving Party")
    d.clauses.append(
        Clause(
            "parties",
            "Parties",
            f"This Agreement is made on {long_date(ts.effective_date)} between {_party_line(ts.client, a)} and "
            f"{_party_line(ts.provider, b)}.",
            ("ica_s10", "ica_s11"),
        )
    )
    d.clauses.append(
        Clause(
            "purpose",
            "Purpose",
            "The parties wish to exchange confidential information solely for the following purpose (the "
            f"\"Purpose\"):\n\n{clean(ts.nda_purpose or '', multiline=True)}",
        )
    )
    flow = "each party" if ts.nda_mutual else f"the {b}"
    d.clauses.append(
        Clause(
            "definition",
            "Confidential Information",
            "\"Confidential Information\" means all non-public information disclosed in any form in connection with "
            "the Purpose, whether or not marked confidential, that a reasonable person would understand to be "
            "confidential, including business plans, customer data, pricing, source code, designs and know-how. It "
            "excludes information that is or becomes public without breach, was lawfully known before disclosure, "
            "is independently developed without use of the Confidential Information, or is lawfully received from a "
            "third party without restriction.",
        )
    )
    d.clauses.append(
        Clause(
            "obligations",
            "Obligations",
            f"{flow.capitalize()} shall use the Confidential Information only for the Purpose; protect it with at "
            "least the care it uses for its own confidential information and no less than reasonable care; disclose "
            "it only to its personnel and advisers who need to know it for the Purpose and are bound by equivalent "
            "obligations; and promptly notify the other party of any unauthorised use or disclosure. Disclosure "
            "required by law, court or regulator is permitted after prompt notice where lawful, limited to what is "
            "required.",
        )
    )
    d.clauses.append(
        Clause(
            "term",
            "Term and Return",
            f"The obligations last for {years(ts.confidentiality_years)} from the Effective Date, and indefinitely "
            "for trade secrets and personal data. On request or at the end of the Purpose, the recipient shall return "
            "or destroy the Confidential Information and confirm this in writing, except copies retained under law "
            "or automatic backups, which remain confidential.",
        )
    )
    d.clauses.append(
        Clause(
            "no_licence",
            "No Licence or Obligation",
            "No licence to any intellectual property is granted, and neither party is obliged to enter into any "
            "further transaction. Information is provided \"as is\".",
        )
    )
    d.clauses.append(
        Clause(
            "remedies",
            "Remedies",
            "Unauthorised disclosure may cause harm for which damages are not an adequate remedy, and the disclosing "
            "party may seek an injunction under the Specific Relief Act, 1963 in addition to any other remedy.",
            ("sra_1963",),
        )
    )
    if ts.processes_personal_data:
        d.clauses.append(_data_protection())
    d.clauses += _restrictive(ts)
    d.clauses += [_disputes(ts), _law(ts), _stamp(ts), _general(ts)]
    d.clauses.append(_signature_block(ts, a, b))
    return d


# ------------------------------------------------------------------- appointment letter


def _pay_rows(e) -> list[tuple[str, int]]:
    rows = [("Basic pay", e.basic), ("Dearness allowance", e.dearness_allowance),
            ("Retaining allowance", e.retaining_allowance), ("House rent allowance", e.hra),
            ("Conveyance allowance", e.conveyance), ("Other allowances", e.other_allowances)]
    return [(k, v) for k, v in rows if v]


def _employment(ts: TermSheet) -> Draft:
    e = ts.employment
    er, ee = ts.client, ts.provider
    fixed = e.employment_type is EmploymentType.FIXED_TERM
    d = Draft("Letter of Appointment")
    d.clauses.append(
        Clause(
            "parties",
            "Appointment",
            f"{_party_line(er, 'Employer')} appoints {_party_line(ee, 'Employee')} on the terms of this letter, "
            f"issued on {long_date(ts.effective_date)} under section 6(1)(f) of the Occupational Safety, Health and "
            "Working Conditions Code, 2020.",
            ("osh_s6", "ica_s11"),
        )
    )
    d.clauses.append(
        Clause(
            "role",
            "Designation and Duties",
            f"The Employee is appointed as {clean(e.designation)} in the {e.skill_category.value.replace('_', '-')} "
            f"category, to work at {clean(e.place_of_work)}, with effect from {long_date(e.date_of_joining)}. The "
            f"Employee's duties are:\n\n{clean(e.duties, multiline=True)}",
        )
    )
    if fixed:
        tenure = (
            f"This is a fixed-term employment from {long_date(e.date_of_joining)} to {long_date(e.fixed_term_end)}, "
            "ending automatically on that date without notice or retrenchment compensation. The Employee shall have "
            "the same hours of work, wages, allowances and other benefits as a permanent employee doing the same or "
            "similar work, and shall receive gratuity in proportion to service if the Employee completes one (1) year "
            "of continuous service."
        )
        tcites = ("ir_fte", "ss_s53")
    else:
        tenure = "This is a permanent employment."
        tcites = ()
    if e.probation_months:
        tenure += (
            f" The first {months(e.probation_months)} are a probation period, during which either party may end the "
            f"employment on {days(7)} written notice."
        )
    d.clauses.append(Clause("tenure", "Nature of Employment", tenure, tcites))
    d.clauses.append(
        Clause(
            "hours",
            "Working Hours",
            f"Normal working hours are {e.weekly_hours} hours a week, within the daily limits and rest intervals "
            "under the Occupational Safety, Health and Working Conditions Code, 2020. Overtime is voluntary and is "
            "paid at twice the ordinary rate of wages.",
            ("osh_hours",),
        )
    )
    rows = ["| Component | Monthly | Monthly in words |", "|---|---|---|"]
    for k, v in _pay_rows(e):
        rows.append(f"| {k} | {format_inr(v)} | {inr_in_words(v)} |")
    rows.append(f"| **Gross monthly remuneration** | {format_inr(e.gross)} | {inr_in_words(e.gross)} |")
    rows.append(f"| **Annual gross remuneration** | {format_inr(e.gross * 12)} | {inr_in_words(e.gross * 12)} |")
    wage_note = (
        f"For the Code on Wages, 2019, wages are {format_inr(e.deemed_wages)} a month"
        + (", including allowances above half of total remuneration that the Code treats as wages."
           if e.deemed_wages > e.wages else ".")
    )
    d.clauses.append(
        Clause(
            "pay",
            "Remuneration",
            "The Employer shall pay the Employee monthly, by bank transfer, no later than the seventh (7th) day of "
            "the following month:\n\n" + "\n".join(rows) + f"\n\n{wage_note} Tax is deducted at source as "
            "required by law.",
            ("wages_s2y",),
        )
    )
    ben = []
    ben.append(
        "The Employee is covered by the Employees' Provident Fund on the statutory wage base."
        if e.epf_applicable else "The Employees' Provident Fund does not currently apply to this establishment."
    )
    ben.append(
        "The Employee is covered by the Employees' State Insurance scheme."
        if e.esic_applicable else "The Employees' State Insurance scheme does not apply to the Employee's wages."
    )
    ben.append("Gratuity is payable under the Code on Social Security, 2020"
               + (", pro rata after one (1) year of continuous service." if fixed else "."))
    ben.append("Leave, holidays and maternity benefit are as provided by law and the Employer's leave policy.")
    d.clauses.append(Clause("benefits", "Statutory Benefits", " ".join(ben), ("ss_s53",)))
    d.clauses.append(
        Clause(
            "confidentiality",
            "Confidentiality and Work Product",
            "The Employee shall keep the Employer's confidential information and trade secrets confidential during "
            "and after employment and use them only for the Employer's business. Copyright in work made by the "
            "Employee in the course of employment belongs to the Employer under section 17 of the Copyright Act, "
            "1957, and the Employee shall sign any document reasonably needed to record it.",
            ("copyright_s17", "sra_1963"),
        )
    )
    d.clauses += _restrictive(ts)
    d.clauses.append(Clause(
        "employee_data",
        "Employee Personal Data",
        "The Employer processes the Employee's personal data for employment, payroll, statutory compliance and "
        "security, under the Digital Personal Data Protection Act, 2023, and keeps it only as long as needed for "
        "those purposes or as required by law. Aadhaar details are collected only with the Employee's consent.",
        ("dpdp_s8",),
    ))
    d.clauses.append(
        Clause(
            "termination",
            "Resignation, Termination and Final Settlement",
            f"After probation, the Employee may resign on {days(e.resignation_notice_days)} written notice, or pay "
            "in lieu. The Employer may end the employment only in accordance with law, including notice or pay in "
            "lieu and retrenchment compensation under the Industrial Relations Code, 2020 where applicable. All "
            "wages due on resignation, removal, retrenchment or closure shall be paid within two (2) working days, "
            "and gratuity within the time required by law.",
            ("wages_s17",),
        )
    )
    d.clauses.append(
        Clause(
            "disputes",
            "Disputes and Governing Law",
            "This letter is governed by the laws of India. Disputes are subject to the grievance redress and dispute "
            "resolution machinery under the labour codes where it applies, and otherwise to the courts at "
            f"{clean(ts.jurisdiction_city)}.",
        )
    )
    part = [
        "| Particular | Detail |",
        "|---|---|",
        f"| Employee name | {clean(ee.name)} |",
        f"| Father's or mother's name | {clean(e.employee_parent_name)} |",
        f"| Date of birth | {long_date(e.employee_date_of_birth)} |",
        f"| Designation | {clean(e.designation)} |",
        f"| Category of skill | {e.skill_category.value.replace('_', '-')} |",
        f"| Type of employment | {'Fixed-term' if fixed else 'Permanent'} |",
        f"| Date of joining | {long_date(e.date_of_joining)} |",
        f"| Wages (Code on Wages) | {format_inr(e.deemed_wages)} per month |",
        f"| Gross remuneration | {format_inr(e.gross)} per month |",
        f"| EPF / ESIC applicable | {'Yes' if e.epf_applicable else 'No'} / {'Yes' if e.esic_applicable else 'No'} |",
        f"| UAN | {e.uan or 'To be allotted'} |",
        f"| ESIC number | {e.esic_number or ('To be allotted' if e.esic_applicable else 'Not applicable')} |",
        f"| Employer LIN | {clean(e.employer_lin) if e.employer_lin else 'To be added'} |",
    ]
    d.clauses.append(Clause("schedule_particulars", "Schedule: Particulars of Employment", "\n".join(part), ("osh_s6",)))
    d.clauses.append(_signature_block(ts, "Employer", "Employee"))
    return d


def assemble(ts: TermSheet) -> Draft:
    return {
        AgreementType.SERVICE: _service,
        AgreementType.NDA: _nda,
        AgreementType.EMPLOYMENT: _employment,
    }[ts.agreement_type](ts)


def funding_deadline(ts: TermSheet):
    return ts.effective_date + timedelta(days=ts.escrow.funding_days)
