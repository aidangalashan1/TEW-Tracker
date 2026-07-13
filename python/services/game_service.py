from datastore import get_store
from models import GameInfo


def get_game_info() -> GameInfo:
    store = get_store()
    if not store:
        return GameInfo()

    gi = GameInfo(
        current_date=str(store.game_info.get("CurrentGameDate")) if store.game_info else None,
        start_date=str(store.game_info.get("StartDate")) if store.game_info else None,
        turn=store.game_info.get("Turn", 0) if store.game_info else 0,
        stage=store.game_info.get("Stage", 0) if store.game_info else 0,
    )
    if store.player_info:
        gi.player_worker_uid = store.player_info.get("Player", 0)
    controlled = [uid for uid, f in store.feds.items() if f.get("User_Controlled") == 1]
    if controlled:
        gi.player_fed_uid = controlled[0]
    return gi
