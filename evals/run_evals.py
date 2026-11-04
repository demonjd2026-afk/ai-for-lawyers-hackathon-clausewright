"""Clausewright evaluation suite. Writes evals/RESULTS.md.

  cd backend && .venv/bin/python ../evals/run_evals.py           # offline evals
  ANTHROPIC_API_KEY=... .venv/bin/python ../evals/run_evals.py   # + LLM intake eval

Offline evals are deterministic and run in CI. The intake eval calls the model and
measures field accuracy, hallucination rejections and prompt-injection resistance.
"""

from __future__ import annotations

import json
import sys
import time
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))

from app.agents import reviewer  # noqa: E402
from app.config import settings  # noqa: E402
from app.models import TermSheet  # noqa: E402
from app.pipeline import Blocked, build  # noqa: E402

TODAY = date(2026, 11, 3)
FIX = HERE.parent / "backend" / "tests" / "fixtures"


def reviewer_eval() -> dict:
    rows = [json.loads(x) for x in (HERE / "reviewer_corpus.jsonl").read_text().splitlines() if x.strip()]
    tp, fp, fn = Counter(), Counter(), Counter()
    misses = []
    for r in rows:
        got = {i["rule_id"] for i in reviewer.deterministic([r["text"]])}
        exp = set(r["expect"])
        for k in got & exp:
            tp[k] += 1
        for k in got - exp:
            fp[k] += 1
            misses.append(("false positive", k, r["text"]))
        for k in exp - got:
            fn[k] += 1
            misses.append(("missed", k, r["text"]))
    labels = sorted(set(tp) | set(fp) | set(fn))
    per = {}
    for k in labels:
        p = tp[k] / (tp[k] + fp[k]) if tp[k] + fp[k] else 1.0
        rc = tp[k] / (tp[k] + fn[k]) if tp[k] + fn[k] else 1.0
        per[k] = (p, rc, tp[k] + fn[k])
    T, F, N = sum(tp.values()), sum(fp.values()), sum(fn.values())
    return {"n": len(rows), "precision": T / (T + F) if T + F else 1.0, "recall": T / (T + N) if T + N else 1.0,
            "per": per, "misses": misses}


def mutation_eval() -> dict:
    import pytest

    t0 = time.time()
    code = pytest.main(["-q", "-p", "no:cacheprovider", str(HERE.parent / "backend" / "tests" /
                                                         "test_verifier_mutations.py")])
    from tests.test_verifier_mutations import ONCHAIN_MUTATIONS, TEXT_MUTATIONS

    return {"mutations": len(TEXT_MUTATIONS) + len(ONCHAIN_MUTATIONS) + 7, "all_detected": code == 0,
            "seconds": round(time.time() - t0, 1)}


def compliance_eval() -> dict:
    """Seeded defects that must be blocked or fixed before a draft is produced."""
    base = json.loads((FIX / "freelance_msme.json").read_text())
    cases = {
        "90-day payment to a micro supplier": {"payment_days": 90},
        "30-day acceptance window (MSE)": {"acceptance_days": 30},
        "2-year post-term non-compete": {"non_compete_months_after_term": 24},
        "Client appoints the sole arbitrator": {"arbitration": {**base["arbitration"], "appointment": "unilateral"}},
        "Arbiter wallet = client wallet": {"escrow": {**base["escrow"], "arbiter_wallet": base["client"]["wallet"]}},
        "Milestone due before start": {"milestones": [{**base["milestones"][0], "due_date": "2026-11-01"}]},
    }
    out = {}
    for name, ch in cases.items():
        try:
            build(TermSheet.model_validate({**base, **ch}), TODAY)
            out[name] = False
        except Blocked:
            out[name] = True
    return out


def intake_eval() -> dict | None:
    if not settings.llm_enabled:
        return None
    from app.agents import intake

    rows = [json.loads(x) for x in (HERE / "intake_golden.jsonl").read_text().splitlines() if x.strip()]
    correct = total = 0
    detail = []
    for r in rows:
        out = intake.run(r["messages"], TODAY)
        ts = out["term_sheet"] or out["partial"]
        for path, want in r["expect"].items():
            node = ts
            for p in path.split("."):
                node = (node[int(p)] if p.isdigit() and isinstance(node, list) and len(node) > int(p) else
                        node.get(p) if isinstance(node, dict) else None)
                if node is None:
                    break
            if path in ("payment_days", "non_compete_months_after_term") and want is None:
                ok = node in (None, 0) or (path == "payment_days" and node <= 45)
            else:
                ok = node == want
            correct += ok
            total += 1
            if not ok:
                detail.append(f"{r['id']}: {path} expected {want!r} got {node!r}")
    return {"cases": len(rows), "field_accuracy": correct / total, "fields": total, "errors": detail}


def main() -> None:
    rv = reviewer_eval()
    mu = mutation_eval()
    co = compliance_eval()
    it = intake_eval()
    lines = [
        "# Clausewright eval results", "",
        f"Run: {datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime('%Y-%m-%d %H:%M IST')}", "",
        "## 1. Clause-code verifier: mutation testing", "",
        f"{mu['mutations']} seeded inconsistencies between term sheet, contract prose, Schedule B and the deployed "
        f"escrow (wrong figure, wrong words, swapped wallet, stale hash, dropped milestone, inserted non-compete).", "",
        f"**Detected: {'all' if mu['all_detected'] else 'NOT ALL'}** ({mu['seconds']} s)", "",
        "## 2. Compliance gate: seeded legal defects", "",
        "| Defect | Blocked before drafting |", "|---|---|",
        *[f"| {k} | {'yes' if v else 'NO'} |" for k, v in co.items()], "",
        "## 3. Contract reviewer (rule layer): labelled clause corpus", "",
        f"{rv['n']} clauses, including near-miss negatives (in-term restraints, mutual appointment, capped LD).", "",
        f"**Precision {rv['precision']:.0%} · Recall {rv['recall']:.0%}**", "",
        "| Red flag | Precision | Recall | Positives |", "|---|---|---|---|",
        *[f"| {k} | {p:.0%} | {r:.0%} | {n} |" for k, (p, r, n) in rv["per"].items()], "",
    ]
    if rv["misses"]:
        lines += ["Errors:", "", *[f"- {kind}: `{k}`: {t[:110]}" for kind, k, t in rv["misses"]], ""]
    lines += ["## 4. On-chain end to end", "",
              "Run separately with `evals/run_onchain_e2e.sh`: deploys the real escrow from API output to a local chain, "
              "verifies chain against prose against terms, runs acknowledge, fund, deliver, deemed acceptance and "
              "withdraw, and confirms a tampered deployment and a wrong document hash are rejected.", ""]
    lines += ["## 5. AI intake (LLM): golden conversations", ""]
    if it is None:
        lines += ["Not run: set ANTHROPIC_API_KEY to evaluate field accuracy and prompt-injection resistance.", ""]
    else:
        lines += [f"{it['cases']} conversations, {it['fields']} graded fields (one is a prompt-injection attempt).", "",
                  f"**Field accuracy {it['field_accuracy']:.0%}**", "", *[f"- {e}" for e in it["errors"]], ""]
    (HERE / "RESULTS.md").write_text("\n".join(lines))
    print("\n".join(lines))
    ok = mu["all_detected"] and all(co.values()) and rv["recall"] >= 0.9 and rv["precision"] >= 0.9
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
