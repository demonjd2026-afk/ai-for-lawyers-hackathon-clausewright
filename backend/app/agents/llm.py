from __future__ import annotations

from functools import lru_cache

import anthropic

from app.config import settings


class LlmUnavailable(RuntimeError):
    pass


@lru_cache(maxsize=1)
def client() -> anthropic.Anthropic:
    if not settings.llm_enabled:
        raise LlmUnavailable("CLAUSEWRIGHT_MODEL_API_KEY is not configured")
    return anthropic.Anthropic(
        api_key=settings.model_api_key.get_secret_value(),
        timeout=settings.llm_timeout_s,
        max_retries=settings.llm_max_retries,
    )


def untrusted(tag: str, text: str) -> str:
    """Wrap user/third-party text as data. The closing tag is neutralised inside the payload
    so a document cannot break out of its envelope and speak as the system."""
    safe = text.replace(f"</{tag}>", f"</ {tag}>")
    return f"<{tag}>\n{safe}\n</{tag}>"
