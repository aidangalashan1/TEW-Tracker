import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.storage import storylines_dir, arcs_path, cards_dir
from core.json_store import read_json, write_json, scan_json_dir, read_json_or_default

router = APIRouter(prefix="/api/storylines/planned", tags=["storylines"])


def _path(sid: str) -> str:
    return os.path.join(storylines_dir(), f"{sid}.json")


def _read(sid: str) -> dict:
    return read_json(_path(sid), "Planned storyline not found")


def _write(sid: str, data: dict):
    write_json(_path(sid), data)


class ShowRef(BaseModel):
    kind: str          # "past" (a PastShow) or "upcoming" (a scheduled tv/event)
    ref_uid: int        # PastShow.uid when kind=="past"; tvUid/cardUid when kind=="upcoming"
    show_type: str      # "tv" or "event"
    show_date: str
    show_name: str = ""


class CreateBody(BaseModel):
    name: str
    notes: str = ""


class UpdateBody(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    workers: Optional[list[int]] = None
    start_show: Optional[ShowRef] = None
    end_show: Optional[ShowRef] = None
    archived: Optional[bool] = None


@router.get("")
def list_storylines():
    items = [data for _stem, data in scan_json_dir(storylines_dir())]
    return {"storylines": items}


_ARC_LIST_FIELDS = ("short_term_arcs", "long_term_arcs", "short_term_goals", "long_term_goals")


@router.get("/{sid}/links")
def get_storyline_links(sid: str):
    """Everything linked to this planned storyline, computed live by scanning
    arcs.json and every card — the storyline itself stores no back-references,
    so there's exactly one place (the arc/segment) that owns each link and
    nothing to keep in sync."""
    arcs = []
    raw_arcs = read_json_or_default(arcs_path(), {})
    for worker_uid, entry in raw_arcs.items():
        if not isinstance(entry, dict):
            continue
        for field in _ARC_LIST_FIELDS:
            for item in entry.get(field) or []:
                if not isinstance(item, dict):
                    continue
                if item.get("linked_planned_storyline_id") == sid:
                    arcs.append({
                        "worker_uid": int(worker_uid),
                        "field": field,
                        "item_id": item.get("id"),
                        "text": item.get("text", ""),
                    })

    segments = []
    for _stem, card in scan_json_dir(cards_dir()):
        for seg in card.get("segments") or []:
            if seg.get("linked_planned_storyline_id") == sid:
                segments.append({"card_id": card.get("id"), "segment_id": seg.get("id")})

    return {"arcs": arcs, "segments": segments}


@router.get("/{sid}")
def get_storyline(sid: str):
    return _read(sid)


@router.post("")
def create_storyline(body: CreateBody):
    sid = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "id": sid,
        "name": body.name,
        "workers": [],
        "notes": body.notes,
        "start_show": None,
        "end_show": None,
        "archived": False,
        "created": now,
        "updated": now,
    }
    _write(sid, data)
    return {"ok": True, "storyline": data}


@router.put("/{sid}")
def update_storyline(sid: str, body: UpdateBody):
    data = _read(sid)
    # model_fields_set (rather than `is not None`) so a client can send an
    # explicit null to *clear* a nullable field (start_show/end_show),
    # distinguishable from simply not mentioning that field in this request.
    fields = body.model_fields_set
    if "name" in fields:
        data["name"] = body.name
    if "notes" in fields:
        data["notes"] = body.notes
    if "workers" in fields:
        data["workers"] = body.workers
    if "start_show" in fields:
        data["start_show"] = body.start_show.model_dump() if body.start_show else None
    if "end_show" in fields:
        data["end_show"] = body.end_show.model_dump() if body.end_show else None
    if "archived" in fields:
        data["archived"] = body.archived
    data["updated"] = datetime.now(timezone.utc).isoformat()
    _write(sid, data)
    return {"ok": True, "storyline": data}


@router.delete("/{sid}")
def delete_storyline(sid: str):
    p = _path(sid)
    if not os.path.isfile(p):
        raise HTTPException(404, "Planned storyline not found")
    os.remove(p)
    return {"ok": True}
