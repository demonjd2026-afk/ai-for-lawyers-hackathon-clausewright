# Clausewright eval results

Run: 2026-11-03 11:00 IST

## 1. Clause-code verifier: mutation testing

30 seeded inconsistencies between term sheet, contract prose, Schedule B and the deployed escrow (wrong figure, wrong words, swapped wallet, stale hash, dropped milestone, inserted non-compete).

**Detected: all** (0.3 s)

## 2. Compliance gate: seeded legal defects

| Defect | Blocked before drafting |
|---|---|
| 90-day payment to a micro supplier | yes |
| 30-day acceptance window (MSE) | yes |
| 2-year post-term non-compete | yes |
| Client appoints the sole arbitrator | yes |
| Arbiter wallet = client wallet | yes |
| Milestone due before start | yes |

## 3. Contract reviewer (rule layer): labelled clause corpus

46 clauses, including near-miss negatives (in-term restraints, mutual appointment, capped LD).

**Precision 100% · Recall 96%**

| Red flag | Precision | Recall | Positives |
|---|---|---|---|
| claims_bar | 100% | 100% | 4 |
| data_no_processor_terms | 100% | 100% | 2 |
| ip_no_territory | 100% | 100% | 3 |
| long_payment | 100% | 100% | 4 |
| non_compete | 100% | 83% | 6 |
| pay_when_paid | 100% | 100% | 2 |
| penalty | 100% | 100% | 2 |
| unilateral_arbitrator | 100% | 100% | 3 |
| unlimited_liability | 100% | 100% | 2 |

Errors:

- missed: `non_compete`: Following cessation of employment, the Employee must not take up work with any rival or similar business for e

## 4. On-chain end to end

Run separately with `evals/run_onchain_e2e.sh`: deploys the real escrow from API output to a local chain, verifies chain against prose against terms, runs acknowledge, fund, deliver, deemed acceptance and withdraw, and confirms a tampered deployment and a wrong document hash are rejected.

## 5. AI intake (LLM): golden conversations

Not run: set ANTHROPIC_API_KEY to evaluate field accuracy and prompt-injection resistance.
