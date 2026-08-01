"""The TagTeam entity — a federation's tag-team pairing."""
from pydantic import BaseModel, ConfigDict

from .base import row_kwargs


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
