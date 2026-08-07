"""Shared tkinter save/open-dialog + JSON read/write behind the columns and
filters routers' export/import endpoints — a user-picked file, distinct from
json_store.py's automatic app-state persistence."""
import json
import os
from fastapi import HTTPException
from core.storage import save_dir


def export_json_dialog(title: str, default_filename: str, data_str: str) -> dict:
    try:
        from tkinter import filedialog
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.asksaveasfilename(
            title=title,
            initialdir=save_dir(),
            initialfile=default_filename,
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
        )
        root.destroy()
        if not path:
            return {"ok": False, "cancelled": True}
        data = json.loads(data_str)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        return {"ok": True, "cancelled": False, "path": path}
    except Exception as e:
        raise HTTPException(500, f"Failed to export: {e}")


def import_json_dialog(title: str) -> dict:
    try:
        from tkinter import filedialog
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.askopenfilename(
            title=title,
            initialdir=save_dir(),
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
        )
        root.destroy()
        if not path:
            return {"ok": False, "cancelled": True}
        if not os.path.isfile(path):
            raise HTTPException(400, f"File not found: {path}")
        with open(path) as f:
            data = json.load(f)
        return {"ok": True, "cancelled": False, "data": json.dumps(data)}
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON file")
    except Exception as e:
        raise HTTPException(500, f"Failed to import: {e}")
