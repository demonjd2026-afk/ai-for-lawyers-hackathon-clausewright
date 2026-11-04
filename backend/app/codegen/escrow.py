"""Term sheet -> escrow constructor arguments, plus the clause<->parameter map.

The escrow bytecode is fixed and audited by tests; only its constructor arguments are
generated, so no model-written Solidity ever reaches a chain.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timedelta, timezone

from app.config import settings
from app.models import TermSheet

IST = timezone(timedelta(hours=5, minutes=30))
DAY = 86_400


class EscrowNotConfigured(ValueError):
    pass


@dataclass(frozen=True)
class MilestoneArg:
    amount: int  # paise; DemoINR has 2 decimals so 1 unit == 1 paisa
    due_date: int  # unix seconds


@dataclass(frozen=True)
class EscrowParams:
    chain: str
    token: str
    payer: str
    payee: str
    arbiter: str
    terms_hash: str
    acceptance_window_s: int
    funding_deadline: int
    msme_mode: bool
    milestones: tuple[MilestoneArg, ...]
    total: int
    document_hash: str | None = None

    def constructor_args(self) -> list:
        """Ordered exactly as ClausewrightEscrow's constructor."""
        if self.document_hash is None:
            raise EscrowNotConfigured("document hash not bound yet")
        return [
            self.token,
            self.payer,
            self.payee,
            self.arbiter,
            self.document_hash,
            self.terms_hash,
            self.acceptance_window_s,
            self.funding_deadline,
            self.msme_mode,
            [{"amount": m.amount, "dueDate": m.due_date} for m in self.milestones],
        ]

    def as_dict(self) -> dict:
        d = asdict(self)
        d["milestones"] = [asdict(m) for m in self.milestones]
        return d


def end_of_day_ist(d: date) -> int:
    return int(datetime.combine(d, time(23, 59, 59), IST).timestamp())


def derive_params(ts: TermSheet) -> EscrowParams:
    from app.drafting.engine import terms_hash  # local import: engine renders Schedule B from us

    e = ts.escrow
    missing = [
        name
        for name, v in (
            ("client.wallet", ts.client.wallet),
            ("provider.wallet", ts.provider.wallet),
            ("escrow.arbiter_wallet", e.arbiter_wallet),
        )
        if not v
    ]
    if missing:
        raise EscrowNotConfigured("missing wallet(s): " + ", ".join(missing))
    token = settings.demo_token_address.get(e.chain)
    if not token:
        raise EscrowNotConfigured(f"no settlement token configured for chain {e.chain!r}")
    ms = tuple(MilestoneArg(m.amount_paise, end_of_day_ist(m.due_date)) for m in ts.milestones)
    return EscrowParams(
        chain=e.chain,
        token=token,
        payer=ts.client.wallet,
        payee=ts.provider.wallet,
        arbiter=e.arbiter_wallet,
        terms_hash=terms_hash(ts),
        acceptance_window_s=ts.acceptance_days * DAY,
        funding_deadline=end_of_day_ist(ts.effective_date + timedelta(days=e.funding_days)),
        msme_mode=ts.provider.is_mse,
        milestones=ms,
        total=sum(m.amount for m in ms),
    )


def bind(params: EscrowParams, document_hash: str) -> EscrowParams:
    return EscrowParams(**{**params.__dict__, "document_hash": document_hash})


def clause_map(clauses: list[dict]) -> dict[str, list[str]]:
    """parameter -> clause ids that govern it (for the side-by-side view)."""
    out: dict[str, list[str]] = {}
    for c in clauses:
        for b in c["binds"]:
            out.setdefault(b, []).append(c["id"])
    return out
