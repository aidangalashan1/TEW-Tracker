import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from core.storage import diary_dir
from core.json_store import read_json, write_json, scan_json_dir

router = APIRouter(prefix="/api/diary", tags=["diary"])


def _entry_path(entry_id: str) -> str:
    return os.path.join(diary_dir(), f"{entry_id}.json")


def _read_entry(entry_id: str) -> dict:
    return read_json(_entry_path(entry_id), f"Diary entry '{entry_id}' not found")


def _write_entry(entry_id: str, data: dict):
    write_json(_entry_path(entry_id), data)


class LinkedShow(BaseModel):
    showType: str  # "tv", "event", or "past"
    showUid: int
    showName: str
    showDate: str


DEFAULT_STYLE_CONFIG = {
    "headingPrefix": "",
    "headingSuffix": "",
    "headingBold": True,
    "headingItalic": False,
    "headingUnderline": False,
    "headingColor": "",
    "headingSize": 0,
    "bodyPrefix": "",
    "bodySuffix": "",
    "bodyItalic": False,
    "bodyColor": "",
    "vsSeparator": " vs. ",
    "sideSeparator": " & ",
    "ratingPrefix": "Rating: ",
    "ratingSuffix": "%",
    "autoAddWorkerImages": False,
    "showImages": False,
    "labelMode": "text",
    "template": "{banner}\n{heading}\n{images}\n{vsLine}\n{rating}\n{notes}",
}


class DiaryCreate(BaseModel):
    fedUid: int
    title: str = ""
    date: str = ""
    format: str = "bbcode"  # "bbcode" or "markdown"


class DiaryUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    format: Optional[str] = None
    body: Optional[str] = None
    linkedShows: Optional[list[LinkedShow]] = None
    styleConfig: Optional[dict] = None
    segments: Optional[list[dict]] = None


@router.get("")
def list_entries(fed_uid: Optional[int] = Query(None)):
    entries = []
    for stem, data in scan_json_dir(diary_dir()):
        if fed_uid is not None and data.get("fedUid") != fed_uid:
            continue
        entries.append({
            "id": data.get("id", stem),
            "fedUid": data.get("fedUid", 0),
            "title": data.get("title", ""),
            "date": data.get("date", ""),
            "format": data.get("format", "bbcode"),
            "linkedShows": data.get("linkedShows", []),
            "updated": data.get("updated", ""),
        })
    entries.sort(key=lambda e: e["date"] or "", reverse=True)
    return {"entries": entries}


@router.get("/{entry_id}")
def get_entry(entry_id: str):
    return _read_entry(entry_id)


@router.post("")
def create_entry(body: DiaryCreate):
    entry_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "id": entry_id,
        "fedUid": body.fedUid,
        "title": body.title,
        "date": body.date or now[:10],
        "format": body.format,
        "body": "",
        "linkedShows": [],
        "styleConfig": dict(DEFAULT_STYLE_CONFIG),
        "segments": [],
        "created": now,
        "updated": now,
    }
    _write_entry(entry_id, data)
    return {"ok": True, "entry": data}


@router.put("/{entry_id}")
def update_entry(entry_id: str, body: DiaryUpdate):
    data = _read_entry(entry_id)
    if body.title is not None:
        data["title"] = body.title
    if body.date is not None:
        data["date"] = body.date
    if body.format is not None:
        data["format"] = body.format
    if body.body is not None:
        data["body"] = body.body
    if body.linkedShows is not None:
        data["linkedShows"] = [s.model_dump() for s in body.linkedShows]
    if body.styleConfig is not None:
        data["styleConfig"] = {**DEFAULT_STYLE_CONFIG, **body.styleConfig}
    if body.segments is not None:
        data["segments"] = body.segments
    data["updated"] = datetime.now(timezone.utc).isoformat()
    _write_entry(entry_id, data)
    return {"ok": True, "entry": data}


@router.delete("/{entry_id}")
def delete_entry(entry_id: str):
    path = _entry_path(entry_id)
    if not os.path.isfile(path):
        raise HTTPException(404, f"Diary entry '{entry_id}' not found")
    os.remove(path)
    return {"ok": True}
