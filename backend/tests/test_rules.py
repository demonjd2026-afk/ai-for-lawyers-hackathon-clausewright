from datetime import date

import pytest

from app.compliance.rules import apply_autofixes, evaluate
from app.models import Severity
from tests.conftest import TODAY, ts


def ids(t, sev=None):
    return {f.rule_id for f in evaluate(t, TODAY) if sev is None or f.severity is sev}


def blockers(t):
    return ids(t, Severity.BLOCKER)


def test_clean_fixtures_have_no_blockers():
    for name in ("freelance_msme", "nda_mutual", "appointment_fte"):
        assert blockers(ts(name)) == set(), name


@pytest.mark.parametrize(
    ("changes", "rule"),
    [
        ({"payment_days": 46}, "MSMED-15-45DAY"),
        ({"acceptance_days": 16}, "MSMED-2B-15DAY"),
        ({"non_compete_months_after_term": 6}, "ICA-27-NONCOMPETE"),
        ({"arbitration__appointment": "unilateral"}, "ACA-UNILATERAL"),
        ({"arbitration__seat_city": None}, "ACA-SEAT"),
        ({"arbitration__appointment": "institution"}, "ACA-INSTITUTION"),
        ({"escrow__arbiter_wallet": "0x1111111111111111111111111111111111111111"}, "ESCROW-NEUTRAL"),
        ({"milestones__0__due_date": "2026-11-01"}, "DATES-BEFORE-START"),
        ({"arbitration__enabled": False}, "ESCROW-NO-ARB"),
        ({"provider__wallet": None}, "ESCROW-WALLET"),
    ],
)
def test_blockers(changes, rule):
    assert rule in blockers(ts("freelance_msme", **changes))


def test_boundaries_are_exact():
    assert "MSMED-15-45DAY" not in blockers(ts("freelance_msme", payment_days=45))
    assert "MSMED-2B-15DAY" not in blockers(ts("freelance_msme", acceptance_days=15))


def test_medium_enterprise_not_capped():
    t = ts("freelance_msme", provider__msme_category="medium", payment_days=90, acceptance_days=30,
           escrow__enabled=False)
    assert "MSMED-15-45DAY" not in ids(t)
    assert "MSMED-MEDIUM" in ids(t)


def test_warnings():
    assert "MSMED-UDYAM" in ids(ts("freelance_msme", provider__udyam_number=None))
    assert "MSMED-UDYAM-LATE" in ids(ts("freelance_msme", provider__udyam_registration_date="2026-12-01"))
    assert "GST-UNREGISTERED" in ids(ts("freelance_msme", provider__gstin=None))
    assert "ICA-27-NONSOLICIT" in ids(ts("freelance_msme", non_solicit_months_after_term=18))
    assert "LIABILITY-UNCAPPED" in ids(ts("freelance_msme", liability_cap_multiple=None))
    assert "COPYRIGHT-19-6" in ids(ts("freelance_msme", ip_assignment_worldwide=False))
    assert "COPYRIGHT-19-5" in ids(ts("freelance_msme", ip_assignment_full_term=False))
    assert "DPDP-8-UNDECLARED" in ids(ts("freelance_msme", processes_personal_data=False))
    assert "ICA-74-LD" in ids(ts("freelance_msme", liquidated_damages_pct_per_week=5))


def test_minor_individual_blocks():
    assert "ICA-11-MINOR" in blockers(ts("nda_mutual", provider__is_adult_confirmed=False))


def test_employment_rules():
    a = ts("appointment_fte")
    assert {"WAGES-50", "FTE-PARITY", "OSH-APPOINTMENT"} <= ids(a)
    assert "OSH-HOURS" in blockers(ts("appointment_fte", employment__weekly_hours=54))
    assert "EMP-MINOR" in blockers(ts("appointment_fte", employment__employee_date_of_birth="2009-12-02"))
    # turns 18 exactly on joining day: allowed
    assert "EMP-MINOR" not in blockers(ts("appointment_fte", employment__employee_date_of_birth="2008-12-01"))
    balanced = ts("appointment_fte", employment__basic=2200000, employment__other_allowances=700000)
    assert "WAGES-50" not in ids(balanced)


def test_wage_addback_arithmetic():
    e = ts("appointment_fte").employment
    assert e.gross == 4_000_000
    assert e.excluded == 2_200_000
    assert e.deemed_wages == 2_000_000  # 18,000 + (22,000 - 20,000)


def test_autofix_clears_fixable_blockers():
    bad = ts("freelance_msme", payment_days=90, acceptance_days=30, non_compete_months_after_term=12,
             arbitration__appointment="unilateral")
    assert len(blockers(bad)) >= 4
    fixed = apply_autofixes(bad, evaluate(bad, TODAY))
    assert blockers(fixed) == set()
    assert (fixed.payment_days, fixed.acceptance_days, fixed.non_compete_months_after_term) == (45, 15, 0)


def test_every_finding_cites_known_authorities():
    from app.legal.kb import KB

    provisions = {(a.authority, a.provision) for a in KB.values()}
    bad = ts("freelance_msme", payment_days=90, non_compete_months_after_term=3, arbitration__appointment="unilateral")
    for f in evaluate(bad, TODAY) + evaluate(ts("appointment_fte"), TODAY):
        for c in f.citations:
            assert (c.authority, c.provision) in provisions


def test_past_due_date_blocks_only_with_escrow():
    t = ts("freelance_msme", effective_date="2026-10-01", milestones__0__due_date="2026-10-20")
    assert "DATES-PAST" in blockers(t)
    t2 = ts("freelance_msme", effective_date="2026-10-01", milestones__0__due_date="2026-10-20",
            escrow__enabled=False)
    assert "DATES-PAST" not in blockers(t2)
    assert "DATES-PAST" in ids(t2)


def test_today_default_is_used():
    assert evaluate(ts("nda_mutual"))  # runs with real date without error
    assert isinstance(TODAY, date)
