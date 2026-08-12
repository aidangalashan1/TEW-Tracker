import os
import re
import hashlib
from datetime import date

_BASE = None
_SAVE_INDEX_CACHE: dict | None = None


def _current_save_key() -> str:
    """A short, filesystem-safe id for the currently connected save file —
    stable across renames/company-name changes, used as the lookup key into
    the save index (see _save_folder_name) and to keep per-save user content
    from leaking between saves that happen to reuse the same federation/
    worker UIDs (e.g. two saves started from the same mod)."""
    from core.database import current_path
    path = current_path()
    if not path:
        return "_no_save"
    return hashlib.sha1(os.path.abspath(path).lower().encode("utf-8")).hexdigest()[:12]


def _sanitize_label_part(text: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*]', "", text).strip()
    return cleaned or "Save"


def _save_index_path() -> str:
    return os.path.join(base_dir(), "save_index.json")


def _read_save_index() -> dict:
    global _SAVE_INDEX_CACHE
    if _SAVE_INDEX_CACHE is None:
        from core.json_store import read_json_or_default
        _SAVE_INDEX_CACHE = read_json_or_default(_save_index_path(), {})
    return _SAVE_INDEX_CACHE


def _write_save_index(index: dict) -> None:
    global _SAVE_INDEX_CACHE
    from core.json_store import write_json
    write_json(_save_index_path(), index)
    _SAVE_INDEX_CACHE = index


def _save_folder_name() -> str:
    """The human-readable, per-save folder name — company name (the same
    name shown in the "load existing" list on launch) plus the real-world
    date the folder was first created, e.g. "TCW 060826". Resolved once per
    save and then pinned in save_index.json: re-deriving it on every call
    would (a) rename the folder every day since "today" keeps moving, and
    (b) orphan existing files if the in-game company is ever renamed."""
    key = _current_save_key()
    index = _read_save_index()
    if key in index:
        return index[key]["label"]

    company = ""
    try:
        from core.datastore import get_store
        from domains.company.relative import get_player_fed_uid
        store = get_store()
        if store:
            fed_uid = get_player_fed_uid()
            fed = store.feds.get(fed_uid)
            if fed:
                company = fed.get("Name", "") or ""
    except Exception:
        company = ""

    stamp = date.today().strftime("%d%m%y")
    base_label = _sanitize_label_part(f"{company} {stamp}".strip()) if company else f"Save {stamp}"

    existing_labels = {v["label"] for v in index.values() if isinstance(v, dict) and "label" in v}
    label = base_label
    n = 2
    while label in existing_labels:
        label = f"{base_label} ({n})"
        n += 1

    index[key] = {"label": label, "created": date.today().isoformat()}
    _write_save_index(index)
    return label


def base_dir() -> str:
    global _BASE
    if _BASE is None:
        _BASE = os.path.join(os.path.expanduser("~"), "Documents", "TEW Booking Tracker")
        os.makedirs(_BASE, exist_ok=True)
    return _BASE


def _migrate_legacy_global_data(target_dir: str) -> None:
    """One-time carry-over of the pre-per-save JSON stores (views, storylines,
    cards, shortlist, workspace, profiles, arcs) into the first save folder
    created after this reorg shipped. Those files never recorded which save
    they belonged to, so there's no way to split them correctly across
    multiple saves — whichever save connects first simply inherits them,
    matching what the user saw before (everything shared globally). Copies
    rather than moves, so the old global folders are left alone as a backup
    rather than silently disappearing."""
    import shutil
    for name in ("views", "storylines", "cards"):
        src = os.path.join(base_dir(), name)
        if os.path.isdir(src) and os.listdir(src):
            dest = os.path.join(target_dir, name)
            if not os.path.isdir(dest):
                shutil.copytree(src, dest)

    legacy_saves_dir = os.path.join(base_dir(), "saves")
    for fname in ("shortlist.json", "workspace.json", "profiles.json", "arcs.json"):
        src = os.path.join(legacy_saves_dir, fname)
        dest = os.path.join(target_dir, fname)
        if os.path.isfile(src) and not os.path.isfile(dest):
            shutil.copy2(src, dest)


def save_dir() -> str:
    """Root folder for everything scoped to the currently connected save —
    named after the company (e.g. "TCW 060826"), not the opaque save key, so
    Explorer shows something recognizable instead of a hash. Every per-save
    JSON store (diary, collateral, views, storylines, cards, shortlist,
    workspace, profiles, arcs) lives under here instead of as its own
    top-level tree — keeps saves that reuse the same mod's worker/fed UIDs
    from leaking into each other, and gives Explorer one folder per save."""
    index = _read_save_index()
    is_new_save = _current_save_key() not in index
    label = _save_folder_name()
    d = os.path.join(base_dir(), label)
    is_new_dir = not os.path.isdir(d)
    os.makedirs(d, exist_ok=True)

    if is_new_save and is_new_dir and not _read_save_index().get("_migrated_legacy"):
        _migrate_legacy_global_data(d)
        index = _read_save_index()
        index["_migrated_legacy"] = True
        _write_save_index(index)

    return d


def diary_dir() -> str:
    d = os.path.join(save_dir(), "diary")
    os.makedirs(d, exist_ok=True)
    return d


def collateral_dir() -> str:
    d = os.path.join(save_dir(), "collateral")
    os.makedirs(d, exist_ok=True)
    return d


def views_dir() -> str:
    d = os.path.join(save_dir(), "views")
    os.makedirs(d, exist_ok=True)
    return d


def storylines_dir() -> str:
    d = os.path.join(save_dir(), "storylines")
    os.makedirs(d, exist_ok=True)
    return d


def cards_dir() -> str:
    d = os.path.join(save_dir(), "cards")
    os.makedirs(d, exist_ok=True)
    return d


def rankings_dir() -> str:
    d = os.path.join(save_dir(), "rankings")
    os.makedirs(d, exist_ok=True)
    return d


def shortlist_path() -> str:
    return os.path.join(save_dir(), "shortlist.json")


def workspace_path() -> str:
    return os.path.join(save_dir(), "workspace.json")


def profiles_path() -> str:
    return os.path.join(save_dir(), "profiles.json")


def arcs_path() -> str:
    return os.path.join(save_dir(), "arcs.json")
