"""Indian-format money rendering and parsing (lakh/crore grouping, amount in words).

Contracts in India conventionally state amounts in figures and words; the verifier parses
both back and checks they agree with each other and with the term sheet.
"""

from __future__ import annotations

import re

_ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
    "Nineteen",
]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
_WORD_VALUE = {w.lower(): i for i, w in enumerate(_ONES) if w} | {
    w.lower(): i * 10 for i, w in enumerate(_TENS) if w
}
_SCALES = {"hundred": 100, "thousand": 1_000, "lakh": 100_000, "crore": 10_000_000}


def group_indian(n: int) -> str:
    """12345678 -> '1,23,45,678'."""
    if n < 0:
        raise ValueError("negative amount")
    s = str(n)
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts) + "," + tail


def format_inr(paise: int) -> str:
    """₹1,23,456.78"""
    rupees, p = divmod(paise, 100)
    return f"₹{group_indian(rupees)}.{p:02d}"


def _below_hundred(n: int) -> str:
    if n < 20:
        return _ONES[n]
    t, o = divmod(n, 10)
    return _TENS[t] + (f"-{_ONES[o]}" if o else "")


def _below_thousand(n: int) -> str:
    h, r = divmod(n, 100)
    out = []
    if h:
        out.append(f"{_ONES[h]} Hundred")
    if r:
        out.append(_below_hundred(r))
    return " ".join(out)


def int_to_indian_words(n: int) -> str:
    if n == 0:
        return "Zero"
    parts = []
    crore, n = divmod(n, 10_000_000)
    if crore:
        # crores can exceed 99; express recursively ("One Thousand Crore")
        parts.append(f"{int_to_indian_words(crore)} Crore")
    lakh, n = divmod(n, 100_000)
    if lakh:
        parts.append(f"{_below_hundred(lakh)} Lakh")
    thousand, n = divmod(n, 1_000)
    if thousand:
        parts.append(f"{_below_hundred(thousand)} Thousand")
    if n:
        parts.append(_below_thousand(n))
    return " ".join(parts)


def inr_in_words(paise: int) -> str:
    rupees, p = divmod(paise, 100)
    words = f"Rupees {int_to_indian_words(rupees)}"
    if p:
        words += f" and {_below_hundred(p)} Paise"
    return words + " Only"


_FIG = re.compile(r"₹\s?(\d{1,3}(?:,\d{2})*(?:,\d{3})|\d{1,3})\.(\d{2})")


def parse_inr_figure(text: str) -> int:
    m = _FIG.fullmatch(text.strip())
    if not m:
        raise ValueError(f"not an INR figure: {text!r}")
    whole = m.group(1)
    if group_indian(int(whole.replace(",", ""))) != whole:
        raise ValueError(f"malformed Indian grouping: {text!r}")
    return int(whole.replace(",", "")) * 100 + int(m.group(2))


def _words_to_int(tokens: list[str]) -> int:
    total, current = 0, 0
    for tok in tokens:
        for piece in tok.lower().split("-"):
            if piece in _WORD_VALUE:
                current += _WORD_VALUE[piece]
            elif piece == "hundred":
                current *= 100
            elif piece in _SCALES:
                scale = _SCALES[piece]
                if scale == 10_000_000:
                    total = (total + current) * scale
                else:
                    total += current * scale
                current = 0
            elif piece == "zero":
                pass
            else:
                raise ValueError(f"unknown number word: {piece!r}")
    return total + current


def parse_inr_words(text: str) -> int:
    m = re.fullmatch(r"Rupees (.+?)(?: and (.+?) Paise)? Only", text.strip())
    if not m:
        raise ValueError(f"not an amount in words: {text!r}")
    rupees = _words_to_int(m.group(1).split())
    paise = _words_to_int(m.group(2).split()) if m.group(2) else 0
    if paise > 99:
        raise ValueError("paise out of range")
    return rupees * 100 + paise


_EXPR = re.compile(
    r"""^\s*(?:₹|rs\.?|inr)?\s*
        (?P<num>\d+(?:,\d+)*(?:\.\d+)?)\s*
        (?P<unit>crores?|cr|lakhs?|lacs?|l|thousand|k)?\s*
        (?:rupees|/-|-)?\s*$""",
    re.I | re.X,
)
_UNIT = {"crore": 10**7, "crores": 10**7, "cr": 10**7, "lakh": 10**5, "lakhs": 10**5, "lac": 10**5,
         "lacs": 10**5, "l": 10**5, "thousand": 10**3, "k": 10**3}


def parse_amount_expression(expr: str) -> int:
    """'₹1.5 lakh' / 'Rs 3,50,000.50' / '2 cr' / '50k' -> paise, exactly (no float maths)."""
    m = _EXPR.match(expr)
    if not m:
        raise ValueError(f"unrecognised amount: {expr!r}")
    num = m.group("num").replace(",", "")
    whole, _, frac = num.partition(".")
    mult = _UNIT[m.group("unit").lower()] if m.group("unit") else 1
    # value_in_paise = (whole + frac/10^len) * mult * 100, kept in integers
    scale = 10 ** len(frac)
    numerator = (int(whole) * scale + (int(frac) if frac else 0)) * mult * 100
    if numerator % scale:
        raise ValueError(f"amount has fractions of a paisa: {expr!r}")
    paise = numerator // scale
    if paise <= 0:
        raise ValueError("amount must be positive")
    return paise
