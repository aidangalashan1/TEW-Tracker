"""Shared primitives: rating conversion and small value types reused across
every entity model."""
from pydantic import BaseModel, ConfigDict


def row_kwargs(row: dict, **typed) -> dict:
    """Return all row columns plus typed overrides, for use with extra='allow'."""
    kwargs = dict(row)
    kwargs.update(typed)
    return kwargs


def scale_to_pct(value: int) -> int:
    """Convert TEW 0-1000 scale to 0-100 percentage."""
    return round(value / 10)


def scale_to_grade(value: int) -> str:
    """Convert TEW 0-1000 scale to letter grade (FM-style)."""
    if value >= 950: return "A*"
    if value >= 900: return "A"
    if value >= 850: return "A-"
    if value >= 800: return "B+"
    if value >= 750: return "B"
    if value >= 700: return "B-"
    if value >= 650: return "C+"
    if value >= 600: return "C"
    if value >= 550: return "C-"
    if value >= 500: return "D+"
    if value >= 450: return "D"
    if value >= 400: return "D-"
    if value >= 350: return "E+"
    if value >= 300: return "E"
    if value >= 200: return "E-"
    if value >= 100: return "F+"
    return "F"


class RatingDisplay(BaseModel):
    raw: int = 0
    pct: int = 0
    grade: str = "F"

    @classmethod
    def from_raw(cls, value: int) -> "RatingDisplay":
        return cls(raw=value, pct=scale_to_pct(value), grade=scale_to_grade(value))


def _decode_condition(raw) -> int:
    if raw is None or raw == -1:
        return 100
    return max(0, raw // 10)


class WorkerPhysical(BaseModel):
    model_config = ConfigDict(extra='allow')
    fatigue: RatingDisplay = RatingDisplay()
    ringrust: RatingDisplay = RatingDisplay()
    condition1: int = 0
    condition2: int = 0
    condition3: int = 0
    condition4: int = 0

    @classmethod
    def from_db_row(cls, row: dict) -> "WorkerPhysical":
        return cls(**row_kwargs(row,
            fatigue=RatingDisplay.from_raw(row.get("Fatigue", 0)),
            ringrust=RatingDisplay.from_raw(row.get("Ringrust", 0)),
            condition1=_decode_condition(row.get("Condition1")),
            condition2=_decode_condition(row.get("Condition2")),
            condition3=_decode_condition(row.get("Condition3")),
            condition4=_decode_condition(row.get("Condition4")),
        ))


class OvernessEntry(BaseModel):
    region: int
    value: RatingDisplay = RatingDisplay()


class WinLoss(BaseModel):
    model_config = ConfigDict(extra='allow')
    wins: int = 0
    losses: int = 0
    draws: int = 0
