"""Legal knowledge base: the only authorities Clausewright is allowed to cite.

Every citation produced anywhere in the app (rules, reviewer agent, notices) must be one of
these ids. The reviewer agent's output is filtered against this table, so an AI-invented
case cannot reach a draft. Each entry records how it was verified and when, because the
Supreme Court (Pooja Ramesh Singh, 2 Jul 2026) treats unverified AI citations as misconduct.

status:  "verified"  - primary source or two credible secondary sources
         "secondary" - one credible secondary source; confirm before relying in court
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.models import Citation

AS_OF = "2026-11-03"


@dataclass(frozen=True)
class Authority:
    id: str
    authority: str
    provision: str
    summary: str  # plain-language statement of the rule; also the retrieval text
    url: str | None = None
    status: Literal["verified", "secondary"] = "verified"


_E = Authority
_ENTRIES = [
    # ---- Indian Contract Act, 1872
    _E("ica_s10", "Indian Contract Act, 1872", "s.10",
       "Agreements are contracts if made by free consent of competent parties for lawful consideration and object.",
       "https://www.indiacode.nic.in/handle/123456789/2187"),
    _E("ica_s11", "Indian Contract Act, 1872", "s.11",
       "Only persons who have attained majority, are of sound mind and are not disqualified by law may contract.",
       "https://www.indiacode.nic.in/handle/123456789/2187"),
    _E("mohori_bibee_1903", "Mohori Bibee v Dharmodas Ghose", "(1903) Privy Council",
       "A contract with a minor is void from the start and cannot be ratified on attaining majority."),
    _E("ica_s23", "Indian Contract Act, 1872", "s.23",
       "An agreement whose object or consideration is forbidden by law, defeats a law, is fraudulent or opposed to "
       "public policy is void.", "https://www.indiacode.nic.in/handle/123456789/2187"),
    _E("ica_s27", "Indian Contract Act, 1872", "s.27",
       "Every agreement restraining anyone from exercising a lawful profession, trade or business is void, except a "
       "seller of goodwill agreeing not to compete within reasonable local limits.",
       "https://www.indiacode.nic.in/handle/123456789/2187"),
    _E("golikari_1967", "Niranjan Shankar Golikari v Century Spinning", "(1967) Supreme Court",
       "Negative covenants operating during the term of employment are not restraint of trade."),
    _E("percept_2006", "Percept D'Mark v Zaheer Khan", "(2006) Supreme Court",
       "A restraint operating after the contract ends is void under section 27; reasonableness does not save it."),
    _E("varun_tyagi_2025", "Varun Tyagi v Daffodil Software", "2025:DHC:5015, Delhi High Court",
       "A post-employment restriction on joining the employer's clients is void under section 27 regardless of "
       "reasonableness.",
       "https://www.verdictum.in/app-lite/court-updates/high-courts/delhi-high-court/varun-tyagi-v-daffodil-software-pvt-ltd-neutral-citation-2025dhc5015-1582584"),
    _E("parraj_2026", "Parraj Automobiles v Samiran Sinha", "2026:CHC-AS:223-DB, Calcutta High Court",
       "Post-employment non-competes are void, but non-solicitation of staff and protection of trade secrets are "
       "enforceable.",
       "https://www.verdictum.in/court-updates/high-courts/calcutta-high-court/parraj-automobiles-private-limited-v-samiran-sinha-2026chc-as223-db-ex-employee-rival-firm-trade-secret-1607327"),
    _E("ica_s28", "Indian Contract Act, 1872", "s.28",
       "Agreements that restrict enforcing contractual rights through courts, limit the time to do so, or extinguish "
       "rights when a period expires are void; arbitration agreements are excepted.",
       "https://www.barandbench.com/columns/claim-period-limitation-period-section-28-contract-act"),
    _E("limitation_act", "Limitation Act, 1963", "Schedule, Art. 55",
       "A suit for compensation for breach of contract must be filed within three years of the breach."),
    _E("ica_s73", "Indian Contract Act, 1872", "s.73",
       "Damages for breach cover loss arising naturally or in the parties' contemplation; remote and indirect loss "
       "is not recoverable.", "https://www.indiacode.nic.in/handle/123456789/2187"),
    _E("ica_s74", "Indian Contract Act, 1872", "s.74",
       "Where a sum is named for breach, the injured party gets reasonable compensation not exceeding that sum, "
       "whether or not it is called a penalty.", "https://www.indiacode.nic.in/handle/123456789/2187"),
    _E("kailash_nath_2015", "Kailash Nath Associates v DDA", "(2015) 4 SCC 136",
       "Reasonable compensation under section 74 requires loss unless loss is hard to prove; the named sum is a "
       "ceiling, not an entitlement.",
       "https://www.scconline.com/blog/post/2026/07/27/section-74-proof-paradox-liquidated-damages-indian-contracts/"),
    # ---- MSMED Act, 2006 (as amended by Act 16 of 2026)
    _E("msmed_s2b", "MSMED Act, 2006", "s.2(b)",
       "If the buyer does not object in writing within fifteen days of delivery, the day of delivery is the deemed "
       "day of acceptance.",
       "https://www.taxclue.in/blog/section-2-msmed-act-2006-appointed-day-acceptance-and-deemed-acceptance"),
    _E("msmed_s15", "MSMED Act, 2006", "s.15",
       "A buyer must pay a micro or small supplier by the agreed date, which cannot exceed forty-five days from "
       "acceptance or deemed acceptance, notwithstanding any contract term.",
       "https://www.dcmsme.gov.in/publications/LegalFramework.pdf"),
    _E("msmed_s16", "MSMED Act, 2006", "s.16",
       "On delay the buyer owes compound interest with monthly rests at three times the bank rate notified by the "
       "Reserve Bank of India, notwithstanding any agreement.",
       "https://www.scconline.com/blog/post/2022/12/14/when-is-the-interest-rate-payable-under-section-16-of-the-msmed-act-2006-applicable/"),
    _E("msmed_s18", "MSMED Act, 2006", "s.18",
       "Either party may refer a dispute about amounts due to the Micro and Small Enterprises Facilitation Council "
       "for mediation and then arbitration.", "https://www.dcmsme.gov.in/publications/LegalFramework.pdf"),
    _E("msmed_amend_2026", "MSMED (Amendment) Act, 2026", "Act No. 16 of 2026",
       "Most provisions in force from 15 October 2026: payment caps and section 16 interest unchanged; Facilitation "
       "Council jurisdiction where the supplier is registered; fixed timelines for mediation and awards; TReDS "
       "settlement for central public sector enterprises; registration made voluntary.",
       "https://teamleaseregtech.com/updates/article/60351/ministry-of-msme-commencement-of-provisions-of-the-msmed-amendment-act/"),
    _E("mahakali_2022", "Gujarat State Civil Supplies Corp v Mahakali Foods", "2022 SCC OnLine SC 1492",
       "Chapter V of the MSMED Act overrides a private arbitration agreement; the supplier may approach the "
       "Facilitation Council under section 18.",
       "https://www.jsalaw.com/wp-content/uploads/2022/11/JSA-Prism-Dispute-Resolution-November-2022-Mahakali0716.pdf"),
    _E("harcharan_2025", "Harcharan Dass Gupta v Union of India", "2025 INSC 689",
       "The Facilitation Council where the supplier is located has jurisdiction, overriding a contractual seat.",
       "https://www.verdictum.in/court-updates/supreme-court/ms-harcharan-dass-gupta-v-union-of-india-2025-insc-689-arbitration-conciliation-act-msmed-act-overriding-effect-1577534"),
    _E("silpi_2021", "Silpi Industries v Kerala SRTC", "(2021) Supreme Court",
       "A supplier must be registered under the MSMED Act when the contract is made to invoke its benefits for that "
       "contract. A larger bench is reconsidering this (NBCC v State of West Bengal, referred January 2025)."),
    _E("nbcc_2025", "NBCC (India) Ltd v State of West Bengal", "2025 LiveLaw (SC) 46",
       "Referred to a three-judge bench whether a supplier unregistered at contract time can use section 18; "
       "pending.",
       "https://www.livelaw.in/amp/supreme-court/can-unregistered-msmes-avail-dispute-settlement-under-s18-msmed-act-supreme-court-refers-to-larger-bench-280613"),
    _E("udyam", "MSME classification", "S.O. 1364(E), 21 March 2025",
       "From 1 April 2025 micro is up to ₹2.5 crore investment and ₹10 crore turnover, small up to ₹25 crore and "
       "₹100 crore, medium up to ₹125 crore and ₹500 crore.",
       "https://www.taxmann.com/post/blog/revised-msme-classification"),
    # ---- Income-tax Act, 2025 (in force 1 April 2026)
    _E("it_43bh", "Income-tax Act, 2025", "s.37(2)(g) (formerly s.43B(h), 1961 Act)",
       "A business buyer may deduct sums owed to a micro or small enterprise only on actual payment unless paid "
       "within the MSMED time limit; payment before the return due date does not help.",
       "https://eztax.in/income-tax-act-2025/section-37", "secondary"),
    _E("it_tds_professional", "Income-tax Act, 2025", "s.393(1), Table Sl. 6(iii) (formerly s.194J)",
       "Business payers deduct tax at source on fees for professional services at 10% and technical services at 2% "
       "above ₹50,000 a year per payee.",
       "https://blog.tdsman.com/2026/07/tds-on-fees-for-professional-and-technical-services-section-3931-194j/",
       "secondary"),
    _E("vda_tax", "Income-tax Act, 2025", "s.194 Table Sl. 4; s.393(1) Sl. 8(vi)",
       "Gains on virtual digital assets are taxed at 30% and transfers attract 1% tax deducted at source.",
       "https://cryptoslate.com/crypto-laws/india-income-tax-act-vda-tax-tds-regime/", "secondary"),
    # ---- Arbitration
    _E("aca_1996", "Arbitration and Conciliation Act, 1996", "Part I",
       "Governs domestic arbitration: arbitration agreements, appointment, conduct, awards and enforcement.",
       "https://www.indiacode.nic.in/handle/123456789/1978"),
    _E("aca_s20", "Arbitration and Conciliation Act, 1996", "s.20",
       "Parties may agree the seat of arbitration; the seat determines the supervisory courts.",
       "https://www.indiacode.nic.in/handle/123456789/1978"),
    _E("aca_s12_5", "Arbitration and Conciliation Act, 1996", "s.12(5), Seventh Schedule",
       "A person with listed relationships to a party or the dispute is ineligible to act as arbitrator.",
       "https://www.indiacode.nic.in/handle/123456789/1978"),
    _E("perkins_2019", "Perkins Eastman Architects v HSCC", "(2019) Supreme Court",
       "A party with an interest in the outcome cannot unilaterally appoint a sole arbitrator."),
    _E("core_2024", "CORE v ECI SPIC SMO MCML (JV)", "2024 INSC 857 (Constitution Bench, 8 Nov 2024)",
       "Unilateral appointment of a sole arbitrator, or forcing a choice from one party's curated panel, breaches "
       "equal treatment; applies to appointments after the judgment.",
       "https://www.scobserver.in/cases/appointment-of-arbitrators-by-ineligible-persons/"),
    # ---- Copyright
    _E("copyright_s17", "Copyright Act, 1957", "s.17",
       "The author is the first owner; commissioned software, writing or design by a freelancer stays with the "
       "freelancer unless assigned.", "https://copyright.gov.in/Copyright_Act_1957/chapter_iv.html"),
    _E("copyright_s18", "Copyright Act, 1957", "s.18",
       "Copyright may be assigned wholly or partly; an assignment does not extend to media not existing or not in "
       "commercial use at the time unless expressly mentioned.",
       "https://copyright.gov.in/Copyright_Act_1957/chapter_iv.html"),
    _E("copyright_s19", "Copyright Act, 1957", "s.19",
       "Assignment must be in writing and identify the rights, duration, territory and consideration; if duration "
       "is not stated it is five years, if territory is not stated it is India, and unexercised rights lapse after "
       "one year unless otherwise agreed.", "https://copyright.gov.in/Copyright_Act_1957/chapter_iv.html"),
    _E("copyright_s30", "Copyright Act, 1957", "s.30",
       "The copyright owner may grant a licence in writing.",
       "https://copyright.gov.in/Copyright_Act_1957/chapter_iv.html"),
    _E("copyright_s57", "Copyright Act, 1957", "s.57",
       "The author keeps moral rights of attribution and integrity even after assigning copyright."),
    # ---- Data protection
    _E("dpdp_s8", "Digital Personal Data Protection Act, 2023", "s.8",
       "A Data Fiduciary stays responsible for compliance, may engage a Data Processor only under a valid contract, "
       "must keep reasonable security safeguards, notify personal data breaches and ensure erasure.",
       "https://dpdpa.com/dpdpa2023/chapter-2/section8.html"),
    _E("dpdp_rules_2025", "Digital Personal Data Protection Rules, 2025", "Rules 6-8 (notified 13 Nov 2025)",
       "Security safeguards including logs kept at least one year and contractual obligations on processors; breach "
       "report to the Board within 72 hours; substantive rules apply from 13 May 2027.",
       "https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified"),
    # ---- Electronic records and execution
    _E("itact_s10a", "Information Technology Act, 2000", "s.10A",
       "A contract is not unenforceable merely because it was formed by electronic means.",
       "https://www.indiacode.nic.in/handle/123456789/1999"),
    _E("itact_s3a", "Information Technology Act, 2000", "s.3A, Second Schedule",
       "Electronic signatures, including Aadhaar-based eSign, may authenticate electronic records.",
       "https://www.leegality.com/blog/law-around-aadhaar-esign"),
    _E("itact_sch1", "Information Technology Act, 2000", "First Schedule (as amended Oct 2022)",
       "Wills, trusts, and negotiable instruments and powers of attorney outside regulated-entity carve-outs cannot "
       "be executed electronically; the exclusion for sale of immovable property was removed in 2022.",
       "https://www.barandbench.com/law-firms/view-point/will-documentation-finally-go-paperless-an-analysis-into-the-recent-amendments-to-the-information-technology-act-2000"),
    _E("bsa_s63", "Bharatiya Sakshya Adhiniyam, 2023", "s.63(4), Schedule",
       "Electronic records are admitted with a certificate in the Schedule, signed by the person in charge and an "
       "expert, stating the record's hash value (SHA-256 is an accepted algorithm).",
       "https://www.advocatekhoj.com/library/bareacts/bharatiyaaakshya2023/b.php"),
    _E("pune_bar_2026", "Pune Bar Association v Union of India", "2026 LiveLaw (SC) 551 (22 May 2026)",
       "Upheld the section 63(4) certificate and its hash-value requirement.",
       "https://www.livelaw.in/amp/top-stories/supreme-court-rejects-challenge-to-s634-bsa-mandating-hash-value-disclosure-for-electronic-evidence-535950"),
    _E("pooja_ramesh_2026", "Pooja Ramesh Singh v J&K Bank", "2026 INSC 668 (2 Jul 2026)",
       "Citing unverified AI-generated judgments is misconduct by an advocate; Bar Council asked to frame norms.",
       "https://blog.ipleaders.in/ai-hallucinated-case-law-fake-citations-india/"),
    # ---- Stamp duty
    _E("stamp_act", "Indian Stamp Act, 1899 and state stamp laws", "ss.33, 35, 40",
       "An instrument not duly stamped is impounded and inadmissible until duty and a penalty of up to ten times "
       "the deficit are paid; rates are set by each state.",
       "https://vidhijudicial.com/sec-33-to-48-chapter-iv-(instruments-not-duly-stamped)-the-indian-stamp-act,-1899.html"),
    _E("interplay_2023", "In re Interplay between Arbitration Agreements and the Stamp Act", "2023 INSC 1066 (7 judges)",
       "Non-stamping makes an agreement inadmissible, not void; it is curable and does not stop appointment of an "
       "arbitrator.",
       "https://www.scobserver.in/cases/in-re-interplay-between-arbitration-agreements-under-the-arbitration-and-conciliation-act-1996-and-the-indian-stamp-act-1899-validity-of-unstamped-arbitration-agreement/amp/"),
    # ---- Remedies
    _E("sra_1963", "Specific Relief Act, 1963", "ss.36-42",
       "Courts may grant injunctions, including to enforce negative covenants such as confidentiality."),
    # ---- Tax (indirect)
    _E("cgst_registration", "CGST Act, 2017", "ss.22, 31",
       "Only a registered person may issue a tax invoice charging GST; registration is required above the "
       "turnover threshold."),
    # ---- Labour Codes (in force 21 Nov 2025; central rules 8 May 2026)
    _E("osh_s6", "Occupational Safety, Health and Working Conditions Code, 2020", "s.6(1)(f); OSH (Central) Rules 2026, r.6",
       "No employer may employ a person without issuing an appointment letter with the prescribed particulars; a "
       "digital signature is allowed.",
       "https://www.taxclue.in/blog/rule-6-osh-central-rules-2026-letter-of-appointment-to-employee/", "secondary"),
    _E("osh_hours", "Occupational Safety, Health and Working Conditions Code, 2020", "ss.25-27",
       "Work may not exceed 48 hours a week; overtime is paid at twice the ordinary rate.",
       "https://blog.ipleaders.in/labour-codes-2026-implementation-complete-guide-to-what-is-in-force-what-changed-and-what-to-do-now/"),
    _E("wages_s2y", "Code on Wages, 2019", "s.2(y)",
       "If excluded allowances exceed half of total remuneration, the excess is added back to wages, raising the "
       "base for provident fund, gratuity and bonus.",
       "https://blog.ipleaders.in/labour-codes-2026-implementation-complete-guide-to-what-is-in-force-what-changed-and-what-to-do-now/"),
    _E("wages_s17", "Code on Wages, 2019", "s.17(2)",
       "Wages due on resignation, removal, retrenchment or closure must be paid within two working days.",
       "https://trilegal.com/knowledge_repository/trilegal-update-labour-codes-go-live/"),
    _E("ss_s53", "Code on Social Security, 2020", "s.53(1) proviso",
       "A fixed-term employee earns gratuity pro rata after one year of continuous service.",
       "https://trilegal.com/knowledge_repository/trilegal-update-labour-codes-go-live/"),
    _E("ir_fte", "Industrial Relations Code, 2020", "Fixed-term employment",
       "Fixed-term employees get the same hours, wages, allowances and benefits as permanent workers doing the same "
       "work.", "https://trilegal.com/knowledge_repository/trilegal-update-labour-codes-go-live/"),
]

KB: dict[str, Authority] = {a.id: a for a in _ENTRIES}
if len(KB) != len(_ENTRIES):
    raise RuntimeError("duplicate knowledge-base id")


def cite(*ids: str) -> list[Citation]:
    out = []
    for i in ids:
        a = KB[i]  # KeyError is a programming error: every rule must cite a known id
        note = a.summary if a.status == "verified" else f"{a.summary} [secondary source; confirm before relying]"
        out.append(Citation(authority=a.authority, provision=a.provision, url=a.url, note=note))
    return out
