import json
from datetime import date
from pathlib import Path

import pytest

from app.models import TermSheet

FIX = Path(__file__).parent / "fixtures"
TODAY = date(2026, 11, 3)


def load(name: str) -> dict:
    return json.loads((FIX / f"{name}.json").read_text())


def ts(name: str, **changes) -> TermSheet:
    data = load(name)
    for path, value in changes.items():
        node = data
        parts = path.split("__")
        for p in parts[:-1]:
            node = node[int(p)] if p.isdigit() else node[p]
        node[parts[-1]] = value
    return TermSheet.model_validate(data)


@pytest.fixture
def service() -> TermSheet:
    return ts("freelance_msme")


@pytest.fixture
def nda() -> TermSheet:
    return ts("nda_mutual")


@pytest.fixture
def appointment() -> TermSheet:
    return ts("appointment_fte")
