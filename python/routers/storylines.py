from fastapi import APIRouter, Query
from typing import Optional
from services.storyline_service import get_storylines_cross

router = APIRouter(prefix="/api/storylines", tags=["storylines"])


@router.get("/cross")
def cross_table(fed_uid: Optional[int] = Query(None)):
    from services.roster_service import get_player_fed_uid
    if fed_uid is None:
        fed_uid = get_player_fed_uid()
    return get_storylines_cross(fed_uid)
