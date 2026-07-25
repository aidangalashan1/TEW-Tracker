from fastapi import APIRouter, Query
from typing import Optional
from services.storyline_service import get_storylines_cross, get_storyline_detail
from services.storyline_ideas import get_storyline_ideas

router = APIRouter(prefix="/api/storylines", tags=["storylines"])


@router.get("/cross")
def cross_table(fed_uid: Optional[int] = Query(None)):
    from services.company_service import get_player_fed_uid
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    return get_storylines_cross(fed_uid)


@router.get("/ideas")
def storyline_ideas(fed_uid: Optional[int] = Query(None), worker_uid: Optional[int] = Query(None)):
    from services.company_service import get_player_fed_uid
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    return get_storyline_ideas(fed_uid, worker_uid)


@router.get("/{storyline_uid}")
def storyline_detail(storyline_uid: int, fed_uid: Optional[int] = Query(None)):
    from services.company_service import get_player_fed_uid
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    detail = get_storyline_detail(storyline_uid, fed_uid)
    if detail is None:
        return {"error": "Storyline not found"}, 404
    return detail
