from datetime import date
from fractions import Fraction

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.legal.rates import (
    RateUnavailable,
    _add_month,
    classify_msme,
    msmed_interest,
    stamp_advice,
)
from app.models import IndianState, MsmeCategory

CR = 10_000_000 * 100


def test_no_interest_when_paid_on_due_date():
    r = msmed_interest(100_000_00, date(2026, 11, 1), date(2026, 11, 1))
    assert r.interest_paise == 0


def test_one_full_month_matches_closed_form():
    # 3 x 5.75% = 17.25% p.a.; one monthly rest = 1.4375%
    r = msmed_interest(100_000_00, date(2026, 10, 31), date(2026, 11, 30))
    assert r.interest_paise == 143_750
    assert len(r.periods) == 1


def test_three_months_compound():
    r = msmed_interest(100_000_00, date(2026, 10, 31), date(2027, 1, 31))
    expected = round(100_000_00 * (1 + Fraction(1725, 120000)) ** 3) - 100_000_00
    assert r.interest_paise == expected


def test_override_only_fills_the_gap_before_history():
    r = msmed_interest(100_000_00, date(2026, 9, 6), date(2026, 11, 6), bank_rate_override_pct=Fraction(11, 2))
    assert [p.annual_rate_pct for p in r.periods] == ["16.50", "17.25"]
    assert len(r.rate_sources) == 2


def test_rate_history_refuses_to_guess():
    with pytest.raises(RateUnavailable):
        msmed_interest(1000, date(2026, 6, 1), date(2026, 8, 1))
    r = msmed_interest(1000_00, date(2026, 6, 1), date(2026, 8, 1), bank_rate_override_pct=Fraction(11, 2))
    assert r.interest_paise > 0 and "user-supplied" in r.rate_sources[0]


@given(st.integers(1, 10**12), st.integers(0, 2000), st.integers(0, 2000))
def test_interest_monotonic(principal, d1, d2):
    due = date(2026, 10, 7)
    a, b = sorted((d1, d2))
    ra = msmed_interest(principal, due, date.fromordinal(due.toordinal() + a))
    rb = msmed_interest(principal, due, date.fromordinal(due.toordinal() + b))
    assert 0 <= ra.interest_paise <= rb.interest_paise


def test_month_clamp():
    assert _add_month(date(2027, 1, 31)) == date(2027, 2, 28)
    assert _add_month(date(2028, 1, 31)) == date(2028, 2, 29)
    assert _add_month(date(2026, 12, 15)) == date(2027, 1, 15)


@pytest.mark.parametrize(
    ("inv", "turn", "cat"),
    [
        (int(2.5 * CR), 10 * CR, MsmeCategory.MICRO),
        (int(2.5 * CR) + 1, 10 * CR, MsmeCategory.SMALL),
        (CR, 11 * CR, MsmeCategory.SMALL),
        (25 * CR, 100 * CR, MsmeCategory.SMALL),
        (26 * CR, 100 * CR, MsmeCategory.MEDIUM),
        (125 * CR, 500 * CR, MsmeCategory.MEDIUM),
        (125 * CR, 501 * CR, MsmeCategory.NONE),
    ],
)
def test_msme_classification(inv, turn, cat):
    assert classify_msme(inv, turn) is cat


def test_stamp_advice_only_asserts_verified_rates():
    assert stamp_advice(IndianState.MAHARASHTRA)["duty_paise"] == 500_00
    assert stamp_advice(IndianState.TAMIL_NADU)["duty_paise"] == 200_00
    for s in (IndianState.KARNATAKA, IndianState.DELHI, IndianState.TELANGANA, IndianState.ANDHRA_PRADESH):
        a = stamp_advice(s)
        assert a["verified"] is False and a["duty_paise"] is None
