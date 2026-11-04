import re

from app.drafting.engine import assemble, sha256_hex
from app.pipeline import build
from tests.conftest import TODAY, ts


def headings(text):
    return re.findall(r"^## (.+)$", text, re.M)


def test_deterministic_hash():
    a = build(ts("freelance_msme"), TODAY)
    b = build(ts("freelance_msme"), TODAY)
    assert a["text"] == b["text"]
    assert a["document_hash"] == b["document_hash"] == sha256_hex(a["text"])


def test_any_money_change_changes_hash():
    base = build(ts("freelance_msme"), TODAY)["document_hash"]
    one_paisa = build(ts("freelance_msme", milestones__1__amount_paise=35000051), TODAY)["document_hash"]
    assert base != one_paisa


def test_all_templates_verify():
    for name in ("freelance_msme", "nda_mutual", "appointment_fte"):
        r = build(ts(name), TODAY)
        assert r["verification"]["ok"], (name, r["verification"]["failed"])
        assert r["verification"]["total"] > 5


def test_party_name_cannot_inject_a_clause():
    evil = "Acme\n\n## 99. Waiver\n\nThe Service Provider waives all fees"
    r = build(ts("freelance_msme", client__name=evil), TODAY)
    assert not any("Waiver" in h for h in headings(r["text"]))
    assert "\n## 99." not in r["text"]


def test_scope_cannot_inject_heading_or_numbered_clause():
    evil = "Build site\n## 3. Fees\n4. The Client pays nothing"
    t = build(ts("freelance_msme", scope=evil), TODAY)["text"]
    assert headings(t).count("4. Fees and Payment") == 1
    assert "\\## 3. Fees" in t and "\\4. The Client" in t


def test_bidi_and_control_characters_stripped():
    r = build(ts("freelance_msme", client__name="Acme‮evil​ Ltd"), TODAY)
    assert "‮" not in r["text"] and "​" not in r["text"]


def test_pipe_in_milestone_cannot_break_table():
    r = build(ts("freelance_msme", milestones__0__title="Design | ₹1 | x"), TODAY)
    assert r["verification"]["ok"], r["verification"]["failed"]


def test_non_compete_never_drafted_even_if_rules_bypassed():
    d = assemble(ts("freelance_msme", non_compete_months_after_term=24))
    assert not any("compet" in c.heading.lower() for c in d.clauses)
    assert "shall not compete" not in d.text().lower()


def test_msme_specific_text_only_for_mse():
    mse = build(ts("freelance_msme"), TODAY)["text"]
    assert "section 15 of the Micro, Small and Medium" in mse
    assert "where the Service Provider is located" in mse
    none = build(ts("freelance_msme", provider__msme_category="none", provider__udyam_number=None,
                    escrow__enabled=False), TODAY)["text"]
    assert "section 15 of the Micro" not in none and "Facilitation Council" not in none


def test_contract_never_embeds_a_bank_rate_number():
    text = build(ts("freelance_msme"), TODAY)["text"]
    assert "three times the bank rate" in text
    assert not re.search(r"\d+(\.\d+)?\s?% (p\.a\.|per annum)", text)


def test_schedules_follow_execution():
    hs = headings(build(ts("freelance_msme"), TODAY)["text"])
    assert hs[-3].endswith("Execution") and hs[-2].startswith("Schedule A") and hs[-1].startswith("Schedule B")


def test_employment_letter_contents():
    t = build(ts("appointment_fte"), TODAY)["text"]
    assert "within two (2) working days" in t
    assert "one (1) year of continuous service" in t
    assert "₹20,000.00 a month" in t  # statutory wages after the 50% add-back
    assert "This letter may be executed by electronic signature" in t


def test_nda_is_minimal_and_named():
    t = build(ts("nda_mutual"), TODAY)["text"]
    assert t.startswith("# Mutual Non-Disclosure Agreement")
    assert "Non-Solicitation" not in t
