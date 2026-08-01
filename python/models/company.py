"""The Federation entity — a promotion's identity, size, and standing.
Belts, tag teams, and stables are roster-grouping entities that belong to a
federation but have their own identity/history independent of any one view
of it (their own profile pages, referenced by name from Storylines/Shows),
so they live in their own model files: belt.py, team.py, stable.py."""
from pydantic import BaseModel, ConfigDict

from core.regions import REGION_TO_AREA
from .base import RatingDisplay, row_kwargs

SIZE_MAP = {1: "Local", 2: "Small", 3: "Medium", 4: "Large", 5: "National",
            6: "International", 7: "Global", 8: "Cult", 9: "Regional", 10: "Tiny", 11: "Failed"}


class Federation(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    initials: str
    size: int
    size_label: str = ""
    money: int = 0
    prestige: RatingDisplay = RatingDisplay()
    influence: int = 0
    momentum: RatingDisplay = RatingDisplay()
    user_controlled: bool = False
    based_in: int = 0
    home_area: str = ""
    ranking: int = 0
    ranking_rating: int = 0
    worker_count: int = 0
    logo: str = ""

    @classmethod
    def from_db_row(cls, row: dict) -> "Federation":
        s = row.get("Size", 1)
        bi = row.get("Based_In", 0)
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            initials=row.get("Initials", ""),
            size=s,
            size_label=SIZE_MAP.get(s, f"Size {s}"),
            money=row.get("Money", 0),
            prestige=RatingDisplay.from_raw(row.get("Prestige", 0)),
            influence=row.get("Influence", 0),
            momentum=RatingDisplay.from_raw(row.get("Momentum", 0)),
            user_controlled=bool(row.get("User_Controlled", False)),
            based_in=bi,
            home_area=REGION_TO_AREA.get(bi, ""),
            ranking=row.get("Ranking", 0),
            ranking_rating=row.get("RankingRating", 0),
            logo=row.get("Logo", ""),
        ))
