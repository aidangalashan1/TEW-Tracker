"""Local-file collateral picker for the diary writer — a curated, per-save
copy of the game's own images (fed logo, show logos, roster photos) plus a
"Custom" folder the user can drop their own banners/graphics into, so
inserting an image into a diary entry means browsing real files already on
disk rather than hunting for a URL. `sync` (re)populates the game-derived
categories from the connected save's image root; nothing here ever
auto-populates "Custom".
"""
import os
import shutil
import subprocess
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from core.storage import collateral_dir
from core.images import get_image_root, get_mime_type
from core.datastore import get_store

router = APIRouter(prefix="/api/collateral", tags=["collateral"])

_CATEGORY_DIRS = {
    "fed_logo": "Fed Logo",
    "show_logos": "Show Logos",
    "roster": "Roster",
    "custom": "Custom",
}


def _category_path(category: str) -> str:
    if category not in _CATEGORY_DIRS:
        raise HTTPException(400, f"Unknown category '{category}'")
    d = os.path.join(collateral_dir(), _CATEGORY_DIRS[category])
    os.makedirs(d, exist_ok=True)
    return d


def _list_category(category: str) -> list[dict]:
    d = _category_path(category)
    items = []
    for fname in sorted(os.listdir(d)):
        if os.path.isfile(os.path.join(d, fname)):
            items.append({"name": fname, "path": f"{category}/{fname}"})
    return items


@router.get("")
def list_collateral():
    return {category: _list_category(category) for category in _CATEGORY_DIRS}


def _copy_from_image_root(rel_source: str, dest_dir: str) -> bool:
    root = get_image_root()
    if not root or not rel_source:
        return False
    src = os.path.join(root, rel_source)
    if not os.path.isfile(src):
        return False
    dest = os.path.join(dest_dir, os.path.basename(rel_source))
    try:
        # Skip the copy once the file's already there and unchanged — sync
        # runs on demand and a full roster can be a few hundred images.
        if os.path.isfile(dest) and os.path.getsize(dest) == os.path.getsize(src) and os.path.getmtime(dest) >= os.path.getmtime(src):
            return True
        shutil.copy2(src, dest)
        return True
    except OSError:
        return False


@router.get("/file/{category}/{filename}")
def serve_collateral_file(category: str, filename: str):
    if "/" in filename or "\\" in filename or filename in ("..", "."):
        raise HTTPException(400, "Invalid filename")
    full = os.path.join(_category_path(category), filename)
    if not os.path.isfile(full):
        raise HTTPException(404, "File not found")
    return FileResponse(full, media_type=get_mime_type(full))


@router.post("/sync")
def sync_collateral(fed_uid: int):
    store = get_store()
    if not store:
        raise HTTPException(400, "No save connected")

    copied = {"fed_logo": 0, "show_logos": 0, "roster": 0}

    fed = store.feds.get(fed_uid)
    if fed and fed.get("Logo"):
        if _copy_from_image_root("Logos/" + fed["Logo"], _category_path("fed_logo")):
            copied["fed_logo"] += 1

    show_logos_dir = _category_path("show_logos")
    seen_logos: set[str] = set()

    def _copy_show_logo(logo: str, folder: str) -> None:
        if logo and logo not in seen_logos:
            seen_logos.add(logo)
            if _copy_from_image_root(f"{folder}/{logo}", show_logos_dir):
                copied["show_logos"] += 1

    for tv in store.tv_shows.values():
        if tv.get("Fed") == fed_uid:
            _copy_show_logo(tv.get("Logo") or "", "TV")
    for ev in store.cards.values():
        if ev.get("Fed") == fed_uid:
            _copy_show_logo(ev.get("Logo") or "", "Events")
    for pc in store.past_cards.values():
        if pc.get("Fed") == fed_uid:
            _copy_show_logo(pc.get("Logo") or "", "TV" if pc.get("TV") else "Events")

    from domains.worker.roster import get_roster
    roster_dir = _category_path("roster")
    for w in get_roster(fed_uid):
        pic = w.get("picture")
        if pic and _copy_from_image_root("People/" + pic, roster_dir):
            copied["roster"] += 1

    return {"ok": True, "copied": copied}


@router.post("/open-folder/{category}")
def open_folder(category: str):
    """Opens a category folder itself (rather than selecting one file inside
    it) — mainly for "Custom", so the user has somewhere to find/drop their
    own banners without already having a file in there to reveal."""
    d = _category_path(category)
    try:
        subprocess.Popen(["explorer", d])
    except OSError as e:
        raise HTTPException(500, f"Failed to open Explorer: {e}")
    return {"ok": True}


class RevealRequest(BaseModel):
    path: str  # "category/filename"


@router.post("/reveal")
def reveal(body: RevealRequest):
    parts = body.path.split("/", 1)
    if len(parts) != 2:
        raise HTTPException(400, "Invalid path")
    category, filename = parts
    full = os.path.join(_category_path(category), filename)
    if not os.path.isfile(full):
        raise HTTPException(404, "File not found")
    try:
        # /select highlights the file itself rather than just opening its
        # parent folder — explorer's own exit code is unreliable (it can
        # return non-zero even on success), so this only checks that the
        # process launched, not that it visually succeeded.
        subprocess.Popen(["explorer", f"/select,{full}"])
    except OSError as e:
        raise HTTPException(500, f"Failed to open Explorer: {e}")
    return {"ok": True}
