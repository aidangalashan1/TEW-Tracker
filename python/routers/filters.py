from fastapi import APIRouter
from pydantic import BaseModel
from json_dialog import export_json_dialog, import_json_dialog

router = APIRouter(prefix="/api/filters", tags=["filters"])


class ExportRequest(BaseModel):
    data: str


@router.post("/export")
def export(req: ExportRequest):
    return export_json_dialog("Export Filters", "filters.json", req.data)


@router.post("/import")
def import_filters():
    return import_json_dialog("Import Filters")
