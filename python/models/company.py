"""Federation-scoped entities: the promotion itself, its belts, and the tag
teams and stables that group its roster."""
from pydantic import BaseModel, ConfigDict

from regions import REGION_TO_AREA
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


class TagTeam(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    fed_uid: int = 0
    worker1: int = 0
    worker2: int = 0
    worker1_name: str = ""
    worker2_name: str = ""
    worker1_picture: str = ""
    worker2_picture: str = ""
    experience: int = 0
    pop: int = 0
    momentum: int = 0

    @classmethod
    def from_db_row(cls, row: dict) -> "TagTeam":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            fed_uid=row.get("Fed", 0),
            worker1=row.get("Worker1", 0),
            worker2=row.get("Worker2", 0),
            experience=row.get("Experience", 0),
        ))


class Stable(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    fed_uid: int = 0
    active: bool = True
    members: list[dict] = []

    @classmethod
    def from_db_row(cls, row: dict) -> "Stable":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            fed_uid=row.get("Fed", 0),
            active=bool(row.get("Active", True)),
        ))


BELT_STYLE_MAP = {1: "Singles", 2: "Tag Team", 3: "Trios"}
BELT_LEVEL_MAP = {1: "Primary", 2: "Secondary", 3: "Tertiary", 4: "Floating"}


class Belt(BaseModel):
    model_config = ConfigDict(extra='allow')
    uid: int
    name: str
    fed_uid: int
    style: str = "Singles"
    level: str = "World"
    prestige: RatingDisplay = RatingDisplay()
    active: bool = True
    holder1: int = 0
    holder2: int = 0
    holder3: int = 0
    brand: int = 0
    defences: int = 0
    belt_level: int = 0
    picture: str = ""
    bio: str = ""
    belt_captured: str = ""

    @classmethod
    def from_db_row(cls, row: dict) -> "Belt":
        return cls(**row_kwargs(row,
            uid=row.get("UID", 0),
            name=row.get("Name", ""),
            fed_uid=row.get("Fed", 0),
            style=BELT_STYLE_MAP.get(row.get("Style", 1), "Singles"),
            level=BELT_LEVEL_MAP.get(row.get("BeltLevel", 1), "Primary"),
            prestige=RatingDisplay.from_raw(row.get("Prestige", 0)),
            active=bool(row.get("Active", True)),
            holder1=row.get("Holder1", 0),
            holder2=row.get("Holder2", 0),
            holder3=row.get("Holder3", 0),
            brand=row.get("Brand", 0),
            defences=row.get("Defences", 0),
            belt_level=row.get("BeltLevel", 1),
            picture=row.get("Picture", ""),
            bio=row.get("Profile") or row.get("Bio") or row.get("Description") or "",
            belt_captured=str(row.get("BeltCaptured")) if row.get("BeltCaptured") else "",
        ))
