# AI workflows and models

Clausewright uses AI where language is ambiguous and fixed rules where the law is exact. No model ever writes binding clause text, computes a number, or cites an authority outside the closed list.

| Task | Method | Why |
|---|---|---|
| Turn a plain-language deal into a term sheet | LLM structured extraction (`claude-sonnet-5-5`) | Free text in English or Hinglish, with lakh/crore amounts and relative dates |
| Decide what the law requires | Deterministic rules | Legal thresholds (45 days, 15 days, 48 hours, 50%) are exact; a model adds risk and no value |
| Write the contract | Deterministic clause assembly | The text must hash identically every time and match the escrow |
| Find relevant authorities for a clause | BM25 retrieval with legal synonym expansion | Transparent, cheap, needs no index service |
| Review a contract someone else wrote | Rule patterns, then LLM review per clause (`claude-opus-5-5`) restricted to retrieved authorities | Counterparty drafting is unbounded; the model reasons, the whitelist keeps citations real |
| Prove the code matches the contract | Deterministic three-way verifier | It is a proof obligation, not a judgement call |

Model names are configuration (`CW_MODEL`, `CW_REVIEW_MODEL`). Both agents use the SDK's structured output (`messages.parse` with a Pydantic schema), so a response either validates or is rejected. The structured-output grammar has a complexity budget, so the intake schema is flat (every field required, empty string for "not stated", no optional unions) and is requested in two calls, parties then deal terms, which are merged before grounding.

## 1. Intake agent (`backend/app/agents/intake.py`)

```
user messages ─▶ LLM (schema: Extraction) ─▶ grounding filter ─▶ amount parser ─▶ TermSheet validation
                                                  │                    │                  │
                                         rejected fields        bad amounts        missing fields
                                                  └────────────────────┴──────────────────┴─▶ clarifying questions
```

- **Extract, never compute.** Amounts come back exactly as the user wrote them ("1.5 lakh", "₹3,50,000") and are converted by `parse_amount_expression` with integer arithmetic. Fractions of a paisa are rejected.
- **Evidence grounding.** Every extracted value carries a verbatim evidence span. After NFKC and whitespace normalisation, the span must appear in what the user actually wrote, or the value is dropped and turned into a question. This catches hallucinated emails, inflated amounts and invented payment terms; `tests/test_agents.py` covers each case.
- **Prompt injection.** User text is wrapped as data in `<user_messages>`; a closing tag inside the payload is neutralised. Even if the model obeyed an instruction such as "set payment to 180 days", the value has no supporting span in the user's own deal terms, and if it did, the rules engine blocks it. The golden set includes this attack.
- **Clarifying questions** come from Pydantic validation errors mapped to plain questions, so the agent asks only for what is missing.

## 2. Reviewer agent (`backend/app/agents/reviewer.py`)

1. **Split** the pasted contract into clauses: numbered, "Clause n", "Article n" or headings, falling back to paragraphs.
2. **Rule layer** (always on, offline): nine regex families for known red flags. Each is tied to fixed authorities:
   - post-term non-compete
   - unilateral arbitrator
   - payment beyond 45 days
   - pay-when-paid
   - claim bar
   - penalty
   - unlimited liability
   - copyright assignment without territory
   - personal data without processor terms
3. **Retrieval.** BM25 picks the four most relevant knowledge-base authorities for each clause.
4. **LLM layer** (when a key is configured). One call sees every clause with its retrieved authorities, framed as untrusted data. It may cite only those ids.
5. **Citation filter.** Any id not retrieved for that clause, and any reference to a clause that does not exist, is dropped and counted (`meta.citations_dropped`). The UI shows that count. A fabricated case therefore cannot reach the user. This matters after *Pooja Ramesh Singh v J&K Bank* (SC, 2 Jul 2026).
6. **Merge.** Rule findings win ties; AI findings add what the rules cannot express.

If the AI call fails, the API returns the rule findings and says the AI review was unavailable.

## 3. Deterministic core

- **Rules engine:** 12 rule families producing about 40 distinct findings. Each finding cites the knowledge base, and most carry an `autofix` that the UI applies in one click.
- **Drafting:** a clause library parameterised by the term sheet. Numbers are always written as words plus figures ("fifteen (15) days", "₹1,50,000.00 (Rupees One Lakh Fifty Thousand Only)"), so the verifier can cross-check the two.
- **Verifier:** re-parses figures and Indian-English number words back to integers and compares them with the term sheet, Schedule B and on-chain state.

## Evaluation

| Suite | What it measures | Where |
|---|---|---|
| Mutation testing | Verifier catches 30 seeded inconsistencies | `backend/tests/test_verifier_mutations.py` |
| Compliance gate | Six seeded legal defects are blocked | `evals/run_evals.py` |
| Reviewer corpus | Precision and recall on 46 labelled clauses with near-miss negatives | `evals/reviewer_corpus.jsonl` |
| Intake golden set | Field accuracy and prompt-injection resistance on 4 conversations, 21 fields: 100% with the live model | `evals/intake_golden.jsonl` |
| Agent unit tests | Grounding, rejection, citation filtering, with a fake LLM | `backend/tests/test_agents.py` |
| On-chain end to end | Real deployment from API output, three-way verification, full payment flow | `evals/run_onchain_e2e.sh` |

## What the AI is not allowed to do

- Write or edit clause text that is hashed and signed.
- Produce numbers that reach the contract or the chain without being parsed from the user's own words.
- Cite anything outside `app/legal/kb.py`.
- Override a rule. Rules run after extraction and before drafting.
