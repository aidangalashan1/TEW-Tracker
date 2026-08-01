"""The Belt entity — a federation's title, independent of any one holder or
view of it (its own profile page, referenced by name from Storylines/Shows)."""
from pydantic import BaseModel, ConfigDict

from .base import RatingDisplay, row_kwargs

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
