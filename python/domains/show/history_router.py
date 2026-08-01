from fastapi import APIRouter, Query
from typing import Optional
from core.errors import ApiError
from .history import get_past_shows, get_past_show_detail

router = APIRouter(prefix="/api/show_history", tags=["show_history"])


@router.get("")
def list_past_shows(fed_uid: Optional[int] = Query(None), limit: int = Query(50)):
    from domains.company.relative import get_player_fed_uid
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    return get_past_shows(fed_uid, limit)


@router.get("/{past_card_uid}")
def past_show_detail(past_card_uid: int):
    detail = get_past_show_detail(past_card_uid)
    if detail is None:
        raise ApiError("Show not found", code="not_found", status=404)
    return detail
