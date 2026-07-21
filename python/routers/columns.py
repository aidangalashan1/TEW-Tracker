import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from storage import saves_dir

router = APIRouter(prefix="/api/columns", tags=["columns"])


class ExportRequest(BaseModel):
    data: str


@router.post("/export")
def export(req: ExportRequest):
    try:
        from tkinter import filedialog
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.asksaveasfilename(
            title="Export Columns",
            initialdir=saves_dir(),
            initialfile="columns.json",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
        )
        root.destroy()
        if not path:
            return {"ok": False, "cancelled": True}
        data = json.loads(req.data)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        return {"ok": True, "cancelled": False, "path": path}
    except Exception as e:
        raise HTTPException(500, f"Failed to export: {e}")


@router.post("/import")
def import_columns():
    try:
        from tkinter import filedialog
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.askopenfilename(
            title="Import Columns",
            initialdir=saves_dir(),
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
