"""Game-state and booking entities: overall game info, narratives, and
storylines."""
from typing import Optional
from pydantic import BaseModel, ConfigDict

from .base import RatingDisplay, row_kwargs


class GameInfo(BaseModel):
    model_config = ConfigDict(extra='allow')
    current_date: Optional[str] = None
    start_date: Optional[str] = None
    turn: int = 0
    player_fed_uid: int = 0
    player_worker_uid: int = 0
    stage: int = 0


class Narrative(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    importance: int = 0


class Storyline(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    fed_uid: int
    name: str
    heat: RatingDisplay = RatingDisplay()
    start_date: Optional[str] = None
    furthered: bool = False
    analysis: bool = False

    @classmethod
    def from_db_row(cls, row: dict) -> "Storyline":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            fed_uid=row.get("FedUID", 0),
            name=row.get("Name", ""),
            heat=RatingDisplay.from_raw(row.get("Heat", 0)),
            start_date=str(row.get("StoryStartDate")) if row.get("StoryStartDate") else None,
            furthered=bool(row.get("Furthered", False)),
            analysis=bool(row.get("Analysis", False)),
        ))
