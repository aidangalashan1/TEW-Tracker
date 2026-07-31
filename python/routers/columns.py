from fastapi import APIRouter
from pydantic import BaseModel
from json_dialog import export_json_dialog, import_json_dialog

router = APIRouter(prefix="/api/columns", tags=["columns"])


class ExportRequest(BaseModel):
    data: str


@router.post("/export")
def export(req: ExportRequest):
    return export_json_dialog("Export Columns", "columns.json", req.data)


@router.post("/import")
def import_columns():
    return import_json_dialog("Import Columns")
