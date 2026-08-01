"""The Stable entity — a federation's faction/grouping."""
from pydantic import BaseModel, ConfigDict

from .base import row_kwargs


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
