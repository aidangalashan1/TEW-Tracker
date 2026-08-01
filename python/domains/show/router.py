from fastapi import APIRouter, Query
from typing import Optional
from core.datastore import get_store
from core.errors import ApiError
from core.response_utils import fast_json
from .schedule import get_schedule, get_tv_detail, get_event_detail

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


@router.get("")
def schedule(fed_uid: Optional[int] = Query(None), weeks: int = Query(13)):
    return fast_json(get_schedule(fed_uid, weeks))


@router.get("/tv/{tv_uid}")
def tv_detail(tv_uid: int):
    if not get_store():
        raise ApiError("No data", code="no_data", status=500)
    data = get_tv_detail(tv_uid)
    if data is None:
        raise ApiError("TV show not found", code="not_found", status=404)
    return data


@router.get("/event/{card_uid}")
def event_detail(card_uid: int):
    if not get_store():
        raise ApiError("No data", code="no_data", status=500)
    data = get_event_detail(card_uid)
    if data is None:
        raise ApiError("Event not found", code="not_found", status=404)
    return data
