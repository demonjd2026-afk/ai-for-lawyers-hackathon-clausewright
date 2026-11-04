"""Safe text helpers for inserting user-supplied values into contract text."""

from __future__ import annotations

import re
import unicodedata
from datetime import date

from app.money import int_to_indian_words

_CONTROL = re.compile("[\\x00-\\x08\\x0b-\\x1f\\x7f-\\x9f\\u200b-\\u200f\\u202a-\\u202e\\u2066-\\u2069]")


def clean(value: str, *, multiline: bool = False) -> str:
    """Normalise user text so it cannot forge structure in the document.

    - NFC-normalises (so visually identical text hashes identically)
    - strips control and bidi-override characters (Trojan-Source style spoofing)
    - collapses newlines for single-line fields so a party name cannot inject a clause
    - neutralises the table separator used by the schedules
    """
    v = unicodedata.normalize("NFC", value)
    v = _CONTROL.sub("", v)
    v = v.replace("|", "/")
    if multiline:
        lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in v.replace("\r\n", "\n").split("\n")]
        # a user line must never look like a heading or a numbered clause of ours
        lines = [re.sub(r"^(#+|\d+(\.\d+)*\.)\s", lambda m: "\\" + m.group(0), ln) for ln in lines]
        v = "\n".join(ln for ln in lines if ln)
    else:
        v = re.sub(r"\s+", " ", v).strip()
    return v


def days(n: int) -> str:
    """15 -> 'fifteen (15) days'."""
    word = int_to_indian_words(n).lower() if n else "zero"
    unit = "day" if n == 1 else "days"
    return f"{word} ({n}) {unit}"


def months(n: int) -> str:
    word = int_to_indian_words(n).lower()
    unit = "month" if n == 1 else "months"
    return f"{word} ({n}) {unit}"


def years(n: int) -> str:
    word = int_to_indian_words(n).lower()
    unit = "year" if n == 1 else "years"
    return f"{word} ({n}) {unit}"


def long_date(d: date) -> str:
    return f"{d.day} {d.strftime('%B')} {d.year}"
