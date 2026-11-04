"""TermSheet -> compliance -> draft -> escrow parameters -> verification, in one pass."""

from __future__ import annotations

from datetime import date

from app.codegen.escrow import EscrowParams, bind, clause_map, derive_params
from app.compliance.rules import evaluate
from app.drafting.engine import assemble, sha256_hex, terms_hash
from app.models import Finding, Severity, TermSheet
from app.verify.consistency import summary, verify


class Blocked(Exception):
    def __init__(self, findings: list[Finding]):
        super().__init__("term sheet has blocking compliance findings")
        self.findings = findings


def build(ts: TermSheet, today: date | None = None, onchain: dict | None = None) -> dict:
    findings = evaluate(ts, today)
    if any(f.severity is Severity.BLOCKER for f in findings):
        raise Blocked(findings)
    draft = assemble(ts)
    text = draft.text()
    doc_hash = sha256_hex(text)
    params: EscrowParams | None = None
    if ts.agreement_type.value == "service" and ts.escrow.enabled:
        params = bind(derive_params(ts), doc_hash)
    checks = verify(ts, text, params, onchain)
    clauses = draft.numbered()
    return {
        "title": draft.title,
        "findings": [f.model_dump(mode="json") for f in findings],
        "clauses": clauses,
        "text": text,
        "document_hash": doc_hash,
        "terms_hash": terms_hash(ts),
        "escrow": None if params is None else {
            "params": params.as_dict(),
            "constructor_args": params.constructor_args(),
            "clause_map": clause_map(clauses),
        },
        "verification": summary(checks),
    }
