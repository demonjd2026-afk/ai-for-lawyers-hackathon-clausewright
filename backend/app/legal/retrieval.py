"""BM25 retrieval over the knowledge base (pure Python, no external index).

Used to ground the reviewer agent: each clause is shown only the authorities most relevant
to it, and the agent may cite only those ids.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from functools import lru_cache

from app.legal.kb import KB

_STOP = frozenset({
    "a", "an", "and", "any", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is", "it", "its",
    "may", "not", "of", "on", "or", "shall", "such", "that", "the", "this", "to", "under", "with", "without",
    "within", "which", "who", "whom", "will",
})
# Lightweight legal synonym expansion so lay wording hits statutory wording.
_SYN = {
    "noncompete": ["restraint", "trade", "profession", "business"],
    "compete": ["restraint", "trade", "business"],
    "competitor": ["restraint", "trade"],
    "penalty": ["compensation", "sum", "breach"],
    "arbitrator": ["arbitration", "appointment"],
    "msme": ["micro", "small", "enterprise"],
    "invoice": ["payment", "buyer", "supplier"],
    "privacy": ["personal", "data"],
    "ip": ["copyright", "assignment"],
    "esign": ["electronic", "signature"],
    "stamp": ["duty", "instrument"],
}


def tokens(text: str) -> list[str]:
    raw = [t for t in re.findall(r"[a-z0-9]+", text.lower().replace("non-compete", "noncompete")) if t not in _STOP]
    out = []
    for t in raw:
        t = t[:-1] if len(t) > 4 and t.endswith("s") else t
        out.append(t)
        out.extend(_SYN.get(t, []))
    return out


class BM25:
    def __init__(self, docs: dict[str, str], k1: float = 1.4, b: float = 0.75):
        self.ids = list(docs)
        self.tf = [Counter(tokens(docs[i])) for i in self.ids]
        self.len = [sum(c.values()) for c in self.tf]
        self.avg = sum(self.len) / len(self.len)
        df = Counter(t for c in self.tf for t in c)
        n = len(self.ids)
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}
        self.k1, self.b = k1, b

    def search(self, query: str, k: int = 5) -> list[tuple[str, float]]:
        q = tokens(query)
        scores = []
        for i, tf in enumerate(self.tf):
            s = 0.0
            for t in q:
                if t in tf:
                    f = tf[t]
                    s += self.idf[t] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg))
            if s > 0:
                scores.append((self.ids[i], s))
        return sorted(scores, key=lambda x: -x[1])[:k]


@lru_cache(maxsize=1)
def index() -> BM25:
    return BM25({a.id: f"{a.authority} {a.provision} {a.summary}" for a in KB.values()})
