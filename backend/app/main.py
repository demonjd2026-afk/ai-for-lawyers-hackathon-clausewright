"""Clausewright API.

The server is the only place contract text is produced: clients send term sheets, never
contract text, so a client cannot get a hash for text the engine did not write.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import signal
import time
import uuid
from datetime import date, datetime, UTC
from fractions import Fraction
from pathlib import Path
from typing import Annotated, Literal

import anthropic
import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from app.agents import intake as intake_agent
from app.agents import reviewer
from app.agents.llm import LlmUnavailable
from app.codegen.escrow import EscrowNotConfigured
from app.compliance.rules import apply_autofixes, evaluate
from app.config import settings
from app.drafting.notices import (
    CertificateRequest,
    DemandRequest,
    NotMse,
    bsa_certificate_part_a,
    demand_notice,
)
from app.export.docx_export import to_docx
from app.export.redline import redline
from app.legal.kb import AS_OF, KB
from app.legal.rates import BANK_RATE_HISTORY, RateUnavailable, classify_msme, msmed_interest, stamp_advice
from app.models import IndianState, MAX_PAISE, TermSheet
from app.pipeline import Blocked, build
from app.security import BodyLimit, RateLimiter, SecurityHeaders

log = logging.getLogger("clausewright")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logging.getLogger("httpx").setLevel(logging.WARNING)  # one line per RPC call is noise

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"
ARTIFACTS = ROOT / "artifacts"

@contextlib.asynccontextmanager
async def _lifespan(_: FastAPI):
    keeper = asyncio.create_task(_demo_chain_keeper()) if settings.demo_chain_rpc and settings.demo_chain_pidfile else None
    try:
        yield
    finally:
        if keeper:
            keeper.cancel()


app = FastAPI(title="Clausewright", version="1.0.0", docs_url="/api/docs", redoc_url=None,
              openapi_url="/api/openapi.json", lifespan=_lifespan)
app.add_middleware(SecurityHeaders)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
    allow_credentials=False,
)
app.add_middleware(BodyLimit, limit=settings.max_body_bytes)

llm_limiter = RateLimiter(settings.rate_limit_per_minute, settings.trust_proxy)
api_limiter = RateLimiter(settings.rate_limit_per_minute * 10, settings.trust_proxy)
# The escrow flow polls the chain for receipts, so the RPC proxy gets a budget of its own.
rpc_limiter = RateLimiter(settings.rate_limit_per_minute * 60, settings.trust_proxy)


def _today() -> date:
    return datetime.now(UTC).astimezone(settings.tz).date()


def limit_api(request: Request) -> None:
    if (wait := api_limiter.check(request)) is not None:
        raise HTTPException(429, "too many requests", headers={"Retry-After": str(int(wait) + 1)})


def limit_rpc(request: Request) -> None:
    if (wait := rpc_limiter.check(request)) is not None:
        raise HTTPException(429, "too many chain requests", headers={"Retry-After": str(int(wait) + 1)})


def limit_llm(request: Request) -> None:
    limit_api(request)
    if (wait := llm_limiter.check(request)) is not None:
        raise HTTPException(429, "too many AI requests", headers={"Retry-After": str(int(wait) + 1)})


class Req(BaseModel):
    model_config = ConfigDict(extra="forbid")


Api = Annotated[None, Depends(limit_api)]
Llm = Annotated[None, Depends(limit_llm)]
Rpc = Annotated[None, Depends(limit_rpc)]


@app.exception_handler(RequestValidationError)
async def _validation(_: Request, exc: RequestValidationError):
    # Echo locations and messages only; never the submitted input back.
    errs = [{"loc": [str(x) for x in e["loc"]], "msg": e["msg"]} for e in exc.errors()][:50]
    return JSONResponse({"detail": "invalid request", "errors": errs}, 422)


@app.exception_handler(Exception)
async def _unhandled(_: Request, exc: Exception):
    ref = uuid.uuid4().hex[:12]
    log.exception("unhandled error ref=%s", ref)
    return JSONResponse({"detail": "internal error", "ref": ref}, 500)


# ----------------------------------------------------------------------------- reference


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/meta")
def meta(_: Api) -> dict:
    return {
        "llm_enabled": settings.llm_enabled,
        "states": [s.value for s in IndianState],
        "kb_as_of": AS_OF,
        "bank_rate": [
            {"from": r.effective_from.isoformat(), "pct": r.bps / 100, "status": r.status, "source": r.source}
            for r in BANK_RATE_HISTORY
        ],
        "chains": {k: {"token": v} for k, v in settings.demo_token_address.items()},
        "default_chain": settings.default_chain,
        # Where the browser should reach the local/demo chain: the server's own proxy when it
        # hosts one, otherwise a Hardhat node on the user's machine.
        "demo_chain": {"rpc": "/rpc", "hosted": True} if settings.demo_chain_rpc else {"rpc": "http://127.0.0.1:8545", "hosted": False},
    }


# ----------------------------------------------------------------------------- hosted demo chain

# Only what the escrow flow needs: reads, sends of signed transactions, and the two clock
# controls the demo uses to show deemed acceptance. Node-admin methods (impersonation, balance
# edits, snapshots) stay unreachable.
_RPC_METHODS = frozenset({
    "eth_chainId", "eth_blockNumber", "eth_call", "eth_estimateGas", "eth_gasPrice", "eth_maxPriorityFeePerGas",
    "eth_feeHistory", "eth_getBalance", "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getCode",
    "eth_getTransactionCount", "eth_getTransactionByHash", "eth_getTransactionReceipt", "eth_sendRawTransaction",
    "eth_getLogs", "eth_getStorageAt", "eth_fillTransaction", "net_version", "web3_clientVersion", "evm_increaseTime", "evm_mine",
})


def _rpc_ok(msg: object) -> bool:
    return isinstance(msg, dict) and msg.get("jsonrpc") == "2.0" and msg.get("method") in _RPC_METHODS


async def _demo_chain_keeper(tick_s: float = 60.0, max_drift_s: float = 3600.0, idle_ticks: int = 5) -> None:
    """Restart the demo chain once time-travel demos have left its clock far ahead of real time
    and it has gone quiet, so the next visitor's deployment has valid dates. Never resets a chain
    that is in use: a new block within the idle window postpones the restart."""
    last_block, quiet = None, 0
    while True:
        await asyncio.sleep(tick_s)
        try:
            async with httpx.AsyncClient(timeout=5, trust_env=False) as client:
                r = await client.post(settings.demo_chain_rpc, json={"jsonrpc": "2.0", "id": 1, "method": "eth_getBlockByNumber", "params": ["latest", False]})
                block = r.json()["result"]
            number, stamp = int(block["number"], 16), int(block["timestamp"], 16)
            quiet = quiet + 1 if number == last_block else 0
            last_block = number
            drift = stamp - time.time()
            if drift > max_drift_s and quiet >= idle_ticks:
                pid = int(Path(settings.demo_chain_pidfile).read_text().strip())
                os.kill(pid, signal.SIGTERM)
                log.info("demo chain restarted: clock was %.0f s ahead after %d idle minutes", drift, quiet)
                last_block, quiet = None, 0
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001 - the keeper must outlive any single failure
            log.warning("demo chain keeper: %s", e)


@app.post("/rpc")
async def rpc(request: Request, _: Rpc) -> Response:
    if not settings.demo_chain_rpc:
        raise HTTPException(404, "no hosted demo chain")
    try:
        body = json.loads(await request.body())
    except ValueError:
        raise HTTPException(400, "invalid JSON-RPC") from None
    calls = body if isinstance(body, list) else [body]
    if not calls or len(calls) > 20 or not all(_rpc_ok(c) for c in calls):
        log.warning("rpc rejected: %s", [c.get("method") if isinstance(c, dict) else type(c).__name__ for c in calls][:5])
        raise HTTPException(400, "method not allowed on the demo chain")
    try:
        async with httpx.AsyncClient(timeout=settings.demo_chain_timeout_s, trust_env=False) as client:
            upstream = await client.post(settings.demo_chain_rpc, json=body)
    except httpx.HTTPError:
        raise HTTPException(503, "the demo chain is not responding") from None
    return Response(upstream.content, upstream.status_code, media_type="application/json")


@app.get("/api/kb")
def kb(_: Api) -> list[dict]:
    return [
        {"id": a.id, "authority": a.authority, "provision": a.provision, "summary": a.summary, "url": a.url,
         "status": a.status}
        for a in KB.values()
    ]


# ------------------------------------------------------------------------------ drafting


class CheckReq(Req):
    term_sheet: TermSheet


class VerifyReq(Req):
    term_sheet: TermSheet
    onchain: dict | None = Field(default=None, description="Values read back from the deployed escrow.")


def _build(ts: TermSheet, onchain: dict | None = None) -> dict:
    try:
        return build(ts, _today(), onchain)
    except Blocked as b:
        raise HTTPException(409, {"blocked": True, "findings": [f.model_dump(mode="json") for f in b.findings]}) from None
    except EscrowNotConfigured as e:
        raise HTTPException(422, str(e)) from None


@app.post("/api/check")
def check(req: CheckReq, _: Api) -> dict:
    return {"findings": [f.model_dump(mode="json") for f in evaluate(req.term_sheet, _today())]}


@app.post("/api/autofix")
def autofix(req: CheckReq, _: Api) -> dict:
    fixed = apply_autofixes(req.term_sheet, evaluate(req.term_sheet, _today()))
    return {"term_sheet": fixed.model_dump(mode="json"),
            "findings": [f.model_dump(mode="json") for f in evaluate(fixed, _today())]}


@app.post("/api/draft")
def draft(req: CheckReq, _: Api) -> dict:
    return _build(req.term_sheet)


@app.post("/api/verify")
def verify(req: VerifyReq, _: Api) -> dict:
    r = _build(req.term_sheet, req.onchain)
    return {"verification": r["verification"], "document_hash": r["document_hash"]}


@app.post("/api/export/docx")
def export_docx(req: CheckReq, _: Api) -> Response:
    r = _build(req.term_sheet)
    data = to_docx(r["text"], r["document_hash"])
    name = r["title"].lower().replace(" ", "-")
    return Response(
        data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{name}.docx"'},
    )


class RedlineReq(Req):
    old: TermSheet
    new: TermSheet


@app.post("/api/redline")
def redline_ep(req: RedlineReq, _: Api) -> dict:
    return redline(_build(req.old)["text"], _build(req.new)["text"])


# ---------------------------------------------------------------------------------- AI


class IntakeReq(Req):
    messages: list[Annotated[str, Field(min_length=1, max_length=8000)]] = Field(min_length=1, max_length=12)
    prior: dict | None = None


@app.post("/api/intake")
def intake(req: IntakeReq, _: Llm) -> dict:
    if req.prior is not None and len(json.dumps(req.prior)) > 50_000:
        raise HTTPException(413, "prior term sheet too large")
    try:
        return intake_agent.run(req.messages, _today(), req.prior)
    except LlmUnavailable:
        raise HTTPException(503, "AI intake is not configured on this server; fill the form instead") from None
    except anthropic.APIError as e:
        log.warning("intake LLM error: %s", type(e).__name__)
        raise HTTPException(502, "the AI service did not respond; please retry") from None


class ReviewReq(Req):
    text: str = Field(min_length=20, max_length=reviewer.MAX_CHARS)
    role: str = Field(default="the service provider", max_length=80)
    use_ai: bool = True


@app.post("/api/review")
def review(req: ReviewReq, _: Llm) -> dict:
    try:
        return reviewer.review(req.text, req.role, use_llm=req.use_ai)
    except anthropic.APIError as e:
        log.warning("review LLM error: %s", type(e).__name__)
        out = reviewer.review(req.text, req.role, use_llm=False)
        out["meta"]["llm_error"] = "AI review unavailable; showing rule-based findings only"
        return out


# ------------------------------------------------------------------------ MSME recovery


class InterestReq(Req):
    principal_paise: int = Field(gt=0, le=MAX_PAISE)
    due_date: date
    paid_on: date | None = None
    bank_rate_override_pct: Fraction | None = Field(default=None, ge=0, le=20)


@app.post("/api/interest")
def interest(req: InterestReq, _: Api) -> dict:
    to = req.paid_on or _today()
    if (to - req.due_date).days > 365 * 20:
        raise HTTPException(422, "period too long")
    try:
        r = msmed_interest(req.principal_paise, req.due_date, to, req.bank_rate_override_pct)
    except RateUnavailable as e:
        raise HTTPException(422, str(e)) from None
    return {
        "principal_paise": r.principal_paise, "interest_paise": r.interest_paise, "total_paise": r.total_paise,
        "interest_from": r.interest_from.isoformat(), "interest_to": r.interest_to.isoformat(),
        "days_late": r.days_late, "rate_sources": list(r.rate_sources), "convention": r.convention,
        "periods": [
            {"start": p.start.isoformat(), "end": p.end.isoformat(), "annual_rate_pct": p.annual_rate_pct,
             "opening_paise": p.opening_paise, "closing_paise": p.closing_paise}
            for p in r.periods
        ],
    }


@app.post("/api/notice/demand")
def notice(req: DemandRequest, _: Api) -> dict:
    to = req.paid_on or _today()
    if any((to - i.accepted_on).days > 365 * 20 for i in req.invoices):
        raise HTTPException(422, "period too long")
    try:
        return demand_notice(req, _today())
    except (RateUnavailable, NotMse) as e:
        raise HTTPException(422, str(e)) from None


@app.post("/api/certificate")
def certificate(req: CertificateRequest, _: Api) -> dict:
    try:
        return {"text": bsa_certificate_part_a(req, datetime.now(UTC))}
    except ValueError as e:
        raise HTTPException(422, str(e)) from None


@app.get("/api/msme/classify")
def msme(_: Api, investment_paise: Annotated[int, Query(ge=0, le=10**16)],
         turnover_paise: Annotated[int, Query(ge=0, le=10**17)]) -> dict:
    return {"category": classify_msme(investment_paise, turnover_paise).value,
            "basis": "S.O. 1364(E), 21 March 2025, effective 1 April 2025"}


@app.get("/api/stamp/{state}")
def stamp(state: IndianState, _: Api) -> dict:
    return stamp_advice(state)


# ------------------------------------------------------------------------------ escrow


@app.get("/api/escrow/artifact")
def escrow_artifact(_: Api, name: Literal["ClausewrightEscrow", "DemoINR"] = "ClausewrightEscrow") -> Response:
    path = ARTIFACTS / f"{name}.json"
    if not path.is_file():
        raise HTTPException(404, "contract artifact not built; run `npm run export` in contracts/")
    return FileResponse(path, media_type="application/json")


# ------------------------------------------------------------------------------ frontend

if STATIC.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(404)
        candidate = (STATIC / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(STATIC.resolve()):
            return FileResponse(candidate)
        return FileResponse(STATIC / "index.html")
