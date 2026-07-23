from fastapi import APIRouter
from datastore import get_store
from models import Belt

router = APIRouter(prefix="/api/belt", tags=["belt"])


@router.get("/{belt_uid}")
def belt_detail(belt_uid: int):
    store = get_store()
    if not store:
        return {"error": "No data"}, 500
    row = store.belts.get(belt_uid)
    if not row:
        return {"error": "Belt not found"}, 404
    data = Belt.from_db_row(row).model_dump()
    prestige_row = getattr(store, 'belt_prestige', {}).get(belt_uid)
    if prestige_row:
        months = []
        for i in range(1, 13):
            val = prestige_row.get(f"Month{i}")
            if val is not None and val != -1:
                months.append(round(val / 10))
        current_prestige = row.get("Prestige", 0)
        if current_prestige:
            months.append(round(current_prestige / 10))
        data["prestige_history"] = months
    return data
