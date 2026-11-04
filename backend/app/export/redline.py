"""Clause-aware redline between two versions of a contract.

Clauses are matched by heading (numbers ignored, so inserting a clause does not mark every
later clause as changed), then diffed word by word.
"""

from __future__ import annotations

import difflib
import re

_HEAD = re.compile(r"^## (?:\d+\. )?(.+)$", re.M)


def _clauses(text: str) -> dict[str, str]:
    parts = _HEAD.split(text)
    return {parts[i].strip(): parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}


def _words(s: str) -> list[str]:
    return re.findall(r"\S+|\n", s)


def word_ops(a: str, b: str) -> list[dict]:
    wa, wb = _words(a), _words(b)
    ops = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=wa, b=wb, autojunk=False).get_opcodes():
        if tag == "equal":
            ops.append({"op": "eq", "text": " ".join(wa[i1:i2])})
        else:
            if i2 > i1:
                ops.append({"op": "del", "text": " ".join(wa[i1:i2])})
            if j2 > j1:
                ops.append({"op": "ins", "text": " ".join(wb[j1:j2])})
    return ops


def redline(old: str, new: str) -> dict:
    a, b = _clauses(old), _clauses(new)
    order = list(b) + [h for h in a if h not in b]
    clauses, changed = [], 0
    for h in order:
        if h not in a:
            status, ops = "added", [{"op": "ins", "text": b[h]}]
        elif h not in b:
            status, ops = "removed", [{"op": "del", "text": a[h]}]
        elif a[h] == b[h]:
            status, ops = "unchanged", [{"op": "eq", "text": b[h]}]
        else:
            status, ops = "modified", word_ops(a[h], b[h])
        changed += status != "unchanged"
        clauses.append({"heading": h, "status": status, "ops": ops})
    return {"changed": changed, "total": len(clauses), "clauses": clauses}
