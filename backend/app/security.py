"""HTTP hardening: security headers, body-size cap, per-client rate limiting."""

from __future__ import annotations

import ipaddress
import threading
import time
from collections import deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
    "font-src 'self'; img-src 'self' data:; "
    "connect-src 'self' https://*.infura.io https://*.alchemy.com https://rpc.sepolia.org "
    "https://ethereum-sepolia-rpc.publicnode.com http://127.0.0.1:8545 http://localhost:8545; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; "
    "object-src 'none'"
)


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        resp = await call_next(request)
        h = resp.headers
        h["Content-Security-Policy"] = CSP
        h["X-Content-Type-Options"] = "nosniff"
        h["X-Frame-Options"] = "DENY"
        h["Referrer-Policy"] = "no-referrer"
        h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        h["Cross-Origin-Opener-Policy"] = "same-origin"
        h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        if request.url.path.startswith("/api/"):
            h["Cache-Control"] = "no-store"
        return resp


class BodyLimit:
    """Rejects bodies over `limit` bytes, counting the stream (not trusting Content-Length)."""

    def __init__(self, app: ASGIApp, limit: int):
        self.app, self.limit = app, limit

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        declared = dict(scope.get("headers") or []).get(b"content-length")
        if declared is not None and (not declared.isdigit() or int(declared) > self.limit):
            return await JSONResponse({"detail": "request body too large"}, 413)(scope, receive, send)
        seen = 0

        async def limited() -> Message:
            nonlocal seen
            msg = await receive()
            if msg["type"] == "http.request":
                seen += len(msg.get("body", b""))
                if seen > self.limit:
                    raise _TooLarge
            return msg

        try:
            await self.app(scope, limited, send)
        except _TooLarge:
            await JSONResponse({"detail": "request body too large"}, 413)(scope, receive, send)


class _TooLarge(Exception):
    pass


class RateLimiter:
    """Sliding-window limiter keyed by client address. In-process: fine for a single
    instance; put a shared store behind it before scaling horizontally."""

    def __init__(self, per_minute: int, trust_proxy: bool = False):
        self.per_minute = per_minute
        self.trust_proxy = trust_proxy
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def key(self, request: Request) -> str:
        if self.trust_proxy:
            fwd = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            try:
                return str(ipaddress.ip_address(fwd))
            except ValueError:
                pass
        return request.client.host if request.client else "unknown"

    def check(self, request: Request) -> float | None:
        """Returns seconds to wait, or None if allowed."""
        now = time.monotonic()
        k = self.key(request)
        with self._lock:
            q = self._hits.setdefault(k, deque())
            while q and now - q[0] > 60:
                q.popleft()
            if len(q) >= self.per_minute:
                return 60 - (now - q[0])
            q.append(now)
            if len(self._hits) > 10_000:  # bound memory under address churn
                for stale in [a for a, d in self._hits.items() if not d or now - d[-1] > 60]:
                    del self._hits[stale]
        return None
