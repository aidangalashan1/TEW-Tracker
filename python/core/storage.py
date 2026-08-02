import os

_BASE = None


def base_dir() -> str:
    global _BASE
    if _BASE is None:
        _BASE = os.path.join(os.path.expanduser("~"), "Documents", "TEW Booking Tracker")
        os.makedirs(_BASE, exist_ok=True)
    return _BASE


def views_dir() -> str:
    d = os.path.join(base_dir(), "views")
    os.makedirs(d, exist_ok=True)
    return d


def saves_dir() -> str:
    d = os.path.join(base_dir(), "saves")
    os.makedirs(d, exist_ok=True)
    return d


def storylines_dir() -> str:
    d = os.path.join(base_dir(), "storylines")
    os.makedirs(d, exist_ok=True)
    return d


def cards_dir() -> str:
    d = os.path.join(base_dir(), "cards")
    os.makedirs(d, exist_ok=True)
    return d


def shortlist_path() -> str:
    return os.path.join(saves_dir(), "shortlist.json")


def workspace_path() -> str:
    return os.path.join(saves_dir(), "workspace.json")


def profiles_path() -> str:
    return os.path.join(saves_dir(), "profiles.json")


def arcs_path() -> str:
    return os.path.join(saves_dir(), "arcs.json")
