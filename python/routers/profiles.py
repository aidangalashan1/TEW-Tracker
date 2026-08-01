import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from core.database import reconnect
from core.storage import profiles_path
from core.json_store import read_json_list, write_json

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


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
    return {"profiles": read_json_list(profiles_path())}


@router.post("")
def create_profile(body: ProfileCreate):
    profiles = read_json_list(profiles_path())
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
    write_json(profiles_path(), profiles)
    return {"ok": True, "profile": entry}


@router.put("/{pid}")
def update_profile(pid: str, body: ProfileUpdate):
    profiles = read_json_list(profiles_path())
    for p in profiles:
        if p["id"] == pid:
            if body.name is not None: p["name"] = body.name
            if body.mdbPath is not None: p["mdbPath"] = body.mdbPath
            if body.imagePath is not None: p["imagePath"] = body.imagePath
            p["updated"] = datetime.now(timezone.utc).isoformat()
            write_json(profiles_path(), profiles)
            return {"ok": True, "profile": p}
    raise HTTPException(404, "Profile not found")


@router.delete("/{pid}")
def delete_profile(pid: str):
    profiles = read_json_list(profiles_path())
    profiles = [p for p in profiles if p["id"] != pid]
    write_json(profiles_path(), profiles)
    return {"ok": True}


@router.post("/{pid}/switch")
def switch_to_profile(pid: str):
    profiles = read_json_list(profiles_path())
    for p in profiles:
        if p["id"] == pid:
            mdb = p["mdbPath"]
            if not os.path.isfile(mdb):
                raise HTTPException(400, f"MDB file not found: {mdb}")
            try:
                reconnect(mdb)
                from core.datastore import init_store
                init_store(mdb)
            except Exception as e:
                raise HTTPException(500, f"Failed to connect: {e}")
            return {
                "ok": True,
                "path": mdb,
                "imagePath": p.get("imagePath", ""),
            }
    raise HTTPException(404, "Profile not found")
