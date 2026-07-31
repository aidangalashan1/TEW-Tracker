import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from storage import storylines_dir
from json_store import read_json, write_json, scan_json_dir

router = APIRouter(prefix="/api/storylines/planned", tags=["storylines"])


def _path(sid: str) -> str:
    return os.path.join(storylines_dir(), f"{sid}.json")


def _read(sid: str) -> dict:
    return read_json(_path(sid), "Planned storyline not found")


def _write(sid: str, data: dict):
    write_json(_path(sid), data)


class CreateBody(BaseModel):
    name: str
    notes: str = ""


class UpdateBody(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    workers: Optional[list[int]] = None


@router.get("")
def list_storylines():
    items = [data for _stem, data in scan_json_dir(storylines_dir())]
    return {"storylines": items}


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
        "created": now,
        "updated": now,
    }
    _write(sid, data)
    return {"ok": True, "storyline": data}


@router.put("/{sid}")
def update_storyline(sid: str, body: UpdateBody):
    data = _read(sid)
    if body.name is not None:
        data["name"] = body.name
    if body.notes is not None:
        data["notes"] = body.notes
    if body.workers is not None:
        data["workers"] = body.workers
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
