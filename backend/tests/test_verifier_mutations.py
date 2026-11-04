"""Mutation testing for the clause<->code verifier.

Each mutation simulates a real failure mode (an LLM or a person editing one copy of a
number, a swapped wallet, a stale deployment). The verifier must catch every one.
"""

import re

import pytest

from app.codegen.escrow import EscrowParams, MilestoneArg
from app.pipeline import build
from app.verify.consistency import summary, verify
from tests.conftest import TODAY, ts

BASE = ts("freelance_msme")
R = build(BASE, TODAY)
TEXT = R["text"]
P = EscrowParams(**{**R["escrow"]["params"],
                    "milestones": tuple(MilestoneArg(**m) for m in R["escrow"]["params"]["milestones"])})
ONCHAIN = {
    "documentHash": P.document_hash, "termsHash": P.terms_hash, "token": P.token, "payer": P.payer,
    "payee": P.payee, "arbiter": P.arbiter, "acceptanceWindow": str(P.acceptance_window_s),
    "fundingDeadline": str(P.funding_deadline), "msmeMode": P.msme_mode, "totalAmount": str(P.total),
    "milestones": [{"amount": str(m.amount), "dueDate": str(m.due_date)} for m in P.milestones],
}

TEXT_MUTATIONS = {
    "fee figure in schedule": ("| ₹1,50,000.00 |", "| ₹1,50,000.01 |"),
    "fee words in schedule": ("| Rupees One Lakh Fifty Thousand Only |", "| Rupees One Lakh Five Thousand Only |"),
    "total figure in clause": ("total fee of ₹6,00,000.50", "total fee of ₹6,00,005.00"),
    "total words in clause": ("(Rupees Six Lakh and Fifty Paise Only), payable", "(Rupees Sixty Lakh and Fifty Paise Only), payable"),
    "acceptance days figure": ("within ten (10) days of delivery", "within ten (30) days of delivery"),
    "acceptance days both": ("within ten (10) days of delivery", "within thirty (30) days of delivery"),
    "payment days": ("within thirty (30) days of its acceptance", "within sixty (60) days of its acceptance"),
    "due date row": ("| 1 December 2026 |", "| 8 December 2026 |"),
    "dropped milestone row": (re.compile(r"\| 3 \| Launch .*\n"), ""),
    "schedule B payee": ("| Payee (Service Provider) wallet | 0x2222222222222222222222222222222222222222 |",
                         "| Payee (Service Provider) wallet | 0x2222222222222222222222222222222222222223 |"),
    "schedule B amount": ("| 15000000 / ", "| 15000001 / "),
    "schedule B window": ("| 864000 seconds", "| 1296000 seconds"),
    "party name": ("**Pixelnest Studio**", "**Pixelnest Studios**"),
    "non-compete inserted": ("## 10. Liability", "## 10. Non-Compete\n\nNo competition.\n\n## 11. Liability"),
}


def _mutate(text, rule):
    old, new = rule
    out = old.sub(new, text, count=1) if isinstance(old, re.Pattern) else text.replace(old, new, 1)
    assert out != text, f"mutation did not apply: {old!r}"
    return out


def test_baseline_passes():
    s = summary(verify(BASE, TEXT, P, ONCHAIN))
    assert s["ok"], s["failed"]
    assert s["total"] >= 60


@pytest.mark.parametrize("name", list(TEXT_MUTATIONS))
def test_text_mutation_detected(name):
    mutated = _mutate(TEXT, TEXT_MUTATIONS[name])
    # the hash in params no longer matches either, but the check must also localise the
    # semantic disagreement, so verify against params re-bound to the mutated text
    from app.codegen.escrow import bind
    from app.drafting.engine import sha256_hex

    s = summary(verify(BASE, mutated, bind(P, sha256_hex(mutated)), None))
    assert not s["ok"], f"undetected: {name}"


ONCHAIN_MUTATIONS = {
    "payee": ("payee", "0x2222222222222222222222222222222222222229"),
    "arbiter": ("arbiter", "0x1111111111111111111111111111111111111111"),
    "document hash": ("documentHash", "0x" + "0" * 64),
    "terms hash": ("termsHash", "0x" + "1" * 64),
    "window": ("acceptanceWindow", "1296000"),
    "funding deadline": ("fundingDeadline", "1"),
    "msme off": ("msmeMode", False),
    "total": ("totalAmount", "1"),
    "token": ("token", "0x0000000000000000000000000000000000000001"),
}


@pytest.mark.parametrize("name", list(ONCHAIN_MUTATIONS))
def test_onchain_mutation_detected(name):
    key, value = ONCHAIN_MUTATIONS[name]
    s = summary(verify(BASE, TEXT, P, {**ONCHAIN, key: value}))
    assert not s["ok"], f"undetected: {name}"


def test_onchain_milestone_mutations_detected():
    for i in range(3):
        for field, value in (("amount", "1"), ("dueDate", "1")):
            ms = [dict(m) for m in ONCHAIN["milestones"]]
            ms[i][field] = value
            assert not summary(verify(BASE, TEXT, P, {**ONCHAIN, "milestones": ms}))["ok"]
    assert not summary(verify(BASE, TEXT, P, {**ONCHAIN, "milestones": ONCHAIN["milestones"][:2]}))["ok"]


def test_case_insensitive_addresses_accepted():
    s = summary(verify(BASE, TEXT, P, {**ONCHAIN, "payee": ONCHAIN["payee"].upper().replace("0X", "0x")}))
    assert s["ok"]
