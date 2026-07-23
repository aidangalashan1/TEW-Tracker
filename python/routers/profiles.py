import os
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import reconnect
from storage import profiles_path

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


def _profiles_path() -> str:
    return profiles_path()


def _load_profiles() -> list[dict]:
    p = _profiles_path()
    if not os.path.isfile(p):
        return []
    try:
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_profiles(profiles: list[dict]):
    p = _profiles_path()
    with open(p, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2)


class ProfileCreate(BaseModel):
    name: str
    mdbPath: str
    imagePath: str = ""


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    mdbPath: Optional[str] = None
    imagePath: Optional[str] = None


@router.get("")
def list_profiles():
    return {"profiles": _load_profiles()}


@router.post("")
def create_profile(body: ProfileCreate):
    profiles = _load_profiles()
    pid = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    entry = {
        "id": pid,
        "name": body.name,
        "mdbPath": body.mdbPath,
        "imagePath": body.imagePath,
        "created": now,
        "updated": now,
    }
    profiles.append(entry)
    _save_profiles(profiles)
    return {"ok": True, "profile": entry}


@router.put("/{pid}")
def update_profile(pid: str, body: ProfileUpdate):
    profiles = _load_profiles()
    for p in profiles:
        if p["id"] == pid:
            if body.name is not None: p["name"] = body.name
            if body.mdbPath is not None: p["mdbPath"] = body.mdbPath
            if body.imagePath is not None: p["imagePath"] = body.imagePath
            p["updated"] = datetime.now(timezone.utc).isoformat()
            _save_profiles(profiles)
            return {"ok": True, "profile": p}
    raise HTTPException(404, "Profile not found")


@router.delete("/{pid}")
def delete_profile(pid: str):
    profiles = _load_profiles()
    profiles = [p for p in profiles if p["id"] != pid]
    _save_profiles(profiles)
    return {"ok": True}


@router.post("/{pid}/switch")
def switch_to_profile(pid: str):
    profiles = _load_profiles()
    for p in profiles:
        if p["id"] == pid:
            mdb = p["mdbPath"]
            if not os.path.isfile(mdb):
                raise HTTPException(400, f"MDB file not found: {mdb}")
            try:
                reconnect(mdb)
                from datastore import init_store
                init_store(mdb)
            except Exception as e:
                raise HTTPException(500, f"Failed to connect: {e}")
            return {
                "ok": True,
                "path": mdb,
                "imagePath": p.get("imagePath", ""),
            }
    raise HTTPException(404, "Profile not found")
