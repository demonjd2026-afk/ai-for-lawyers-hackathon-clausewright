# Security

## Threat model and controls

| Threat | Control | Test |
|---|---|---|
| Client submits altered contract text to get a valid-looking hash | API accepts term sheets only; request models forbid unknown fields; text is always generated server-side | `test_client_cannot_submit_contract_text` |
| Party name or scope injects a clause or heading | `clean()` strips control and bidi characters, collapses newlines in single-line fields, escapes heading and numbering markers, replaces table pipes | `test_party_name_cannot_inject_a_clause`, `test_scope_cannot_inject_heading_or_numbered_clause`, `test_pipe_in_milestone_cannot_break_table` |
| Trojan Source / visually spoofed text | NFC normalisation and bidi stripping before hashing | `test_bidi_and_control_characters_stripped` |
| Prompt injection in deal text or reviewed contracts | Untrusted-data envelopes; evidence grounding; rules engine after extraction; citation whitelist | `test_hallucinated_values_are_rejected_and_asked`, `test_llm_citations_outside_retrieved_set_are_dropped`, intake golden "injection" case |
| Hallucinated legal authorities | Closed knowledge base; citations outside retrieved ids dropped and counted | as above |
| Code and contract disagree | Three-way verifier; seal fills only on full agreement; payee must confirm the hash on-chain before funding | 30 mutation tests, on-chain e2e |
| Escrow theft, re-entrancy, insolvency | Pull payments, ReentrancyGuard, no admin, SafeERC20, balance-delta check | 35 Solidity tests including fuzz and 3 invariants |
| Large or abusive requests | Streaming body cap (256 kB), length limits on every field, 20 milestones max, per-IP rate limits (stricter on AI routes) | `test_body_limit`, `test_ai_rate_limit` |
| Information leakage | Validation errors never echo input; unhandled errors return an opaque reference; no stack traces | `test_validation_does_not_echo_input` |
| XSS / clickjacking | React text rendering only (no `dangerouslySetInnerHTML`); CSP `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`; `nosniff`; `no-referrer` | `test_draft_ok_and_headers` |
| Third-party requests from the page | Fonts are bundled with the app (`@fontsource-variable`), so `font-src` and `style-src` stay at `'self'`; the only outbound connections are the configured chain RPCs | — |
| Path traversal in static serving | Resolved path must be inside the static directory; artifact names are an allow-list | `test_artifact_name_is_allowlisted` |
| Secrets | API key held as `SecretStr`, read from the environment, never logged or returned | — |
| Dev keys on a public chain | Hardhat test keys are used only when the chain is `local`; Sepolia requires the user's own wallet | — |

## Scans (3 Nov 2026)

| Tool | Scope | Result |
|---|---|---|
| `pip-audit` | all backend dependencies | no known vulnerabilities |
| `npm audit` | contracts, frontend | 0 vulnerabilities (Hardhat's transitive `zod` pinned to 4.6.7 via `overrides`, fixing GHSA-mrhx-c7xc-m3w5) |
| `bandit` | `backend/app` | no issues (a literal bidi character in a regex was replaced with escapes) |
| `ruff` (E, F, W, B, S, UP, SIM) | backend | clean |
| `slither` 102 detectors | escrow, token | 0 issues after acknowledging `timestamp` (by design) and constructor `cyclomatic-complexity` (input validation) |

## Pinned versions

Python 3.13; FastAPI 0.162.0, Pydantic 2.14.2, anthropic 2.4.0, uvicorn 0.54.0, python-docx 1.2.0. Solidity 0.8.38, OpenZeppelin 5.6.1, Hardhat 3.21.2, forge-std 1.17.0. React 19.3.1, Vite 8.3.5, TypeScript 7.0.2, Tailwind CSS 4.3.4, Radix UI (dialog 1.3.1, select 2.4.1, tabs 1.2.1, tooltip 1.4.1), Motion 14.9.0, lucide-react 1.67.0, viem 2.57.14.

## Not in scope for the hackathon build

- Authentication and per-user storage. The app is stateless; term sheets live in the user's browser.
- A distributed rate limiter for more than one instance.
- A third-party smart-contract audit before handling real value.
