import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.models import MAX_PAISE
from app.money import (
    format_inr,
    group_indian,
    inr_in_words,
    int_to_indian_words,
    parse_amount_expression,
    parse_inr_figure,
    parse_inr_words,
)

paise = st.integers(min_value=1, max_value=MAX_PAISE)


@given(paise)
def test_figure_round_trip(p):
    assert parse_inr_figure(format_inr(p)) == p


@given(paise)
def test_words_round_trip(p):
    assert parse_inr_words(inr_in_words(p)) == p


@given(st.integers(min_value=0, max_value=10**15))
def test_grouping_is_indian(n):
    g = group_indian(n)
    assert int(g.replace(",", "")) == n
    parts = g.split(",")
    assert len(parts[-1]) == 3 or len(parts) == 1
    assert all(len(x) == 2 for x in parts[1:-1])


@pytest.mark.parametrize(
    ("n", "words"),
    [
        (0, "Zero"),
        (15, "Fifteen"),
        (45, "Forty-Five"),
        (100_000, "One Lakh"),
        (12_34_56_789, "Twelve Crore Thirty-Four Lakh Fifty-Six Thousand Seven Hundred Eighty-Nine"),
        (1000_00_00_000, "One Thousand Crore"),
    ],
)
def test_known_words(n, words):
    assert int_to_indian_words(n) == words


@pytest.mark.parametrize(
    ("expr", "paise"),
    [
        ("₹1.5 lakh", 1_50_000_00),
        ("Rs. 3,50,000.50", 3_50_000_50),
        ("2 cr", 2_00_00_000_00),
        ("50k", 50_000_00),
        ("INR 750", 750_00),
        ("12.345 lakh", 12_34_500_00),
        ("40,000/-", 40_000_00),
    ],
)
def test_amount_expressions(expr, paise):
    assert parse_amount_expression(expr) == paise


@pytest.mark.parametrize("bad", ["", "lakh", "1.0001", "0", "-5", "1e5", "one lakh", "₹ 1,00,000 crore lakh"])
def test_amount_expression_rejects(bad):
    with pytest.raises(ValueError):
        parse_amount_expression(bad)


@pytest.mark.parametrize("bad", ["₹1,00,00.00", "₹100000.00", "1,000.00", "₹1,000.0"])
def test_figure_rejects_malformed_grouping(bad):
    with pytest.raises(ValueError):
        parse_inr_figure(bad)
