import json

import pytest
from fastapi.testclient import TestClient

from app import main
from tests.conftest import load


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "_today", lambda: __import__("datetime").date(2026, 11, 3))
    main.api_limiter._hits.clear()
    main.llm_limiter._hits.clear()
    return TestClient(main.app)


def post(c, path, body):
    return c.post(path, json=body)


def test_draft_ok_and_headers(client):
    r = post(client, "/api/draft", {"term_sheet": load("freelance_msme")})
    assert r.status_code == 200
    d = r.json()
    assert d["verification"]["ok"] and d["escrow"]["constructor_args"][4] == d["document_hash"]
    for h in ("content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy"):
        assert h in r.headers
    assert r.headers["cache-control"] == "no-store"


def test_blocked_returns_409_with_findings(client):
    ts = load("freelance_msme") | {"payment_days": 120}
    r = post(client, "/api/draft", {"term_sheet": ts})
    assert r.status_code == 409
    assert r.json()["detail"]["findings"][0]["rule_id"] == "MSMED-15-45DAY"


def test_validation_does_not_echo_input(client):
    payload = "<script>alert(1)</script>"
    r = post(client, "/api/check", {"term_sheet": {"agreement_type": payload}})
    assert r.status_code == 422 and payload not in r.text


def test_extra_fields_rejected(client):
    ts = load("nda_mutual") | {"is_admin": True}
    assert post(client, "/api/check", {"term_sheet": ts}).status_code == 422


def test_client_cannot_submit_contract_text(client):
    body = {"term_sheet": load("nda_mutual"), "text": "# Evil"}
    assert post(client, "/api/draft", body).status_code == 422


def test_body_limit(client):
    r = client.post("/api/check", content=b"{" + b" " * 300_000 + b"}", headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_docx_export(client):
    r = post(client, "/api/export/docx", {"term_sheet": load("appointment_fte")})
    assert r.status_code == 200 and r.content[:2] == b"PK"
    assert "letter-of-appointment.docx" in r.headers["content-disposition"]


def test_redline(client):
    old = load("freelance_msme")
    new = json.loads(json.dumps(old)) | {"payment_days": 15}
    r = post(client, "/api/redline", {"old": old, "new": new}).json()
    assert r["changed"] >= 1 and any(c["heading"] == "Fees and Payment" and c["status"] == "modified"
                                     for c in r["clauses"])


def test_verify_with_onchain_mismatch(client):
    d = post(client, "/api/draft", {"term_sheet": load("freelance_msme")}).json()
    p = d["escrow"]["params"]
    onchain = {"documentHash": d["document_hash"], "termsHash": p["terms_hash"], "token": p["token"],
               "payer": p["payer"], "payee": p["payer"], "arbiter": p["arbiter"],
               "acceptanceWindow": p["acceptance_window_s"], "fundingDeadline": p["funding_deadline"],
               "msmeMode": p["msme_mode"], "totalAmount": p["total"],
               "milestones": [{"amount": m["amount"], "dueDate": m["due_date"]} for m in p["milestones"]]}
    v = post(client, "/api/verify", {"term_sheet": load("freelance_msme"), "onchain": onchain}).json()
    assert not v["verification"]["ok"]
    assert [f["id"] for f in v["verification"]["failed"]] == ["chain.payee"]


def test_interest_and_notice(client):
    r = post(client, "/api/interest", {"principal_paise": 10_000_000, "due_date": "2026-10-31",
                                       "paid_on": "2026-11-30"}).json()
    assert r["interest_paise"] == 143_750
    assert post(client, "/api/interest", {"principal_paise": 1, "due_date": "2026-01-01",
                                          "paid_on": "2026-02-01"}).status_code == 422
    sup, buy = load("freelance_msme")["provider"], load("freelance_msme")["client"]
    n = post(client, "/api/notice/demand", {"supplier": sup, "buyer": buy, "invoices": [
        {"number": "INV-1", "amount_paise": 10_000_000, "accepted_on": "2026-10-01", "agreed_days": 30}],
        "paid_on": "2026-12-31"})
    assert n.status_code == 200 and "section 16" in n.json()["text"]
    not_mse = post(client, "/api/notice/demand", {"supplier": buy, "buyer": sup, "invoices": [
        {"number": "INV-1", "amount_paise": 1, "accepted_on": "2026-10-01", "agreed_days": 30}]})
    assert not_mse.status_code == 422


def test_certificate(client):
    r = post(client, "/api/certificate", {"document_title": "NDA", "document_hash": "0x" + "a" * 64,
                                          "certifier_name": "A", "certifier_role": "Director"})
    assert r.status_code == 200 and "SHA256" in r.json()["text"]
    bad = post(client, "/api/certificate", {"document_title": "NDA", "document_hash": "0x" + "a" * 64,
                                            "certifier_name": "A", "certifier_role": "D", "escrow_address": "nope"})
    assert bad.status_code == 422


def test_intake_without_key_is_503(client, monkeypatch):
    monkeypatch.setattr(main.settings, "model_api_key", None)
    assert post(client, "/api/intake", {"messages": ["hello"]}).status_code == 503


def test_review_offline(client):
    r = post(client, "/api/review", {"text": "4. Arbitration. Disputes go to a sole arbitrator appointed by the "
                                             "Company.", "use_ai": False}).json()
    assert r["issues"][0]["rule_id"] == "unilateral_arbitrator"


def test_ai_rate_limit(client, monkeypatch):
    monkeypatch.setattr(main.llm_limiter, "per_minute", 2)
    codes = [post(client, "/api/review", {"text": "x" * 30, "use_ai": False}).status_code for _ in range(3)]
    assert codes == [200, 200, 429]


def test_stamp_and_msme(client):
    assert client.get("/api/stamp/Maharashtra").json()["duty_paise"] == 50_000
    assert client.get("/api/stamp/Narnia").status_code == 422
    assert client.get("/api/msme/classify", params={"investment_paise": 1, "turnover_paise": 1}).json()[
        "category"] == "micro"


def test_unknown_api_route_404(client):
    assert client.get("/api/nope").status_code == 404


def test_artifact_name_is_allowlisted(client):
    assert client.get("/api/escrow/artifact", params={"name": "../../etc/passwd"}).status_code == 422


# ------------------------------------------------------------------------------ hosted demo chain


def test_rpc_is_absent_without_a_demo_chain(client, monkeypatch):
    monkeypatch.setattr(main.settings, "demo_chain_rpc", None)
    assert post(client, "/rpc", {"jsonrpc": "2.0", "id": 1, "method": "eth_chainId", "params": []}).status_code == 404


def test_rpc_forwards_only_allowed_methods(client, monkeypatch):
    # An unreachable upstream: allowed calls get as far as the forward (503), others never do.
    monkeypatch.setattr(main.settings, "demo_chain_rpc", "http://127.0.0.1:9")
    monkeypatch.setattr(main.settings, "demo_chain_timeout_s", 0.5)
    rpc = lambda method: post(client, "/rpc", {"jsonrpc": "2.0", "id": 1, "method": method, "params": []})  # noqa: E731
    assert rpc("eth_chainId").status_code == 503
    for admin in ("hardhat_setBalance", "hardhat_impersonateAccount", "evm_snapshot", "evm_revert", "hardhat_reset", "anvil_mine"):
        assert rpc(admin).status_code == 400, admin
    assert client.post("/rpc", content=b"not json", headers={"content-type": "application/json"}).status_code == 400
    assert post(client, "/rpc", {"jsonrpc": "1.0", "method": "eth_chainId"}).status_code == 400
    batch = [{"jsonrpc": "2.0", "id": i, "method": "eth_blockNumber", "params": []} for i in range(21)]
    assert post(client, "/rpc", batch).status_code == 400
