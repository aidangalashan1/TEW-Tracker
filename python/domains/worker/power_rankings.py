"""Power rankings — a single ranked list of the player fed's roster that
blends "how good is this worker on paper" (current_score) with "what have
they actually been doing" (recent win/loss, match ratings, push/perception,
title/main-event involvement, storyline heat).

The paper-rating weight decays as the game goes on and is replaced by the
in-game track record: early in a save there's no booking history yet, so
current_score is nearly the whole story; a couple of years in, what's
actually been booked matters far more than the day-one scout rating.

Snapshots are written to disk (core.storage.rankings_dir) each time the
in-game date advances past the last stored snapshot, so the UI can show
rank deltas ("↑3") against the previous ranking.
"""
import os
from datetime import datetime, timedelta

from core.datastore import get_store
from core.storage import rankings_dir
from core.json_store import read_json_or_default, write_json
from domains.storyline.ideas import get_involved_heat
from domains.worker.roster import get_roster

_LOOKBACK_MATCHES = 8
_SNAPSHOT_HISTORY_CAP = 52  # ~a year of weekly snapshots

# Weight schedule: (current_score, momentum, prominence) at game start (p=0)
# and after ~2 full in-game years (p=1); storyline heat stays fixed. Each
# pair always sums to 1 with the fixed storyline weight.
_W_START = {"current": 0.55, "momentum": 0.20, "prominence": 0.15}
_W_END = {"current": 0.15, "momentum": 0.40, "prominence": 0.35}
_W_STORYLINE = 0.10
_DECAY_MONTHS = 24  # months of in-game time to fully decay to _W_END

_CHAMPION_BONUS = 8
_TITLE_PICTURE_BONUS = 4  # top-two perception tier, not (yet) champion


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _months_elapsed(store) -> float:
    start_raw = (store.game_info or {}).get("StartDate")
    game_date = store.game_date_val
    if not start_raw or not game_date:
        return 0.0
    try:
        start_dt = start_raw if isinstance(start_raw, datetime) else \
            datetime.strptime(str(start_raw).split()[0], "%Y-%m-%d")
    except (ValueError, TypeError):
        return 0.0
    return max(0.0, (game_date - start_dt).days / 30.44)


def _weights(store) -> dict:
    p = min(1.0, _months_elapsed(store) / _DECAY_MONTHS)
    return {
        "current": _lerp(_W_START["current"], _W_END["current"], p),
        "momentum": _lerp(_W_START["momentum"], _W_END["momentum"], p),
        "prominence": _lerp(_W_START["prominence"], _W_END["prominence"], p),
        "storyline": _W_STORYLINE,
    }


def _recent_fed_matches(store, uid: int, fed_uid: int) -> list[dict]:
    """Up to _LOOKBACK_MATCHES most recent matches this worker had on this
    fed's cards, newest first, each with rating/win/title/card info."""
    out = []
    for mc in store.match_log_competitors_by_worker.get(uid, []):
        ml = store.match_log_by_uid.get(mc["MatchLogUID"])
        if not ml:
            continue
        card = store.past_cards.get(ml.get("CardUID"))
        if not card or card.get("Fed") != fed_uid:
            continue
        card_date = card.get("PastCardWhen")
        if not card_date:
            continue
        rating = round((ml.get("Rating") or 0) / 10)
        card_matches = store.match_log_competitors_by_ml.get(ml["UID"], [])
        card_top_rating = rating  # this match's own rating is the comparison basis
        others_on_card = [
            round((store.match_log_by_uid[m2["MatchLogUID"]].get("Rating") or 0) / 10)
            for m2 in store.match_log_competitors_by_worker.get(uid, [])
            if store.match_log_by_uid.get(m2["MatchLogUID"], {}).get("CardUID") == ml.get("CardUID")
        ]
        out.append({
            "date": card_date,
            "rating": rating,
            "won": ml.get("Victor", 0) > 0 and mc.get("Side") == ml.get("Victor"),
            "decided": ml.get("Victor", 0) > 0,
            "title": bool(ml.get("Title1") or ml.get("Title2")),
            "main_event": rating >= max(others_on_card, default=rating),
        })
    out.sort(key=lambda m: m["date"], reverse=True)
    return out[:_LOOKBACK_MATCHES]


def _momentum_and_prominence(matches: list[dict], perception: int | None) -> tuple[float, float]:
    n = len(matches)
    perception_score = max(0.0, (5 - (perception if perception is not None else 5)) / 5) * 100

    if n == 0:
        return 30.0, perception_score  # no recent booking history — neutral momentum, push still counts

    total_w = 0.0
    win_acc = rating_acc = 0.0
    title_hits = main_event_hits = 0
    for i, m in enumerate(matches):
        w = (n - i) / n  # most recent match weighted highest
        total_w += w
        if m["decided"]:
            win_acc += w * (1.0 if m["won"] else 0.0)
        else:
            win_acc += w * 0.5
        rating_acc += w * m["rating"]
        title_hits += m["title"]
        main_event_hits += m["main_event"]

    win_pct = win_acc / total_w
    avg_rating = rating_acc / total_w
    momentum = 0.5 * (win_pct * 100) + 0.5 * avg_rating

    title_rate = (title_hits / n) * 100
    main_event_rate = (main_event_hits / n) * 100
    prominence = 0.5 * perception_score + 0.3 * title_rate + 0.2 * main_event_rate

    return momentum, prominence


def _snapshot_path(fed_uid: int) -> str:
    return os.path.join(rankings_dir(), f"{fed_uid}.json")


def _apply_snapshot(fed_uid: int, ranked: list[dict], today: str) -> dict[int, int]:
    """Persist today's ranks if the in-game date has advanced since the last
    snapshot; return the previous snapshot's ranks (uid -> rank) for deltas."""
    path = _snapshot_path(fed_uid)
    history = read_json_or_default(path, {"snapshots": []})
    snapshots = history.get("snapshots", [])
    current_ranks = {str(r["worker_uid"]): r["rank"] for r in ranked}

    if snapshots and snapshots[-1]["date"] == today:
        prev_ranks = snapshots[-2]["ranks"] if len(snapshots) >= 2 else {}
        snapshots[-1]["ranks"] = current_ranks
    else:
        prev_ranks = snapshots[-1]["ranks"] if snapshots else {}
        snapshots.append({"date": today, "ranks": current_ranks})
        snapshots = snapshots[-_SNAPSHOT_HISTORY_CAP:]

    write_json(path, {"snapshots": snapshots})
    return {int(k): v for k, v in prev_ranks.items()}


def get_power_rankings(fed_uid: int) -> dict:
    store = get_store()
    if not store:
        return {"rankings": [], "weights": {}}

    roster = get_roster(fed_uid)
    if not roster:
        return {"rankings": [], "weights": {}}

    weights = _weights(store)
    involved_heat = get_involved_heat(fed_uid, store)
    champ_set = getattr(store, "champ_set", set())

    scored = []
    for w in roster:
        if not w.get("is_wrestler", True):
            continue
        uid = w["uid"]
        contract = w.get("contract") or {}
        perception = contract.get("perception")
        current_score = w.get("current_score", 0) or 0

        matches = _recent_fed_matches(store, uid, fed_uid)
        momentum, prominence = _momentum_and_prominence(matches, perception)
        storyline = involved_heat.get(uid, 0)

        total = (
            weights["current"] * current_score
            + weights["momentum"] * momentum
            + weights["prominence"] * prominence
            + weights["storyline"] * storyline
        )
        if uid in champ_set:
            total += _CHAMPION_BONUS
        elif perception is not None and perception <= 1:
            total += _TITLE_PICTURE_BONUS
        total = round(max(0.0, min(100.0, total)), 1)

        scored.append({
            "worker_uid": uid,
            "name": w.get("name", ""),
            "picture": w.get("picture", ""),
            "score": total,
            "current_score": current_score,
            "momentum": round(momentum),
            "prominence": round(prominence),
            "storyline_heat": storyline,
            "is_champion": uid in champ_set,
            "matches_considered": len(matches),
        })

    scored.sort(key=lambda r: -r["score"])
    for i, r in enumerate(scored):
        r["rank"] = i + 1

    game_date = store.game_date_val
    today = game_date.strftime("%Y-%m-%d") if game_date else datetime.now().strftime("%Y-%m-%d")
    prev_ranks = _apply_snapshot(fed_uid, scored, today)

    for r in scored:
        prev = prev_ranks.get(r["worker_uid"])
        r["prev_rank"] = prev
        r["delta"] = (prev - r["rank"]) if prev is not None else None

    return {"rankings": scored, "weights": {k: round(v, 3) for k, v in weights.items()}}
