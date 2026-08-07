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
    # A single arc can span more than one storyline (e.g. "The Bloodline
    # Story" arc covering both a Roman Reigns feud and a separate Usos
    # feud storyline) — plural, unlike linked_belt_uid which is genuinely
    # one-to-one.
    linked_planned_storyline_ids: list[str] = Field(default_factory=list)
    linked_storyline_uids: list[int] = Field(default_factory=list)
    linked_segments: list[LinkedSegment] = Field(default_factory=list)


_LIST_FIELDS = ("arcs", "goals")
# Arcs/goals used to be split into short-term/long-term lists; collapsed into
# a single "arcs"/"goals" list each since the split was never used
# meaningfully. Old entries still on disk get merged into the new shape on
# read (below), same as the string->ArcItem migration.
_OLD_ARC_FIELDS = ("short_term_arcs", "long_term_arcs")
_OLD_GOAL_FIELDS = ("short_term_goals", "long_term_goals")


def _normalize_item(item):
    """Arc/goal items used to be bare strings. Wrap them into the current
    ArcItem shape on read so a save made before this change keeps working —
    the file itself isn't rewritten until the entry is next edited."""
    if isinstance(item, str):
        return ArcItem(id=uuid.uuid4().hex[:8], text=item).model_dump()
    # Storyline links used to be single-valued — migrate onto the new list
    # fields the same lazy, read-only way as the string->ArcItem migration.
    if "linked_planned_storyline_id" in item:
        old = item.pop("linked_planned_storyline_id")
        if "linked_planned_storyline_ids" not in item:
            item["linked_planned_storyline_ids"] = [old] if old else []
    if "linked_storyline_uid" in item:
        old = item.pop("linked_storyline_uid")
        if "linked_storyline_uids" not in item:
            item["linked_storyline_uids"] = [old] if old else []
    return item


def _normalize_entry(entry: dict) -> dict:
    if any(f in entry for f in _OLD_ARC_FIELDS + _OLD_GOAL_FIELDS):
        merged_arcs = [i for f in _OLD_ARC_FIELDS for i in (entry.pop(f, None) or [])]
        merged_goals = [i for f in _OLD_GOAL_FIELDS for i in (entry.pop(f, None) or [])]
        if merged_arcs:
            entry["arcs"] = merged_arcs + (entry.get("arcs") or [])
        if merged_goals:
            entry["goals"] = merged_goals + (entry.get("goals") or [])
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
    arcs: Optional[list[ArcItem]] = None
    goals: Optional[list[ArcItem]] = None


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
    if body.arcs is not None:
        entry["arcs"] = [i.model_dump() for i in body.arcs]
    if body.goals is not None:
        entry["goals"] = [i.model_dump() for i in body.goals]
    arcs[key] = entry
    _write_all(arcs)
    return {"ok": True, "arc": entry}
