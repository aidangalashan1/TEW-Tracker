from fastapi import APIRouter
from core.datastore import get_store
from core.errors import ApiError
from .service import get_belt_detail

router = APIRouter(prefix="/api/belt", tags=["belt"])


@router.get("/{belt_uid}")
def belt_detail(belt_uid: int):
    if not get_store():
        raise ApiError("No data loaded", code="no_data", status=500)
    data = get_belt_detail(belt_uid)
    if data is None:
        raise ApiError("Belt not found", code="not_found", status=404)
    return data
