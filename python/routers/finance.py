from fastapi import APIRouter, Query
from typing import Optional
from services.finance_service import (
    get_finance_summary,
    get_finance_history,
    get_finance_breakdown,
    get_wage_bill,
    get_finance_standing,
)

router = APIRouter(prefix="/api/finance", tags=["finance"])


def _resolve_fed_uid(fed_uid: Optional[int]) -> int:
    from services.roster_service import get_player_fed_uid
    return fed_uid if fed_uid is not None else get_player_fed_uid()


@router.get("/summary")
def finance_summary(fed_uid: Optional[int] = Query(None)):
    return get_finance_summary(_resolve_fed_uid(fed_uid))


@router.get("/history")
def finance_history(fed_uid: Optional[int] = Query(None)):
    return get_finance_history(_resolve_fed_uid(fed_uid))


@router.get("/breakdown")
def finance_breakdown(fed_uid: Optional[int] = Query(None)):
    return get_finance_breakdown(_resolve_fed_uid(fed_uid))


@router.get("/wages")
def finance_wages(fed_uid: Optional[int] = Query(None)):
    return get_wage_bill(_resolve_fed_uid(fed_uid))


@router.get("/standing")
def finance_standing(fed_uid: Optional[int] = Query(None)):
    return get_finance_standing(_resolve_fed_uid(fed_uid))
