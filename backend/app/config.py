from __future__ import annotations

import re
from datetime import timedelta, timezone
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ADDR = re.compile(r"^0x[0-9a-fA-F]{40}$")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CW_", env_file=".env", extra="ignore")

    model_api_key: SecretStr | None = Field(default=None, validation_alias="CLAUSEWRIGHT_MODEL_API_KEY")
    model: str = "claude-sonnet-5-5"  # intake: structured extraction
    review_model: str = "claude-opus-5-5"  # contract review: harder legal reasoning
    llm_timeout_s: float = 60.0
    llm_max_retries: int = 2

    # DemoINR deployments per chain, e.g. CW_DEMO_TOKEN_ADDRESS='{"sepolia":"0x..."}'.
    # The local entry is Hardhat's deterministic first-deploy address.
    demo_token_address: dict[str, str] = Field(
        default_factory=lambda: {"local": "0x5FbDB2315678afecb367f032d93F642f64180aa3"}
    )
    default_chain: Literal["sepolia", "local"] = "local"
    # A JSON-RPC endpoint for a demo chain the server runs beside itself (the Docker image starts
    # one). When set, the API exposes it at POST /rpc so the hosted app can run the escrow flow
    # without a wallet. Never point this at a chain that holds real value.
    demo_chain_rpc: str | None = None
    demo_chain_timeout_s: float = 20.0
    # If set, the keeper restarts the demo chain (SIGTERM to this pid; the start script
    # relaunches it) once "skip days" demos have pushed its clock more than an hour ahead of
    # real time and it has been idle for five minutes, so later demos get valid dates again.
    demo_chain_pidfile: str | None = None

    allowed_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    max_body_bytes: int = 256_000
    rate_limit_per_minute: int = 20  # per client, AI routes; other routes get 10x
    trust_proxy: bool = False  # set true only behind a proxy that overwrites X-Forwarded-For

    @field_validator("demo_token_address")
    @classmethod
    def _addresses(cls, v: dict[str, str]) -> dict[str, str]:
        for chain, addr in v.items():
            if chain not in ("sepolia", "local") or not _ADDR.fullmatch(addr):
                raise ValueError(f"invalid token address for {chain!r}")
        return v

    @property
    def tz(self) -> timezone:
        return timezone(timedelta(hours=5, minutes=30), "IST")

    @property
    def llm_enabled(self) -> bool:
        return self.model_api_key is not None and bool(self.model_api_key.get_secret_value())


settings = Settings()
