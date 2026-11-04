# Clausewright: Indian Legal Research Brief (verified as of 3 Nov 2026)

**Purpose:** Legal grounding for Clausewright, an AI contract-drafting tool for Indian MSMEs, freelancers and small firms. It covers NDAs, service/freelance agreements, employment letters and leases, plus a blockchain milestone escrow and on-chain document-hash anchoring.

**How to read this:**
- **VERIFIED** means confirmed against a primary source (indiacode, copyright.gov.in, PRS Act PDF, RBI/SC record) or two or more credible secondary sources (law firms, SCC Online, LiveLaw).
- **SECONDARY** means confirmed by a single credible secondary source only.
- **UNVERIFIED** means not confirmed during this research. Check it before relying on it.
- Quotes are kept under 15 words. Everything else is paraphrased.
- This brief is not legal advice. Have counsel review it before any product claim is made publicly.

---

## 0. Key current values (cheat-sheet)

| Item | Current value | Status |
|---|---|---|
| RBI Policy Repo Rate | **5.50%** (raised from 5.25% on **7 Oct 2026**) | VERIFIED (RBI LAF notification via TeamLease; TaxClue; CorpLawUpdates) |
| RBI **Bank Rate** (drives MSMED s.16 interest) | **5.75%** from 7 Oct 2026 (was 5.50%) | SECONDARY (TaxClue summary of RBI PR 2026-2027/1264; CorpLawUpdates). Bank Rate = MSF = 5.75%, consistent with RBI's corridor convention |
| SDF / MSF | 5.25% / 5.75% | VERIFIED (RBI Money Market Operations, 18 Oct 2026) |
| MSMED s.16 interest (3 × Bank Rate) | **17.25% p.a., compounded monthly** (3 × 5.75%) | Derived. Recompute on every RBI change |
| MSMED payment cap | 15 days with no written agreement; **max 45 days** with one | VERIFIED. Unchanged by the 2026 amendment |
| MSMED (Amendment) Act 2026 | **Act No. 16 of 2026**, assent **13 Aug 2026**. Most provisions in force **15 Oct 2026** (S.O. 5575(E), 12 Oct 2026). Section 12 (Facilitation Council composition) from **15 Dec 2026** | VERIFIED (TeamLease RegTech; Corpseed; Vinod Kothari) |
| MSME thresholds (from 1 Apr 2025) | Micro: inv ≤ ₹2.5 cr and turnover ≤ ₹10 cr. Small: ≤ ₹25 cr / ≤ ₹100 cr. Medium: ≤ ₹125 cr / ≤ ₹500 cr | VERIFIED (S.O. 1364(E), 21 Mar 2025) |
| Income-tax Act 2025 | In force **1 Apr 2026** (tax year 2026-27 onward) | VERIFIED |
| Old s.43B(h) maps to | **s.37(2)(g)** IT Act 2025. **Excluded** from the s.37(3) "paid before return due date" relief | SECONDARY (ebizfiling; eztax.in Act text) |
| Old s.194J maps to | **s.393(1)**, Table Sl. No. 6(iii).D: technical 2%, professional 10%, threshold ₹50,000 | SECONDARY (TDSMAN) |
| Old s.194S (1% VDA TDS) maps to | s.393(1), Table Sl. No. 8(vi) | SECONDARY (CryptoSlate; Toolisky) |
| Old s.115BBH (30% VDA tax) maps to | s.194, Table Sl. No. 4 | SECONDARY (Toolisky). Verify against the Act |
| Labour Codes | All four in force **21 Nov 2025**. Central Rules notified **8 May 2026** (e.g. OSH (Central) Rules 2026, G.S.R. 345(E)) | VERIFIED |
| DPDP Rules 2025 | Notified **13 Nov 2025**. Consent Manager rule from **13 Nov 2026**. Substantive obligations from **13 May 2027**. A proposal to shorten to Nov 2026 was **not notified** as of the latest sources (Aug 2026) | VERIFIED. Re-check the Gazette |
| BSA 2023 | In force **1 Jul 2024**. s.63(4) certificate (Schedule) requires a **hash value** (SHA1 / SHA256 / MD5 / Other). Upheld by SC in *Pune Bar Assn v UoI*, **22 May 2026** | VERIFIED |
| Court pendency (NJDG, 31 Dec 2025) | SC 92,101; HCs 63.66 lakh; District 4.77 crore (about 5.4 crore total). SC on 1 Oct 2026: 95,019 | VERIFIED (Lok Sabha reply, 13 Feb 2026; SC Observer) |
| MSME Samadhaan (14 Aug 2026) | 2,56,892 applications; ₹55,244 cr involved; **₹20,979 cr still pending**; about 40,580 unresolved for more than a year | SECONDARY (Crisil Intelligence, 17 Aug 2026) |

---

## 1. MSMED Act 2006: delayed payments, interest, classification, Udyam

### 1.1 Provisions

- **s.2(b) "appointed day":** the day after 15 days from acceptance or deemed acceptance of goods or services.
- **Deemed acceptance:** if the buyer raises no **written** objection within 15 days of delivery or rendering, the delivery date is the acceptance date. If the buyer objects, acceptance falls on the date the defect is removed.
- **s.15:** the buyer must pay by the date agreed in writing, or before the appointed day if nothing is agreed. The proviso caps any agreed period at **45 days** from acceptance or deemed acceptance.
- **s.16:** on default, the buyer owes **compound interest with monthly rests at three times the RBI-notified Bank Rate**, notwithstanding any agreement.
- **s.17:** the buyer is liable for the principal plus s.16 interest.
- **s.18:** either party may refer a dispute to the **MSE Facilitation Council (MSEFC)**. The process runs conciliation (now mediation), then arbitration.
- **s.19:** to challenge an award, a party other than the supplier must pre-deposit **75%** of it.
- **s.22:** the buyer must disclose unpaid MSE dues in its annual accounts.
- **s.23:** s.16 interest is not deductible for income tax.

Sources: [TaxClue s.2](https://www.taxclue.in/blog/section-2-msmed-act-2006-appointed-day-acceptance-and-deemed-acceptance); [SCC Online on s.16](https://www.scconline.com/blog/post/2022/12/14/when-is-the-interest-rate-payable-under-section-16-of-the-msmed-act-2006-applicable/); [DC-MSME Legal Framework](https://www.dcmsme.gov.in/publications/LegalFramework.pdf)

**Who is protected.** Only **micro and small** suppliers are protected for payment timelines and interest; medium enterprises are not. The supplier's registration (Udyam memorandum) status matters:
- *Silpi Industries v KSRTC* (2021) required registration **before** the contract or supply.
- In *NBCC (India) Ltd v State of West Bengal* (**10 Jan 2025**, 2025 LiveLaw (SC) 46), the SC referred to a **3-judge bench** the question whether an MSE unregistered at the time of contract can use s.18.
- The question is **pending** (UNVERIFIED whether decided since). See [LiveLaw](https://www.livelaw.in/amp/supreme-court/can-unregistered-msmes-avail-dispute-settlement-under-s18-msmed-act-supreme-court-refers-to-larger-bench-280613).
- Separately, writ challenges to MSEFC awards under Art. 226 were referred to a 5-judge bench in *Tamil Nadu Cements Corp v MSEFC* (2025 INSC 91). Also pending (SECONDARY, [BharatLaw.ai](https://www.bharatlaw.ai/blog/twenty-years-later-the-msmed-amendment-act-2026-rewrites-indias-rules-for-msme-payments-and-disputes)).

### 1.2 MSMED (Amendment) Act 2026: new this year

**Passage and commencement**
- Introduced in Rajya Sabha on 28 Jul 2026. Passed by RS on 3 Aug and LS on 7 Aug.
- Assent 13 Aug 2026. **Act No. 16 of 2026**.
- Commencement notification: S.O. 5575(E), 12 Oct 2026.
  - Sections 2–7, 11 and 13–17 commenced **15 Oct 2026**.
  - Section 12 commences **15 Dec 2026**.

**What the amendment changes**
- **ss.15 and 16 are substantively unchanged.** The 45-day cap and the 3× Bank Rate compound interest remain.
- **New s.15A:** CPSEs must settle MSE invoices via **TReDS**. Government may extend this to other entities.
- **MSEFC process:**
  - Mediation must finish within **90 days** of first appearance.
  - Referral to arbitration follows within **30 days** of failed mediation.
  - The award is due within **90 days** of completion of pleadings.
- **Jurisdiction:** lies with the MSEFC where the **supplier** is registered under s.8, regardless of where the buyer is.
- **Award challenges:**
  - The 75% pre-deposit now also applies to challenges to mediated settlements.
  - If a challenge is pending for more than 6 months, at least 50% of the award is paid to the supplier.
  - Awards are recoverable as arrears of land revenue (SECONDARY, Crisil).
- **Classification:** thresholds move out of the Act into government notification.
- **Registration:** becomes **voluntary** for all MSMEs, via a national digital platform. The Udyam portal is expected to continue.
- **Penalties:** criminal fines become graded civil penalties.
  - A buyer that fails to disclose MSE dues in its accounts gets a warning first, then ₹10k–50k, then ₹50k–1 lakh.
  - Minimum penalties are indexed **+10% every 3 years**.

Sources: [PRS Bill summary](https://prsindia.org/files/bills_acts/bills_parliament/2026/Bill_summary_MSME_2026.pdf); [TeamLease commencement](https://teamleaseregtech.com/updates/article/60351/ministry-of-msme-commencement-of-provisions-of-the-msmed-amendment-act/); [Corpseed](https://www.corpseed.com/law-update/msme-amendment-act-2026-new-rules-effective-dates-and-impact-on-businesses); [Vinod Kothari, Oct 2026](https://vinodkothari.com/2026/10/strengthening-msme-ecosystem-msmed-amendment-bill/); [Crisil, 17 Aug 2026](https://intelligence.crisil.com/en/homepage/newsroom/press-releases/2026/08/executed-well-msme-bill-can-be-an-ibc-moment-for-delayed-payments.html)

### 1.3 Current RBI Bank Rate

- **7 Oct 2026 (63rd MPC):** repo raised 25 bps, from 5.25% to **5.50%**. SDF 5.25%, MSF 5.75%, **Bank Rate 5.75%** (up from 5.50%).
- Sources: [TeamLease (RBI LAF notification)](https://teamleaseregtech.com/updates/article/60149/rbi-issued-a-notification-regarding-the-liquidity-adjustment-facility-/); [TaxClue](https://taxclue.in/news/rbi-raises-repo-rate-by-25-bps-to-5-50-changes-stance-to-calibrated-tightening-sdf-5-25); [CorpLawUpdates](https://www.corplawupdates.in/rbi/repo-rate); [RBI MMO 18 Oct 2026](https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63827)
- The Bank Rate figure comes from secondary summaries of RBI PR 2026-2027/1264. Confirm it on rbi.org.in. The rbi.org.in homepage could not be fetched (not on the allowlist).
- **s.16 rate = 3 × 5.75% = 17.25% p.a., compounded monthly** (effective about 18.7% p.a.). Courts generally apply the Bank Rate in force on the relevant dates, so the engine should store a **rate history**, not a single value.

### 1.4 Classification and Udyam

- **Revised thresholds** (S.O. 1364(E), 21 Mar 2025, effective **1 Apr 2025**). Investment and turnover limits must both be met.
  - Micro: ₹2.5 cr / ₹10 cr
  - Small: ₹25 cr / ₹100 cr
  - Medium: ₹125 cr / ₹500 cr
  - Source: [Taxmann](https://www.taxmann.com/post/blog/revised-msme-classification)
- **Udyam + Udyam Assist registrations:** more than **8.84 crore** as of 30 Jun 2026 (RS reply, reported 20 Jul 2026, [KNN](https://knnindia.co.in/news/newsdetails/msme/over-884-crore-msmes-registered-on-udyam-platforms-mos-karandlaje)).

### 1.5 Pain point today

- **Samadhaan backlog (14 Aug 2026):** ₹20,979 cr pending across 2.57 lakh applications. About 16% have been unresolved for more than a year.
- **Uneven MSEFC capacity:** Rajasthan's 9 councils average 1,767 cases each; Karnataka's 35 average 397 (Crisil).
- **Total stuck dues:** the GAME/FISME/C2FO report (Dec 2025) estimates delayed payments to MSMEs at **₹7.34 lakh crore** (as of Mar 2024), down from about ₹10 lakh crore ([FISME](https://fisme.org.in/study/delayed-payments-to-msmes-decline-from-rs-10-lakh-cr-to-rs-7-lakh-cr-but-challenges-persist-game-fisme-report/)).
- **Drafting errors are common:** "net 60/90" terms, no written acceptance mechanics, and no interest clause. Many freelancers who qualify as micro enterprises do not know s.16 overrides the contract.

### 1.6 Clausewright rules

1. **PAYMENT_TERM_CAP.** If the supplier is micro or small (Udyam number or self-declared), reject or flag any payment term over 45 days from acceptance. If there is no written term, default to 15 days.
2. **ACCEPTANCE_CLOCK.** Insert an acceptance clause with a written-objection window of 15 days or less. Without a written objection, the work is deemed accepted on delivery. This mirrors the statute and gives the escrow a deterministic "accepted" event.
3. **INTEREST_CLAUSE.** Auto-insert "interest under s.16 MSMED Act at three times the RBI Bank Rate, compounded monthly". Show the live computed rate (17.25% at 5.75%) with an "as of" date.
4. **MSEFC_NOTICE.** For MSE suppliers, warn that an arbitration or exclusive-jurisdiction clause cannot oust MSEFC under s.18 (Mahakali Foods; Harcharan Dass Gupta 2025). Under the 2026 amendment, the supplier's home MSEFC has jurisdiction.
5. **UDYAM_FIELD.** Capture the Udyam number and registration date. Warn if registration post-dates the contract, since *Silpi* is still unresolved pending the NBCC reference.
6. **Late-payment calculator and demand-notice generator** (s.16 interest, monthly compounding).

---

## 2. Income tax: s.43B(h) and its successor under the Income-tax Act 2025

**Old law (1961 Act).** s.43B(h) was inserted by Finance Act 2023, effective AY 2024-25. It allows a deduction for sums owed to micro or small enterprises only in the year actually paid, if payment is late beyond the MSMED s.15 limit. The "paid before return due date" relief did not apply.

**New law.** The Income-tax Act 2025 is effective **1 Apr 2026**. The provision is now **s.37(2)(g)**: an amount payable to a micro or small enterprise beyond the s.15 MSMED time limit. **s.37(3)**, the relief for payment before the return due date, expressly **excludes clause (g)**. Substance is unchanged. Sources: [eztax.in s.37 text](https://eztax.in/income-tax-act-2025/section-37); [ebizfiling](https://ebizfiling.com/blog/faqs-on-section-43b-of-the-income-tax-act-1961/). SECONDARY: verify against the Gazette text of the Act.

**Transition.** Payments and events up to 31 Mar 2026 fall under the 1961 Act; later ones under the 2025 Act ([CryptoSlate citing CBDT FAQs](https://cryptoslate.com/crypto-laws/india-income-tax-act-vda-tax-tds-regime/); [PwC on CBDT transition FAQs](https://www.pwc.in/research-insights/news_alert/tax-insights/cbdt_issues_clarificatory_faqs_on_transition_provisions_under_the_income_tax_act_2025.html)).

**Pain point.** Buyers lose the deduction if they pay late. This gives an MSE supplier real leverage, but only if the contract records MSE status and the acceptance date. Some buyers have reportedly pushed MSEs to drop Udyam status or used "net 45 from invoice" wording to blur the clock (UNVERIFIED anecdotal reports).

**Clausewright.**
- Add a "Buyer tax note" banner: late payment disallows the buyer's deduction under s.37(2)(g) IT Act 2025 (formerly s.43B(h)).
- Add a status-declaration clause in which the supplier declares micro or small status with its Udyam number.
- Compute the due date from acceptance, not from invoice.

---

## 3. Indian Contract Act 1872

The text of these sections has not been amended in this period. Summaries are from the bare Act, with case updates verified.

**s.10 (what agreements are contracts).** Free consent, competent parties, lawful consideration and object, not expressly void.
- *Rule:* a checklist covering party identification, consideration stated, signatory authority, and object legality.

**s.11 (competency).** Parties must be of the age of majority (18 under the Majority Act), of sound mind, and not disqualified by law. A minor's agreement is void ab initio (*Mohori Bibee*, 1903).
- *Rule:* require a DOB or an age declaration for individual signatories. Hard-block if under 18. For a minor-related engagement (e.g. a child performer), route through the guardian as a party and flag it.

**s.23 (unlawful object or consideration).** Agreements that are forbidden by law, defeat a law, are fraudulent, injure person or property, or are immoral or against public policy are void.
- In *CORE* (2024), Narasimha J located arbitral-independence requirements in s.23 public policy. See §10.
- *Rule:* flag clauses such as "payment in cash to avoid TDS/GST", waivers of statutory dues, or bribery-adjacent "facilitation" fees.

**s.27 (restraint of trade).** Agreements restraining a lawful profession, trade or business are void, except a seller of goodwill agreeing not to compete within reasonable local limits.
- **Post-employment non-competes are void** in India. There is no reasonableness test for employees, unlike English law.
- Recent rulings:
  - **Varun Tyagi v Daffodil Software** (Delhi HC, 2025:DHC:5015, 2025 SCC OnLine Del 4589, mid-2025). A post-termination restriction on joining the employer's client or "business associates" is void. Reasonableness is irrelevant. Sources: [Verdictum](https://www.verdictum.in/app-lite/court-updates/high-courts/delhi-high-court/varun-tyagi-v-daffodil-software-pvt-ltd-neutral-citation-2025dhc5015-1582584); [Mondaq](https://www.mondaq.com/india/employee-rights-labour-relations/1667768/what-courts-are-cracking-the-code-on-post-employment-clauses-in-light-of-varun-tyagi-v-daffodil-software-pvt-ltd).
  - **Parraj Automobiles v Samiran Sinha** (Calcutta HC DB, 2026:CHC-AS:223-DB, reported 12 Feb 2026). A post-employment non-compete is prima facie void, but **non-solicitation of staff and trade-secret protection are enforceable** (s.42 Specific Relief Act) ([Verdictum](https://www.verdictum.in/court-updates/high-courts/calcutta-high-court/parraj-automobiles-private-limited-v-samiran-sinha-2026chc-as223-db-ex-employee-rival-firm-trade-secret-1607327)).
  - No new SC ruling on s.27 in 2025–26 was found. Leading SC precedents remain *Niranjan Shankar Golikari* (1967) and *Percept D'Mark v Zaheer Khan* (2006) (UNVERIFIED re-check; well established).
- *Rules:*
  - Hard-block post-termination non-competes in employment and freelance agreements. Offer instead an in-term exclusivity, garden leave during the notice period, a narrow non-solicit, and a confidentiality/IP clause.
  - For B2B commercial agreements, warn that in-term restraints are generally fine but post-term ones are risky.

**s.28 (restraint of legal proceedings).** Agreements are void if they absolutely restrict enforcing rights through ordinary tribunals, or extinguish rights or discharge liability when a specified period expires (as amended in 1997). Exceptions:
- Arbitration agreements.
- **Exception 3 (2013):** bank guarantee clauses with a **claim/limitation period of at least 1 year** from the end of the specified period.

Choosing one of several competent courts is permitted (*ABC Laminart*); ousting all courts is not. Source: [Bar & Bench](https://www.barandbench.com/columns/claim-period-limitation-period-section-28-contract-act).
- *Rules:*
  - Flag "claims must be brought within X months or are forfeited" when X is less than the Limitation Act period (3 years for contract claims).
  - Allow an exclusive-jurisdiction clause only for a court that has natural jurisdiction (place of contracting, performance or a party).

**ss.73/74 (damages, penalty vs liquidated damages).**
- s.73 covers compensation for loss naturally arising (remoteness).
- s.74 allows **reasonable compensation not exceeding** the stipulated sum.
- **Kailash Nath Associates v DDA (2015) 4 SCC 136:** loss is a sine qua non. Proof is dispensed with only where loss is hard to prove. The LD sum is a ceiling, not an entitlement.
- Delhi HC applied this in **J&K ERA v Simplex Projects** (2025 SCC OnLine Del 3515) and **PVVNL v IL&FS** (2026 SCC OnLine Del 1806).
- No 2024–26 SC ruling changing Kailash Nath was found ([SCC Online, 27 Jul 2026](https://www.scconline.com/blog/post/2026/07/27/section-74-proof-paradox-liquidated-damages-indian-contracts/)).
- *Rules:*
  - Require an LD rationale field ("genuine pre-estimate because…").
  - Warn when LD exceeds about 10% of contract value or compounds daily without a cap.
  - Always add an LD cap.
  - Never label anything a "penalty". Use "liquidated damages (genuine pre-estimate)".

---

## 4. Information Technology Act 2000: e-contracts and e-signatures

- **s.10A:** a contract is not unenforceable merely because offer, acceptance or revocation was made electronically.
- **s.3A:** electronic signatures and authentication techniques listed in the **Second Schedule** are valid if reliable.
  - **Aadhaar eSign** was added to the Second Schedule by **G.S.R. 61(E), 28 Jan 2015**.
  - CCA e-Authentication Guidelines govern it. Certifying Authorities and eSign Service Providers (e.g. NSDL, CDAC) issue it ([Leegality](https://www.leegality.com/blog/law-around-aadhaar-esign)). SECONDARY.
- **s.1(4) and the First Schedule:** the IT Act does not apply to listed documents. MeitY amended the Schedule in **Oct 2022 (S.O. 4720(E))**.
  - **Omitted:** contracts for sale or conveyance of immovable property (old entry 5).
  - **Carved out of the exclusions:** negotiable instruments, PoAs and bills of exchange where issued to or by RBI/NHB/SEBI/IRDAI/PFRDA-regulated entities.
  - **Still excluded** (cannot be validly e-signed):
    - Negotiable instruments other than cheques (save the regulated-entity carve-out)
    - Powers of attorney (same carve-out)
    - Trusts
    - Wills and testamentary dispositions
  - Sources: [Bar & Bench, Nov 2022](https://www.barandbench.com/law-firms/view-point/will-documentation-finally-go-paperless-an-analysis-into-the-recent-amendments-to-the-information-technology-act-2000); [Leegality](https://leegality.com/blog/first-schedule). The exact current Schedule wording is UNVERIFIED against indiacode. Note that Leegality's older eSign page still lists five exclusions (pre-2022).
- **Practical caveat:** leases needing registration still need **physical or e-registration under the Registration Act** and stamping, even if e-signing is now allowed in principle.
- *Rules:*
  - **ESIGN_ELIGIBILITY:** block e-sign for PoA, will, trust or promissory-note templates, with an explanation.
  - Allow e-sign for NDAs, service agreements, freelance contracts and employment letters (the OSH rules allow a digital signature on appointment letters).
  - For leases, allow e-sign but show a "registration and stamping still required" warning.

---

## 5. Bharatiya Sakshya Adhiniyam 2023 (BSA): electronic evidence

- **In force 1 Jul 2024**, replacing the Indian Evidence Act 1872.
- **s.61:** an electronic record is not inadmissible merely because it is electronic. It has the same legal effect, validity and enforceability as paper, subject to s.63 ([KS&K](https://ksandk.com/md/litigation/section-63-bharatiya-sakshya-adhiniyam-2023/)).
- **s.63 (successor to s.65B):**
  - Computer output is deemed a document if the conditions in s.63(2) are met.
  - Under **s.63(4)**, the certificate must be in **the Schedule** and signed by the person in charge of the computer **and an expert**.
- **The Schedule certificate:**
  - **Part A** is completed by the party. **Part B** is completed by the expert.
  - Each part requires device identification and **"HASH value(s)"** with the algorithm ticked: **SHA1 / SHA256 / MD5 / Other (legally acceptable standard)**.
  - A **hash report must be enclosed** ([advocatekhoj BSA Schedule](https://www.advocatekhoj.com/library/bareacts/bharatiyaaakshya2023/b.php)). VERIFIED (bare-act text).
- **Pune Bar Association v UoI** (SC, CJI Surya Kant, Bagchi and Pancholi JJ, **22 May 2026**; 2026 SCC OnLine SC 1297 / 2026 LiveLaw (SC) 551):
  - Upheld s.63(4).
  - Described the hash as "synonymous with an electronic fingerprint".
  - Suggested a computer-science or cyber-forensics expert can sign Part B (not only s.79A-notified examiners). This was not finally decided.
  - Sources: [SCC Online](https://www.scconline.com/blog/post/2026/07/08/sc-upholds-admissibility-of-electronic-evidence-under-section-63-4-bsa/); [LiveLaw](https://www.livelaw.in/amp/top-stories/supreme-court-rejects-challenge-to-s634-bsa-mandating-hash-value-disclosure-for-electronic-evidence-535950)
- **Clausewright feature: hash anchoring.**
  - Compute the **SHA-256** of the final signed PDF.
  - Anchor it on-chain with a timestamp.
  - Generate a **pre-filled BSA Schedule Part A draft** (SHA256 box ticked, hash value, device/source "Cloud/Server", timestamp in IST 24h).
  - **Do not claim** that blockchain anchoring replaces the s.63(4) certificate or the Part B expert. It is corroborative integrity evidence. Courts still need the Schedule certificate.

---

## 6. Stamp duty

**Framework.** The Indian Stamp Act 1899 applies as adapted by states. Maharashtra, Karnataka and others have their own Acts (Maharashtra Stamp Act 1958; Karnataka Stamp Act 1957). Instruments executed in a state must be stamped **before or at execution**.

**Consequences of non-stamping (Indian Stamp Act text):**
- **s.33:** a person receiving evidence or a public office must impound an under-stamped instrument.
- **s.35:** it is inadmissible and cannot be acted upon, unless duty plus a **penalty of ten times the deficit** (minimum ₹5) is paid.
- **s.40:** the Collector may levy duty plus a penalty of up to 10×.
- State variants differ. UP, for example, has its own penalty and interest rules.
- Source: [Vidhi Judicial, ss.33–48](https://vidhijudicial.com/sec-33-to-48-chapter-iv-(instruments-not-duly-stamped)-the-indian-stamp-act,-1899.html)

**In re Interplay between Arbitration Agreements and Stamp Act** (SC, 7 judges, **13 Dec 2023**, C.P. No. 44/2023, 2023 INSC 1066):
- Unstamped or insufficiently stamped agreements are **not void**. They are inadmissible until cured.
- Non-stamping is a **curable defect**.
- s.8 / s.11 courts examine only the prima facie existence of an arbitration agreement. Stamping goes to the tribunal.
- Overruled *N.N. Global* (5-judge, 2023) and *SMS Tea Estates*.
- Sources: [SC Observer](https://www.scobserver.in/cases/in-re-interplay-between-arbitration-agreements-under-the-arbitration-and-conciliation-act-1996-and-the-indian-stamp-act-1899-validity-of-unstamped-arbitration-agreement/amp/); [IndiaLaw](https://www.indialaw.in/blog/arbitration-and-conciliation/unstamped-agreements-enforceable-curable-defect/)

**E-stamping.** SHCIL is the Central Record Keeping Agency in most states. Some states use their own portals. UNVERIFIED: the per-state list of e-stamping modes in 2026, and TAXAJ's claim that e-stamping became "mandatory from July 2025".

**State rates for a general agreement** (NDA, service or freelance agreement, MoU; the residuary "agreement not otherwise provided for"):

| State | Rate | Basis | Status |
|---|---|---|---|
| Maharashtra | **₹500** (Art. 5(h)(B), up from ₹100) | Maharashtra Stamp (Amendment) Ordinance 2024, effective **31 Jul 2024** ([Mondaq](https://www.mondaq.com/india/constitutional-administrative-law/1536706/government-of-maharashtra-amends-the-maharashtra-stamp-act-1958)). A 2026 Bill (introduced 7 Jul 2026) adds Art. 34A for guarantees but leaves Art. 5 as is ([Khaitan](https://www.khaitanco.com/sites/default/files/2026-07/Maharashtra%20Stamp%20Amendment%20Bill_17072026.pdf)) | VERIFIED |
| Tamil Nadu | **₹200** (Art. 5(j), up from ₹20) | Indian Stamp (TN Amendment) Act 2023, effective **3 May 2024**. TN lease (Art. 35) base now includes the **security deposit** ([JSA](https://www.jsalaw.com/newsletters-and-updates/recent-amendments-made-to-the-stamp-duty-payable-on-various-instruments-in-tamil-nadu)) | VERIFIED. A bank table still showing ₹20 is outdated |
| Karnataka | ₹200 (per a bank's state-wise table) | Karnataka Stamp (Amendment) Act 2023, notified 3 Feb 2024, revised several Art. 5 entries. Art. 5(j) not confirmed | **VERIFY** |
| Telangana | Residuary agreement (**Art. 6** in the TS schedule): ₹50 up to ₹50k value, ₹100 up to ₹2 lakh, ₹200 above, and **₹200 if not susceptible to valuation** | ICSI copy of the Telangana schedule ([ICSI PDF](https://www.icsi.edu/media/portals/86/bare%20acts/stamp%20acts/Telanagana%20Stamp%20Schdule.pdf)). The band mapping was ambiguous | **VERIFY** |
| Andhra Pradesh | ₹100 (bank table) | Not confirmed against the AP schedule | **VERIFY** |
| Delhi | ₹50 (TAXAJ) vs ₹100 (bank table): conflicting | Not confirmed | **VERIFY** |

Bank table: [South Indian Bank state-wise](https://www.southindianbank.com/UserFiles/file/Stamp_Duty_charges-state_wise_Safe_Deposit_Lockers.pdf).

**Pain point.**
- Most freelancer and SME contracts are signed digitally with no stamp at all. When a dispute arises, the document is impounded and a 10× penalty becomes payable.
- Interplay saves the arbitration clause, but the main contract remains inadmissible until cured.
- Rates differ by state and change often: Maharashtra in 2024, Tamil Nadu in 2024, Karnataka in 2024.

**Clausewright.**
- **STAMP_ADVISOR:** take the state of execution and instrument type, then show the rate from a versioned table with source and last-verified date.
- Show a "not stamped yet" warning plus a link to the SHCIL / state e-stamp flow.
- Never auto-claim that a rate is current unless its table row is marked VERIFIED.
- Add a clause recording which party bears stamp duty.

---

## 7. Registration Act 1908 and leases

**What the law requires**
- **s.17(1)(d):** compulsory registration of leases of immovable property from year to year, for any term over one year, or reserving a yearly rent.
- **s.49:** an unregistered compulsorily-registrable document does not affect the property and is not admissible as evidence of the transaction. It may be used for collateral purposes and in a suit for specific performance.
- **s.107 Transfer of Property Act:** a lease of over one year needs a registered instrument.
- Commentary sources: [Cyril Amarchand](https://corporate.cyrilamarchandblogs.com/2021/02/time-is-of-the-essence-for-registration-of-a-lease/); [iPleaders](https://blog.ipleaders.in/rent-agreement-format-india/)

**Why "11 months" is standard**
- Keeping the term under 12 months avoids compulsory registration, the higher stamp duty on longer leases, and registration fees.
- It is also styled as "leave and licence", which is a licence, not a lease, and gives the occupant no interest in the property.
- **Maharashtra exception:** s.55 of the Maharashtra Rent Control Act 1999 requires **all** leave-and-licence agreements to be registered, whatever the term (UNVERIFIED in this session; well-established).

**Model Tenancy Act 2021**
- This is a model law only. States must enact their own versions.
- As of a Jul 2022 RS reply, only **Andhra Pradesh, Tamil Nadu, Uttar Pradesh and Assam** had aligned their laws ([Housing.com](https://housing.com/news/only-4-states-have-adopted-model-tenancy-act-rajya-sabha-told/)).
- UNVERIFIED: any further state adoptions in 2023–26. Viral "new rent rules 2026" claims were debunked as not law ([Free Press Journal](https://www.freepressjournal.in/amp/business/what-is-the-truth-behind-new-rent-rules-2026-viral-on-social-media)).

**Registration Bill 2025**
- A draft from the Department of Land Resources (MoRD), released for public comment in 2025.
- Proposals:
  - Compulsory registration of agreements to sell, PoAs for immovable property, and equitable mortgages.
  - Electronic presentation and e-certificates.
  - Consent-based Aadhaar authentication.
- **Not enacted.** No source confirmed introduction in Parliament as of Jan 2026 ([Bar & Bench, 22 Jan 2026](https://www.barandbench.com/law-firms/view-point/modernising-indias-document-registration-an-overview-of-the-registration-bill-2025)).
- UNVERIFIED: whether it was introduced between Feb and Nov 2026.

**Clausewright.**
- **LEASE_TERM_GUARD:**
  - Term of 12 months or more, or a yearly rent: "compulsory registration (s.17(1)(d)); unregistered = inadmissible (s.49)".
  - Term of 11 months or less: draft as leave and licence, with a Maharashtra-specific registration warning.
  - Tamil Nadu: include the security deposit in the stamp base.
- Add a rent-escalation clause, a lock-in, and a deposit-refund timeline. Where MTA-aligned state law applies (e.g. TN, UP), flag deposit caps (MTA model: 2 months' rent residential; UNVERIFIED per state).

---

## 8. DPDP Act 2023 and DPDP Rules 2025

**Phased commencement.** The Rules were notified on **13 Nov 2025** (some sources say 14 Nov).

| Phase | Date | What applies |
|---|---|---|
| Phase 1 | Immediately (13 Nov 2025) | Rules 1, 2 and 17–21 (Data Protection Board) |
| Phase 2 | **13 Nov 2026** (+1 year) | Rule 4 and the First Schedule (Consent Manager registration) |
| Phase 3 | **13 May 2027** (+18 months) | Rules 3, 5–16, 22–23: notice, consent, security, breach, retention, rights, SDF duties |

Sources: [Mondaq on Rules](https://www.mondaq.com/india/data-protection/1708164/digital-personal-data-protection-rules-2025-notified); [ComplianceHub, 20 Aug 2026](https://compliancehub.wiki/india-dpdp-consent-manager-november-2026-phase-two-deadline-compliance/); [LKS, May 2026](https://www.lkslaw.com/insights/articles/dpdp-act-and-rules-a-ticking-compliance-timeline)

**Proposed compression.** MeitY consulted in **Jan–Feb 2026** on compressing full compliance to **13 Nov 2026**. As of the latest sources (Apr–Aug 2026), **this had not been notified** ([Mondaq/S.S. Rana, 15 Apr 2026](https://www.mondaq.com/india/data-protection/1773554/meity-plans-to-cut-short-dpdp-compliance-timeline-and-notify-cross-border-restrictions-for-sdfs)). UNVERIFIED for Sep–Nov 2026. **Re-check egazette before demo day.**

**Processor contracts**
- **s.8(1):** the fiduciary stays accountable even for processing done by a processor.
- **s.8(2):** a processor may be engaged **only under a valid contract**.
- **s.8(5):** reasonable security safeguards are required, including at the processor.
- **s.8(7):** the fiduciary must erase data, and make its processor erase data, when consent is withdrawn or the purpose is served.
- **Rule 6:** encryption/masking, access control, **logs retained for at least 1 year**, backups, and **contractual security obligations on processors**.
- **Rule 7:** notify the Board and each affected principal "without delay", with a **detailed report to the Board within 72 hours**.
- **Rule 8:** notify the data principal **48 hours before erasure**.
- Source: [dpdpa.com s.8](https://dpdpa.com/dpdpa2023/chapter-2/section8.html)

**Penalties (Schedule)**

| Breach | Maximum |
|---|---|
| Security safeguards failure (s.8(5)) | **₹250 cr** |
| Breach-notification failure (s.8(6)) | ₹200 cr |
| Children's data obligations (s.9) | ₹200 cr |
| SDF obligations (s.10) | ₹150 cr |
| Data principal duties (s.15) | ₹10,000 |
| Any other breach | ₹50 cr |

Source: [dpdpa.com Schedule](https://dpdpa.com/theschedule.html)

**Pain point.** SME service contracts (agencies, freelance developers, payroll vendors) almost never include DPDP-grade processor terms. The law applies to B2B processing too.

**Clausewright.** A **DPA_ADDON** auto-attaches when the service involves personal data. It covers:
- Processing only on documented instructions
- Security safeguards per Rule 6, with 1-year log retention
- Breach notice to the fiduciary within a short fixed window (e.g. 24h) so the fiduciary can meet the 72h report
- Sub-processor approval
- Deletion or return on termination, with proof
- Audit cooperation
- Cross-border restriction placeholder
- An "effective date" note tied to 13 May 2027

---

## 9. New Labour Codes and employment letters

**Status**
- All four Codes (Wages 2019; IR 2020; Social Security 2020; OSH 2020) have been in force since **21 Nov 2025**. They repealed 29 central laws, but the EPF Act was retained for now.
- The Central Rules under all four were notified on **8 May 2026**: OSH (Central) Rules 2026, G.S.R. 345(E); Social Security (Central) Rules 2026.
- State rules lag in some states (e.g. WB, TN, Nagaland as of May 2026).
- Sources: [Trilegal](https://trilegal.com/knowledge_repository/trilegal-update-labour-codes-go-live/); [iPleaders, May 2026](https://blog.ipleaders.in/labour-codes-2026-implementation-complete-guide-to-what-is-in-force-what-changed-and-what-to-do-now/); [MediaNama](https://www.medianama.com/2026/05/223-social-security-central-rules-2026-gig-workers-90-days-work/); [BDO](https://www.bdo.in/en-gb/insights/alerts-updates/alert-final-central-rules-notified-under-all-four-labour-codes)

**Key rules for employment letters**
- **Appointment letter mandatory: OSH Code s.6(1)(f)** together with **Rule 6, OSH (Central) Rules 2026**. No one may be employed without a letter. Rule 6 has 16 prescribed fields:
  - Name, DOB and parent name
  - Aadhaar (with consent only)
  - LIN, and UAN/ESIC numbers
  - Designation, and type of employment (regular, fixed-term or contractual)
  - Skill category and date of joining
  - Wages/basic/DA, and other allowances
  - EPF/ESIC applicability
  - Nature of duties
  - Maternity benefit info (for women employees)
  - Signature or **digital signature**
  - Existing staff had to receive letters within 3 months of commencement.
  - Source: [TaxClue Rule 6](https://www.taxclue.in/blog/rule-6-osh-central-rules-2026-letter-of-appointment-to-employee/)
- **50% wages rule: Code on Wages s.2(y).** If excluded components (HRA, conveyance, bonus, OT, commission etc.) exceed 50% of total remuneration, the excess is added back to "wages". This changes PF, gratuity and bonus bases. Per the 16 Mar 2026 Ministry FAQ, overtime counts toward the floor.
- **Final settlement: Code on Wages s.17(2).** Wages on cessation (resignation, termination, closure) must be paid within **2 working days**. Gratuity has a separate 30-day window.
- **Fixed-term employment (FTE):**
  - FTEs get parity of wages and benefits with permanent staff.
  - **Gratuity after 1 year** of continuous service, pro-rata (SS Code **s.53(1) proviso**), versus 5 years for permanent staff.
  - UNVERIFIED: the FTE definition is at IR Code s.2(o).
- **Working hours (OSH):** at most 48 per week, and at most 12 per day including breaks. OT at **2×** beyond 8 hours a day. A 4-day week is permitted, not mandated.
- **Notice periods:**
  - The Codes set no general employee-resignation notice period. It is contractual, or set by standing orders where these apply.
  - **Retrenchment (IR Code s.70):** a worker with 1 year or more of service gets **1 month's written notice or pay in lieu**, plus 15 days' average pay per completed year.
  - **Reskilling fund (s.83):** an extra 15 days' wages, paid within 10 days.
  - Source: [KS&K](https://ksandk.com/labour-employment/layoff-retrenchment-closure-industrial-relations-code-2020/)

**Pain point.** Small employers still use pre-2025 offer-letter templates. These typically have no appointment-letter fields, CTC structures with basic around 30–40%, post-employment non-competes, and 60–90-day F&F timelines.

**Clausewright.**
- **APPOINTMENT_LETTER_SCHEMA:** require all 16 Rule 6 fields.
- **WAGE_50_CHECK:** compute basic + DA + retaining allowance as a share of gross, and warn below 50%.
- **FNF_2DAY:** force a "within 2 working days" settlement clause.
- **FTE mode:** gratuity pro-rata after 1 year, plus a parity statement.
- Block post-employment non-competes (§3).

---

## 10. Arbitration and Conciliation Act 1996

**Status of reform**
- The operative law is the 1996 Act as amended in 2015, 2019 and 2021.
- The **Draft Arbitration and Conciliation (Amendment) Bill 2024** was released for consultation on 18 Oct 2024. It proposed:
  - Emergency arbitrator (s.9A)
  - Appellate arbitral tribunal (s.34A)
  - A curtailed s.9 once the tribunal is constituted
  - Clarified "seat" terminology
  - Timelines for s.11 (about 60 days)
  - Post-award interest linked to repo rate
- **Not introduced in Parliament** as of Jun 2026 ([iPleaders](https://blog.ipleaders.in/arbitration-conciliation-amendment-bill-2024/)). UNVERIFIED for Jul–Nov 2026.

**Key rulings**
- **CORE v ECI-SPIC-SMO-MCML (JV)** (5-judge, **8 Nov 2024**, 2024 INSC 857):
  - A clause allowing one party to **unilaterally appoint a sole arbitrator** is invalid.
  - Forcing the other side to choose from a panel curated by one party breaches equal treatment.
  - In public-private contracts this violates Art. 14 (majority).
  - The ruling is **prospective**, applying to appointments after the judgment.
  - Roy J and Narasimha J concurred on different bases (statutory / s.23 public policy).
  - Sources: [SCC Online](https://scconline.com/blog/post/2024/11/08/unilateral-appointment-arbitrator-public-private-contracts-violate-article-14-supreme-court); [SC Observer](https://www.scobserver.in/cases/appointment-of-arbitrators-by-ineligible-persons/)
- **Gayatri Balasamy v ISG Novasoft** (5-judge, 4:1, **30 Apr 2025**, 2025 INSC 605). Courts have a **limited power to modify awards** under ss.34/37, in four situations:
  1. Severing an invalid part
  2. Correcting clerical or computational errors
  3. Adjusting post-award interest
  4. Article 142 (Supreme Court only)
  - Source: [iPleaders](https://blog.ipleaders.in/can-courts-modify-arbitral-award-gayatri-balasamy/)
- **Seat vs venue:** the seat determines the supervisory courts. *BGS SOMA* (2019) treats a designated "venue" with no contrary indication as the seat. (Well-established; not re-fetched.)
- **MSMED overriding effect:**
  - **Gujarat State Civil Supplies Corp v Mahakali Foods** (2-judge, 31 Oct 2022, 2022 SCC OnLine SC 1492):
    - Chapter V of the MSMED Act overrides the Arbitration Act.
    - An MSE can approach MSEFC under s.18 despite a private arbitration clause.
    - MSEFC may conciliate and then arbitrate.
  - **Harcharan Dass Gupta v UoI** (2025 INSC 689, May 2025): MSEFC jurisdiction lies where the supplier is located, overriding a contractual seat (Bengaluru).
  - Sources: [JSA](https://www.jsalaw.com/wp-content/uploads/2022/11/JSA-Prism-Dispute-Resolution-November-2022-Mahakali0716.pdf); [Verdictum](https://www.verdictum.in/court-updates/supreme-court/ms-harcharan-dass-gupta-v-union-of-india-2025-insc-689-arbitration-conciliation-act-msmed-act-overriding-effect-1577534)

**Clausewright.**
- **ARB_APPOINTMENT_CHECK:** reject "Party A shall appoint the sole arbitrator" and "the arbitrator shall be from A's panel". Default to mutual appointment, failing which s.11, or an institution (e.g. MCIA, IIAC, DIAC).
- **SEAT_EXPLICIT:** always state "seat" (not just "venue"), governing law, and language.
- **MSME_CARVEOUT:** where the supplier is an MSE, add "without prejudice to s.18 MSMED Act".
- **EMERGENCY_RELIEF:** reference institutional emergency-arbitrator rules. Statutory s.9A is not in force.

---

## 11. Blockchain, smart contracts, crypto, CBDC

- **Smart contracts:**
  - There is no specific statute. They are enforceable if they satisfy the Contract Act (offer, acceptance, consideration, lawful object). IT Act s.10A validates electronic contract formation.
  - Code is best treated as **performance mechanics**, with a natural-language contract governing.
  - Source: [AZB Cryptoassets Guide 2026](https://www.azbpartners.com/bank/cryptoassets-law-guide-2026-india-chapter/)
- **Crypto regulation (Jun 2026):**
  - No dedicated crypto law. The 2019 and 2021 bills were never tabled.
  - A government "discussion paper" was repeatedly promised in 2025 but not confirmed released (UNVERIFIED).
  - VDA service providers are **PMLA reporting entities** (Mar 2023) and must register with FIU-IND. FIU-IND issued AML/CFT guidelines on 8 Jan 2026 (AZB).
- **Tax on VDAs:**
  - **30%** flat tax: old s.115BBH, now **s.194 Table Sl. 4**, IT Act 2025.
  - **1% TDS**: old s.194S, now **s.393(1) Table Sl. 8(vi)**.
  - Thresholds unchanged at ₹50k for specified persons and ₹10k for others.
  - 18% GST on exchange fees.
  - Sources: [CryptoSlate](https://cryptoslate.com/crypto-laws/india-income-tax-act-vda-tax-tds-regime/); [Toolisky](https://toolisky.com/blog/vda-tax-under-the-new-income-tax-act). SECONDARY.
- **RBI e-rupee:**
  - CBDC-R in circulation: **₹771.66 cr at 31 Mar 2026**, down about 24% from ₹1,016.46 cr a year earlier.
  - In 2025-26 the RBI ran **programmable CBDC pilots for DBT schemes**.
  - FY27 plans: wider DBT and retail use cases, tokenisation pilots, a CBDC sandbox, and cross-border pilots.
  - Source: [Outlook Money, 31 May 2026](https://www.outlookmoney.com/banking/rbi-to-expand-digital-rupee-pilots-explore-cross-border-cbdc-transactions-in-fy27), based on the RBI Annual Report 2025-26.
- **Implications for the Clausewright demo:**
  1. The escrow runs on a **public testnet** with valueless test tokens. Say this explicitly in the UI and video: no real money and no VDA transfer. That avoids VDA tax/TDS and PMLA questions in the demo.
  2. A production version should settle in **INR via a regulated escrow** (RBI-regulated bank escrow or payment aggregator) or e-rupee programmable pilots when available. On-chain should be used for **state and hash anchoring only**.
  3. The legal contract stays primary. The on-chain milestone state is evidence of performance and acceptance, mapped to the MSMED acceptance clock (§1).
  4. Do not describe the token as payment or investment.

---

## 12. Freelancers and gig workers

**Code on Social Security 2020**
- It defines gig and platform workers. Aggregators contribute a notified percentage of annual turnover or **5% of amounts paid or payable to workers**.
- Social Security (Central) Rules 2026 (8 May 2026):
  - Eligibility needs **90 days** with one aggregator or **120 days** across several in the prior FY. Eligibility ends at age 60.
  - The National Social Security Board is constituted under **s.114(6)**.
  - **No s.114 scheme had been notified yet** as of May 2026.
  - Source: [MediaNama](https://www.medianama.com/2026/05/223-social-security-central-rules-2026-gig-workers-90-days-work/)
- The widely cited "1–2% of turnover" rate is UNVERIFIED as notified.

**State laws**

| State | Law | Key provisions | Status |
|---|---|---|---|
| Rajasthan | Platform Based Gig Workers (Registration and Welfare) Act 2023 | Passed Jul 2023 | Implementation and rules UNVERIFIED (reports of non-implementation) |
| **Karnataka** | Platform Based Gig Workers (Social Security and Welfare) Act 2025 (**Act 72 of 2025**). Assent 11 Sep 2025; deemed in force from 30 May 2025 | Pay at least **weekly**, "no delay in disbursal". 14 days' notice of contract changes. **14 days' notice plus written reasons** before deactivation. Welfare fee **1–5% of payout**. IDRC must decide within 45 days | VERIFIED ([indiacode PDF](https://www.indiacode.nic.in/bitstream/123456789/22201/1/72_of_2025_%28e%29.pdf)) |
| **Telangana** | Platform Based Gig Workers (Registration, Social Security and Welfare) Act 2026 (**Act 21 of 2026**). Assent 25 Apr 2026; Gazette 28 Apr 2026. Commencement by notification (G.O.Ms. No. 7; rollout reported from 15 Aug 2026) | Termination needs written reasons and **7 days' notice**. 14 days' notice of contract or algorithm changes. Welfare fee rate by notification, deposited monthly | VERIFIED ([PRS Act PDF](https://prsindia.org/files/bills_acts/acts_states/telangana/2026/Act21of2026TG.pdf)); commencement date SECONDARY |

**The user's brief referred to "Telangana 2025".** The draft bill was from 2025, but the enacted law is from **2026**.

**Relevance for freelancers.** These laws cover **platform** workers. Independent freelancers contracting directly with SMEs are mostly outside them, and their main protection is the **MSMED Act if they hold Udyam registration as a micro enterprise** (§1). Pain points:
- Late payment
- Scope creep
- Unpaid revisions
- IP taken without payment
- TDS deducted but not deposited or reflected in Form 26AS (UNVERIFIED stats)

**Copyright Act 1957: deterministic IP rules** (VERIFIED from [copyright.gov.in Ch. IV](https://copyright.gov.in/Copyright_Act_1957/chapter_iv.html))
- **s.17:** the author is the first owner.
  - Exception (c): **employees** under a contract of service give the employer ownership, absent agreement otherwise.
  - Exception (b): commissioned **photographs, paintings, portraits, engravings and films** belong to the commissioner.
  - **Commissioned software, writing or design by a freelancer is not covered.** The freelancer owns it unless it is assigned.
- **s.18:**
  - An assignment of a future work takes effect when the work comes into existence.
  - It does **not** extend to modes or media not existing or commercially used at the time, unless expressly mentioned.
  - Royalty rights for literary and musical works in films and sound recordings are non-waivable.
- **s.19:**
  - (1) An assignment is valid only **in writing, signed** by the assignor.
  - (2) It must identify the work, the rights, the **duration and the territory**.
  - (3) It must specify royalty or consideration.
  - (4) A right not exercised **within 1 year** lapses, unless otherwise specified.
  - (5) If no duration is stated, it lasts **5 years**.
  - (6) If no territory is stated, it applies in **India only**.
- **Pine Labs v Gemalto** (Delhi HC DB, 3 Aug 2011): an IP clause silent on term and territory was read as 5 years in India only ([Khurana](https://www.khuranaandkhurana.com/interpreting-section-19-5-of-the-copyright-act-1957-through-pine-labs-v-gemalto-when-does-contra)).

**Clausewright IP rules**
- **IP_ASSIGN_COMPLETE:** require all of the following, or default to a licence:
  - Signed writing
  - Identified works or deliverables
  - Enumerated rights
  - Explicit duration ("for the full term of copyright")
  - Explicit territory ("worldwide")
  - Consideration
  - A s.19(4) non-exercise override ("shall not lapse for non-exercise")
  - Express inclusion of future media (s.18 proviso)
- **ASSIGN_ON_PAYMENT:** IP transfers on the final escrow release. This links the escrow to IP.
- Keep a moral rights (s.57) acknowledgement. Moral rights cannot be assigned.

---

## 13. Access to justice and the legal-tech context

**Pendency (NJDG, 31 Dec 2025; Lok Sabha reply of 13 Feb 2026)**
- SC: **92,101**
- High Courts: **63,66,023**
- District courts: **4,76,57,328**
- Total: about **5.4 crore**
- The SC stood at **95,019** on 1 Oct 2026.
- Sources: [Madhyamam](https://madhyamamonline.com/amp/india/govt-informs-parliament-over-476-crore-court-cases-pending-across-india-1494639); [SC Observer](https://www.scobserver.in/journal/september-2026-pendency-increases-by-380-cases/amp/)

**Other context**
- **eCourts Phase III:** approved by Cabinet in Sep 2023, for 4 years, with an outlay of about ₹7,210 cr ([narendramodi.in](https://www.narendramodi.in/cabinet-approves-ecourts-phase-iii-for-4-years)). Outlay figure and 2026 progress are UNVERIFIED.
- **Cost of contract drafting for MSMEs:** no reliable primary statistic was found (UNVERIFIED). Avoid quoting a number. Present it qualitatively, e.g. "a lawyer-drafted NDA or service agreement often costs several thousand rupees", and mark that as an estimate.

**Judicial AI policy**
- **Kerala HC "Policy regarding use of AI tools in District Judiciary"** (19 Jul 2025):
  - Bars use of AI to reach findings or draft orders.
  - Warns against putting case data into public cloud AI tools.
  - Applies to judges and staff.
  - Source: [Mondaq/S.S. Rana](https://www.mondaq.com/india/new-technology/1697868/kerala-high-courts-new-ai-guidelines-set-national-standard-for-judicial-integrity)
- **SC Draft Regulations for the Use of AI in Courts 2026** (released **3 Jun 2026** for consultation; not binding):
  - AI is assistive only.
  - **Reg. 43(3)** requires disclosure when a party or counsel uses AI in a filing.
  - Audits and AI registers.
  - Source: [iPleaders](https://blog.ipleaders.in/ai-hallucinated-case-law-fake-citations-india/)

**Hallucinated-citation incidents**
- **Pooja Ramesh Singh v J&K Bank** (SC, **2 Jul 2026**, 2026 INSC 668):
  - Set aside NCLT/NCLAT orders that relied on fabricated precedents.
  - Called citing unverified AI judgments "misconduct on the part of an advocate".
  - **Directed the BCI to form a committee** on the issue.
- **Bombay HC (Oct 2025):** quashed a tax assessment of about ₹27.91 cr that rested on three non-existent AI-generated precedents.
- **ITAT Bengaluru, Buckeye Trust** (order of 30 Dec 2024): recalled after fake citations surfaced.
- Source: [iPleaders, Jul 2026](https://blog.ipleaders.in/ai-hallucinated-case-law-fake-citations-india/); [Free Press Journal](https://www.freepressjournal.in/india/supreme-court-sets-aside-nclt-nclat-orders-over-ai-generated-fake-citations-asks-bci-to-frame-norms)

**Clausewright design implications**
- **No free-text citations.** Every statutory reference comes from a curated, versioned rule table with a source URL and a "last verified" date.
- Generated drafts carry an **"AI-assisted" disclosure** footer, in line with SC draft Reg. 43(3).
- **Lawyer-review mode.** The LLM drafts prose only inside clause slots. A deterministic rule engine validates the output. Any citation not in the table is stripped and flagged.

---

## 14. GST on legal services and TDS on professional fees

**GST on legal services**
- Legal services by an advocate or firm of advocates **to a business entity** are taxed under **reverse charge**: the recipient pays **18%** GST.
- **Exempt** when supplied to:
  - Individuals or non-business recipients
  - Other advocates or firms
  - Business entities with turnover up to the registration threshold (₹20 lakh; ₹10 lakh in special-category states)
- Advocates whose supplies are wholly under RCM generally need not register.
- Source: [TAXAJ 2026](https://www.taxaj.com/learn/?p=367). SECONDARY.
- Notification references commonly cited (UNVERIFIED this session): **13/2017-Central Tax (Rate), entry 2** (RCM) and **12/2017-CT(Rate), entry 45** (exemption). No change reported from the Sept 2025 GST rate rationalisation (UNVERIFIED).

**GST for freelancers.** A freelancer or service MSME charges GST under forward charge at 18% for most professional or IT services, if registered. Registration threshold is ₹20 lakh for services (₹10 lakh in special-category states). Export of services is zero-rated under a LUT. UNVERIFIED in this session; standard law.

**TDS on fees for professional or technical services**
- Old s.194J, now **s.393(1) Table Sl. No. 6(iii).D** of the IT Act 2025 from **1 Apr 2026**:
  - Professional services: **10%**
  - Technical services: **2%**
  - Directors' fees (non-salary): 10%, no threshold
  - Threshold: **₹50,000** per year per payee for professional and technical
  - No PAN: 20%
- Source: [TDSMAN](https://blog.tdsman.com/2026/07/tds-on-fees-for-professional-and-technical-services-section-3931-194j/). SECONDARY: confirm the table numbering against the Act.

**Clausewright.**
- **TAX_CLAUSE:**
  - Fees are exclusive of GST.
  - If the payer is a business and the provider is an advocate, note RCM.
  - TDS at the applicable rate under s.393 IT Act 2025 (formerly 194J), with a duty to issue the TDS certificate within the statutory time.
  - The payer must deposit TDS. Gross-up is optional.
- Show the professional vs technical distinction, since the 10% vs 2% classification is a frequent dispute.

---

## Top 10 real pain points, ranked (severity × frequency)

Scoring is a qualitative judgement: severity (S) and frequency (F) each run 1–5, and score = S×F.

| # | Pain point | Who | S×F | Clausewright feature |
|---|---|---|---|---|
| 1 | **Late or non-payment by clients.** ₹20,979 cr pending on Samadhaan; about ₹7.3 lakh cr in delayed receivables | MSEs, freelancers | 5×5=25 | **PAYMENT_TERM_CAP** (≤45 days), **ACCEPTANCE_CLOCK** (15-day written objection, else deemed accepted), **INTEREST_CLAUSE** (3× Bank Rate = 17.25%, live), demand-notice and MSEFC-ready claim pack, **milestone escrow** that auto-releases on deemed acceptance |
| 2 | **Contracts not stamped, or wrong state rate.** Inadmissible until cured; 10× penalty | Everyone | 4×5=20 | **STAMP_ADVISOR** with a versioned state table, e-stamp prompt and duty-bearer clause; never asserts an unverified rate |
| 3 | **IP never validly assigned** (no writing, term or territory, so 5 years and India only by default; 1-year lapse) | Freelancers, SMEs buying work | 4×4=16 | **IP_ASSIGN_COMPLETE** checklist (s.18/19) and **ASSIGN_ON_PAYMENT** linked to escrow release |
| 4 | **Void post-employment non-competes** and over-broad restraints that give false comfort | SME employers, employees | 3×5=15 | **NONCOMPETE_BLOCK** (s.27, Varun Tyagi 2025, Parraj 2026) with substitutes: non-solicit, confidentiality, garden leave |
| 5 | **Outdated employment letters** after the 21 Nov 2025 Labour Codes (no Rule 6 fields, basic below 50%, slow F&F) | SME employers | 4×4=16 | **APPOINTMENT_LETTER_SCHEMA** (16 fields), **WAGE_50_CHECK**, **FNF_2DAY**, FTE gratuity-after-1-year mode |
| 6 | **Unilateral or biased arbitration clauses** and seat/venue confusion | SMEs vs larger counterparties; junior lawyers | 3×4=12 | **ARB_APPOINTMENT_CHECK** (CORE 2024), **SEAT_EXPLICIT**, **MSME_CARVEOUT** (Mahakali; Harcharan Dass Gupta) |
| 7 | **Penalty-style LD clauses** that will not be enforced (Kailash Nath) | SMEs, vendors | 3×4=12 | **LD_GUARD**: pre-estimate rationale, cap, no "penalty" wording |
| 8 | **No DPDP processor terms** in service contracts ahead of 13 May 2027; ₹250 cr exposure | IT and agency vendors, SMEs | 4×3=12 | **DPA_ADDON** (s.8(2), Rules 6/7/8: 1-year logs, 72h chain, 48h erasure notice) |
| 9 | **Lease mistakes:** terms over 11 months unregistered; Maharashtra L&L registration; TN deposit in stamp base | Small businesses renting premises | 3×4=12 | **LEASE_TERM_GUARD**, plus state flags |
| 10 | **Hallucinated or unverifiable citations** from AI drafting tools, now treated as advocate misconduct (SC, 2 Jul 2026) | Junior lawyers, legal-tech users | 5×2=10 (rising) | **Closed citation table** with source and verified date; citations outside it are stripped; "AI-assisted" disclosure (SC draft Reg. 43(3)); **SHA-256 hash anchoring** with a pre-filled BSA s.63(4) Schedule Part A draft (not a substitute for the certificate) |

Honourable mention: **TDS and GST clauses.** Professional (10%) vs technical (2%) classification under s.393 IT Act 2025; RCM for advocates. Handled by **TAX_CLAUSE**.

---

## Open items to re-verify before demo or submission

1. RBI **Bank Rate 5.75%**: confirm on rbi.org.in (PR 2026-2027/1264). Recompute the s.16 rate after the next MPC (Dec 2026).
2. DPDP: was any timeline-compression amendment notified in Sep–Nov 2026? Check egazette.
3. Stamp duty rates for KA, AP, TS and Delhi general agreements.
4. NBCC v State of WB (unregistered MSE under s.18) and TN Cements (writ vs s.19): any decision?
5. Arbitration Amendment Bill: introduced after Jun 2026?
6. Registration Bill 2025: introduced in Parliament in 2026?
7. Exact section and table numbers in the IT Act 2025 (s.37(2)(g); s.393(1) Sl. 6(iii).D and 8(vi); s.194 Sl. 4): confirm against the official Act PDF.
8. GST notification numbers (13/2017 and 12/2017 CT(Rate)) and any GST 2.0 change affecting legal services.
9. Telangana gig Act commencement notification (G.O.Ms. No. 7) date.
10. eCourts Phase III outlay and progress figures.
