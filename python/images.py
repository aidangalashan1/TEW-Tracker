import os
import mimetypes

_image_root = None


def set_image_root(path: str | None):
    global _image_root
    if path and os.path.isdir(path):
        _image_root = os.path.abspath(path)
    else:
        _image_root = path


def clear_image_root():
    global _image_root
    _image_root = None


def get_image_root() -> str | None:
    return _image_root


def auto_detect_image_root(mdb_path: str) -> str | None:
    marker = os.sep + "TEW9" + os.sep
    idx = mdb_path.upper().find(marker)
    if idx == -1:
        marker = "/TEW9/"
        idx = mdb_path.upper().find(marker)
    if idx == -1:
        return None
    base = mdb_path[:idx + len(marker) - 1]
    pics_root = os.path.join(base, "Pictures")

    db_path_part = mdb_path[idx + len(marker) - 1:]
    parts = db_path_part.replace("/", os.sep).split(os.sep)
    db_name = None
    for i, part in enumerate(parts):
        if part.upper() == "DATABASES" and i + 1 < len(parts):
            db_name = parts[i + 1]
            break

    if db_name:
        candidates = [db_name]
        if "-" in db_name:
            candidates.append(db_name.split("-")[0])
        for name in candidates:
            candidate = os.path.join(pics_root, name)
            if os.path.isdir(candidate):
                return candidate

    candidate = os.path.join(pics_root, "Default")
    return candidate if os.path.isdir(candidate) else None


def resolve_image(relative_path: str) -> str | None:
    if not _image_root:
        return None
    # Sanitize path traversal
    normalized = os.path.normpath(relative_path)
    if normalized.startswith("..") or normalized.startswith(os.sep):
        return None
    full = os.path.join(_image_root, normalized)
    if not os.path.isfile(full):
        return None
    return full


def get_mime_type(filename: str) -> str:
    mime, _ = mimetypes.guess_type(filename)
    return mime or "application/octet-stream"


def browse_folder() -> str | None:
    """Open a native folder dialog (in-process via tkinter) to select the Pictures/Default directory."""
    import tkinter as tk
    from tkinter import filedialog
    root = tk.Tk()
    root.withdraw()
    root.wm_attributes('-topmost', 1)
    initial_dir = _image_root if _image_root else ""
    try:
        path = filedialog.askdirectory(
            title='Select Pictures/Default folder',
            initialdir=initial_dir or ".",
        )
        return path if path else None
    finally:
        root.destroy()