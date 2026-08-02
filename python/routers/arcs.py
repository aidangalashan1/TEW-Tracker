import uuid
from typing import Optional, Literal
from fastapi import APIRouter
from pydantic import BaseModel, Field
from core.storage import arcs_path
from core.json_store import read_json_or_default, write_json

router = APIRouter(prefix="/api/arcs", tags=["arcs"])

ArcStatus = Literal['planned', 'in_progress', 'done', 'shelved']


class LinkedSegment(BaseModel):
    card_id: str
    segment_id: str


class ArcItem(BaseModel):
    id: str
    text: str
    description: Optional[str] = None
    status: ArcStatus = 'planned'
    linked_belt_uid: Optional[int] = None
    linked_worker_uids: list[int] = Field(default_factory=list)
    linked_planned_storyline_id: Optional[str] = None
    linked_segments: list[LinkedSegment] = Field(default_factory=list)


_LIST_FIELDS = ("short_term_arcs", "long_term_arcs", "short_term_goals", "long_term_goals")


def _normalize_item(item):
    """Arc/goal items used to be bare strings. Wrap them into the current
    ArcItem shape on read so a save made before this change keeps working —
    the file itself isn't rewritten until the entry is next edited."""
    if isinstance(item, str):
        return ArcItem(id=uuid.uuid4().hex[:8], text=item).model_dump()
    return item


def _normalize_entry(entry: dict) -> dict:
    for field in _LIST_FIELDS:
        if isinstance(entry.get(field), list):
            entry[field] = [_normalize_item(i) for i in entry[field]]
    return entry


def _read_all() -> dict:
    raw = read_json_or_default(arcs_path(), {})
    return {uid: _normalize_entry(entry) for uid, entry in raw.items()}


def _write_all(data: dict):
    write_json(arcs_path(), data)


class ArcUpdate(BaseModel):
    character_profile: Optional[str] = None
    short_term_arcs: Optional[list[ArcItem]] = None
    long_term_arcs: Optional[list[ArcItem]] = None
    short_term_goals: Optional[list[ArcItem]] = None
    long_term_goals: Optional[list[ArcItem]] = None


@router.get("")
def list_arcs():
    return {"arcs": _read_all()}


@router.get("/{worker_uid}")
def get_arc(worker_uid: int):
    arcs = _read_all()
    return arcs.get(str(worker_uid), {})


@router.put("/{worker_uid}")
def update_arc(worker_uid: int, body: ArcUpdate):
    arcs = _read_all()
    key = str(worker_uid)
    entry = arcs.get(key, {})
    if body.character_profile is not None:
        entry["character_profile"] = body.character_profile
    if body.short_term_arcs is not None:
        entry["short_term_arcs"] = [i.model_dump() for i in body.short_term_arcs]
    if body.long_term_arcs is not None:
        entry["long_term_arcs"] = [i.model_dump() for i in body.long_term_arcs]
    if body.short_term_goals is not None:
        entry["short_term_goals"] = [i.model_dump() for i in body.short_term_goals]
    if body.long_term_goals is not None:
        entry["long_term_goals"] = [i.model_dump() for i in body.long_term_goals]
    arcs[key] = entry
    _write_all(arcs)
    return {"ok": True, "arc": entry}
