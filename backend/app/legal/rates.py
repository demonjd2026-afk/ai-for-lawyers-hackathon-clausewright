"""Time-varying legal values, each with its source and verification status.

Contract text never embeds these numbers (it says "three times the bank rate"), so a draft
stays correct when RBI moves rates; the calculators below apply the rate in force on each day.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from fractions import Fraction
from typing import Literal

from app.models import IndianState, MsmeCategory

Status = Literal["verified", "secondary"]


@dataclass(frozen=True)
class RatePoint:
    effective_from: date
    bps: int  # basis points; 575 == 5.75%
    source: str
    status: Status


# Only dates we can source. The calculator refuses periods before the first entry rather
# than guess, and accepts an explicit override for older invoices.
BANK_RATE_HISTORY: tuple[RatePoint, ...] = (
    RatePoint(
        date(2026, 10, 7), 575,
        "RBI Bank Rate after the 7 Oct 2026 MPC (PR 2026-2027/1264), per TaxClue and CorpLawUpdates summaries",
        "secondary",
    ),
)


class RateUnavailable(ValueError):
    pass


def bank_rate_on(d: date) -> RatePoint:
    applicable = [r for r in BANK_RATE_HISTORY if r.effective_from <= d]
    if not applicable:
        raise RateUnavailable(
            f"No sourced Bank Rate for {d.isoformat()}; earliest on file is "
            f"{BANK_RATE_HISTORY[0].effective_from.isoformat()}. Enter the Bank Rate that applied before then."
        )
    return max(applicable, key=lambda r: r.effective_from)


@dataclass(frozen=True)
class InterestPeriod:
    start: date
    end: date
    annual_rate_pct: str
    opening_paise: int
    closing_paise: int


@dataclass(frozen=True)
class InterestResult:
    principal_paise: int
    interest_paise: int
    total_paise: int
    interest_from: date
    interest_to: date
    days_late: int
    periods: tuple[InterestPeriod, ...]
    rate_sources: tuple[str, ...]
    convention: str


def _add_month(d: date) -> date:
    y, m = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    for day in (d.day, 30, 29, 28):  # clamp 31 Jan -> 28/29 Feb
        try:
            return date(y, m, day)
        except ValueError:
            continue
    raise ValueError("unreachable")


def _round_half_up(x: Fraction) -> int:
    return int(x + Fraction(1, 2)) if x >= 0 else -int(-x + Fraction(1, 2))


def msmed_interest(principal_paise: int, due_date: date, paid_on: date,
                   bank_rate_override_pct: Fraction | None = None) -> InterestResult:
    """Compound interest with monthly rests at 3x the Bank Rate (MSMED Act s.16).

    Interest runs from the day after the agreed (or appointed) due date. Each monthly rest
    capitalises interest; a final broken month accrues simple interest on the capitalised
    balance for its actual days over 365. The rate in force at the start of each monthly
    rest applies to that rest. A caller-supplied Bank Rate is used only for rests that start
    before the sourced history. Exact rational arithmetic; one rounding at the end.
    """
    if principal_paise <= 0:
        raise ValueError("principal must be positive")
    start = due_date + timedelta(days=1)
    if paid_on < start:
        return InterestResult(principal_paise, 0, principal_paise, start, paid_on, 0, (), (), _CONVENTION)

    balance = Fraction(principal_paise)
    periods, sources = [], []
    cur = start
    while cur <= paid_on:
        try:
            rp = bank_rate_on(cur)
            annual = Fraction(3 * rp.bps, 10_000)
            src = f"{rp.bps / 100:.2f}% from {rp.effective_from.isoformat()} ({rp.status}): {rp.source}"
        except RateUnavailable:
            if bank_rate_override_pct is None:
                raise
            annual = Fraction(3) * Fraction(bank_rate_override_pct) / 100
            src = f"user-supplied Bank Rate {float(bank_rate_override_pct):.2f}% for days before {BANK_RATE_HISTORY[0].effective_from.isoformat()}"
        if src not in sources:
            sources.append(src)
        nxt = _add_month(cur)
        opening = balance
        if nxt - timedelta(days=1) <= paid_on:  # full monthly rest
            balance *= 1 + annual / 12
            end = nxt - timedelta(days=1)
        else:  # broken period
            n = (paid_on - cur).days + 1
            balance *= 1 + annual * n / 365
            end = paid_on
        periods.append(InterestPeriod(cur, end, f"{float(annual * 100):.2f}", _round_half_up(opening),
                                      _round_half_up(balance)))
        cur = end + timedelta(days=1)

    total = _round_half_up(balance)
    return InterestResult(
        principal_paise, total - principal_paise, total, start, paid_on, (paid_on - due_date).days,
        tuple(periods), tuple(sources), _CONVENTION,
    )


_CONVENTION = (
    "Compound interest with monthly rests at three times the RBI Bank Rate (MSMED Act s.16), from the day after "
    "the due date; final broken month on actual/365. Rate applied is the one in force at the start of each rest."
)


# ----------------------------------------------------------------- MSME classification

_CRORE = 10_000_000 * 100  # paise
MSME_THRESHOLDS = (  # (category, max investment, max turnover) from 1 Apr 2025, S.O. 1364(E)
    (MsmeCategory.MICRO, Fraction(5, 2) * _CRORE, 10 * _CRORE),
    (MsmeCategory.SMALL, 25 * _CRORE, 100 * _CRORE),
    (MsmeCategory.MEDIUM, 125 * _CRORE, 500 * _CRORE),
)


def classify_msme(investment_paise: int, turnover_paise: int) -> MsmeCategory:
    """Both limits must be met; the composite test applies from 1 April 2025."""
    if investment_paise < 0 or turnover_paise < 0:
        raise ValueError("values must be non-negative")
    for cat, inv, turn in MSME_THRESHOLDS:
        if investment_paise <= inv and turnover_paise <= turn:
            return cat
    return MsmeCategory.NONE


# -------------------------------------------------------------------------- stamp duty


@dataclass(frozen=True)
class StampRate:
    state: IndianState
    article: str
    duty_paise: int
    effective_from: date
    source: str


# General "agreement not otherwise provided for". Only rates confirmed against the state
# amendment are listed; elsewhere the app says it has no verified figure.
STAMP_GENERAL_AGREEMENT: dict[IndianState, StampRate] = {
    IndianState.MAHARASHTRA: StampRate(
        IndianState.MAHARASHTRA, "Maharashtra Stamp Act, 1958, Sch. I Art. 5(h)(B)", 500_00, date(2024, 7, 31),
        "https://www.mondaq.com/india/constitutional-administrative-law/1536706/government-of-maharashtra-amends-the-maharashtra-stamp-act-1958",
    ),
    IndianState.TAMIL_NADU: StampRate(
        IndianState.TAMIL_NADU, "Indian Stamp Act, 1899 (TN), Sch. I Art. 5(j)", 200_00, date(2024, 5, 3),
        "https://www.jsalaw.com/newsletters-and-updates/recent-amendments-made-to-the-stamp-duty-payable-on-various-instruments-in-tamil-nadu",
    ),
}


def stamp_advice(state: IndianState) -> dict:
    r = STAMP_GENERAL_AGREEMENT.get(state)
    if r:
        return {
            "state": state.value, "verified": True, "duty_paise": r.duty_paise, "article": r.article,
            "effective_from": r.effective_from.isoformat(), "source": r.source,
        }
    return {
        "state": state.value, "verified": False, "duty_paise": None,
        "message": f"Clausewright has no verified general-agreement rate for {state.value}. Check the state's "
                   "e-stamping portal (SHCIL in most states) before signing; an under-stamped agreement is "
                   "inadmissible until duty and up to ten times penalty are paid.",
        "source": "https://www.shcilestamp.com/",
    }
