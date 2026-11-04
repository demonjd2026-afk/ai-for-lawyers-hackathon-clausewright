# Legal basis

Clausewright's rules come from a research pass on Indian law as it stands in November 2026. Every authority the app cites is in `backend/app/legal/kb.py` with a source link and a status: **verified** (a primary source or two credible secondary sources) or **secondary** (one credible secondary source; confirm before relying on it in court). The full research brief, including what is still unverified, is in [legal-research-2026-11.md](legal-research-2026-11.md).

## Pain points and how they are handled

| # | Pain point (who it hurts) | What changed recently | Clausewright |
|---|---|---|---|
| 1 | **Late payment to micro and small suppliers.** ₹20,979 cr pending on MSME Samadhaan (14 Aug 2026) | MSMED (Amendment) Act 2026 (Act 16 of 2026) in force from 15 Oct 2026: same 45-day cap and s.16 interest, the supplier's local Council has jurisdiction, fixed timelines. Bank Rate 5.75% from 7 Oct 2026, so s.16 interest is 17.25% a year with monthly rests | Blocks payment terms over 45 days and acceptance windows over 15 days for MSE suppliers. Drafts acceptance mechanics. Keeps the Council route above any arbitration seat. Escrow pays on deemed acceptance. Interest calculator with rate history; demand notice |
| 2 | **Unstamped or wrongly stamped agreements** (everyone) | Maharashtra raised general agreements to ₹500 (2024); Tamil Nadu to ₹200 (2024) | Stamp advice per state, showing only verified rates; a clause on who pays; explains *In re Interplay* (2023): inadmissible until cured, not void |
| 3 | **Copyright never validly assigned** (freelancers and their clients) | Unchanged law, widely ignored: unstated term means 5 years, unstated territory means India, unused rights lapse after 1 year | Assignment names rights, territory, term and consideration, includes future media, overrides the 1-year lapse, and passes on payment, which ties it to escrow release. Warns if limited to India or 5 years |
| 4 | **Void post-employment non-competes** (SME employers, employees) | *Varun Tyagi* (Delhi HC 2025), *Parraj* (Calcutta HC 2026) | Blocks post-term non-competes and never drafts them, even if the rule is bypassed. Offers a narrow non-solicit and confidentiality instead |
| 5 | **Outdated offer letters** (SME employers) | All four Labour Codes in force 21 Nov 2025; central rules 8 May 2026; appointment letter mandatory | Appointment-letter template with a particulars schedule. 50% wage add-back computed and shown. Final settlement within 2 working days. Fixed-term parity and gratuity after 1 year. 48-hour week |
| 6 | **One party appoints the arbitrator** (SMEs facing larger firms) | *CORE* (Constitution Bench, 8 Nov 2024) | Blocks unilateral appointment; drafts mutual or institutional appointment with s.11 fallback and an explicit seat |
| 7 | **Penalty clauses that will not be enforced** | *Kailash Nath* (2015), applied by Delhi HC in 2025–26 | Liquidated damages drafted as a genuine pre-estimate capped at 10%; flags high rates |
| 8 | **No DPDP processor terms** (agencies, IT vendors) | DPDP Rules notified 13 Nov 2025; most obligations from 13 May 2027; penalties up to ₹250 cr | Processor clause: instructions only, safeguards with 1-year access logs, 24-hour breach notice so the fiduciary can meet the Board's 72-hour report, sub-processor consent, erasure. Flags scopes that mention personal data |
| 9 | **AI tools inventing citations** (junior lawyers) | *Pooja Ramesh Singh* (SC, 2 Jul 2026): misconduct; SC draft AI rules (Jun 2026) ask for disclosure | Closed, source-linked authority list; AI citations outside it are dropped and counted; Word exports carry an AI-assistance notice |
| 10 | **Proving a document is the one signed** | BSA s.63(4) certificate needs the hash; upheld in *Pune Bar Association* (SC, 22 May 2026) | SHA-256 recorded on-chain and confirmed by the payee before funding; drafts Part A of the certificate. On-chain proof supports the certificate, it does not replace it |

## Tax references under the Income-tax Act, 2025 (in force 1 Apr 2026)

| Old (1961 Act) | New | Used for | Status |
|---|---|---|---|
| s.43B(h) | s.37(2)(g) | Buyer's deduction depends on paying an MSE on time | secondary |
| s.194J | s.393(1), Table Sl. 6(iii) | TDS on professional (10%) and technical (2%) fees above ₹50,000 | secondary |
| s.194S / s.115BBH | s.393(1) Sl. 8(vi) / s.194 Sl. 4 | Why the demo escrow uses a no-value token | secondary |

Contract text refers to "the Income-tax Act, 2025" and "as required by law" rather than to section numbers, so a renumbering confirmed later does not invalidate signed drafts.

## Open questions to re-check before relying on the output

- Bank Rate after the December 2026 MPC meeting (add it to `BANK_RATE_HISTORY`).
- Whether the proposal to bring DPDP obligations forward to November 2026 was notified.
- Stamp rates for Karnataka, Andhra Pradesh, Telangana and Delhi (shown as "not verified" in the app).
- *NBCC v State of West Bengal*: can an MSE registered after the contract use s.18? Until decided, the app warns when Udyam registration post-dates the agreement.
