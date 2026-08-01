"""Small pure aggregation helpers over match/angle/segment rating lists,
shared by the roster list, worker detail, and form-guide builders."""

from datetime import datetime
from models import WorkerPerformance, RatingDisplay

MATCH_TYPE_NAMES = {
    0: "Angle", 1: "Singles", 2: "Tag", 3: "Trios",
    6: "3-Way", 7: "4-Way", 8: "5-Way",
    10: "Tag 3-Way", 12: "2 on 1 Handicap",
}


def _get_match_type_name(match_type: int, store) -> str:
    return store.match_types.get(match_type) or MATCH_TYPE_NAMES.get(match_type, f"Type {match_type}")


def _avg_rating(vals: list[dict]) -> int:
    ratings = [v["rating"] for v in vals if v.get("rating")]
    return round(sum(ratings) / len(ratings)) if ratings else 0


def _best_rating(vals: list[dict]) -> int:
    return max((v["rating"] for v in vals if v.get("rating")), default=0)


def _worst_rating(vals: list[dict]) -> int:
    return min((v["rating"] for v in vals if v.get("rating")), default=0)


def _best_info(vals: list[dict]) -> dict:
    best = max(vals, key=lambda v: v.get("rating", 0)) if vals else {}
    return {"rating": best.get("rating", 0), "log_entry": best.get("log_entry", ""), "label": best.get("label", ""), "card": best.get("card", "")}


def _worst_info(vals: list[dict]) -> dict:
    worst = min(vals, key=lambda v: v.get("rating", 0)) if vals else {}
    return {"rating": worst.get("rating", 0), "log_entry": worst.get("log_entry", ""), "label": worst.get("label", ""), "card": worst.get("card", "")}


def _compute_age(bday, game_date_val: datetime) -> int:
    if not game_date_val or not bday:
        return 0
    try:
        if isinstance(bday, datetime):
            age = game_date_val.year - bday.year
            if (game_date_val.month, game_date_val.day) < (bday.month, bday.day):
                age -= 1
            return age
    except:
        pass
    return 0


def _build_performance(matches: list[dict], angles: list[dict], segments: list[dict]) -> WorkerPerformance:
    """Shared performance-summary builder. get_roster (12-month/current-fed
    window) and get_worker_detail (full career) both feed this the same three
    segment-shaped lists — previously each hand-assembled the same 20-field
    WorkerPerformance independently."""
    durations = [v.get("length", 0) for v in segments if v.get("length")]
    return WorkerPerformance(
        avg_match_rating=RatingDisplay.from_raw(_avg_rating(matches)),
        avg_angle_rating=RatingDisplay.from_raw(_avg_rating(angles)),
        avg_segment_rating=RatingDisplay.from_raw(_avg_rating(segments)),
        best_match_rating=_best_rating(matches),
        worst_match_rating=_worst_rating(matches),
        best_angle_rating=_best_rating(angles),
        worst_angle_rating=_worst_rating(angles),
        best_segment_rating=_best_rating(segments),
        worst_segment_rating=_worst_rating(segments),
        best_segment_info=_best_info(segments),
        worst_segment_info=_worst_info(segments),
        best_match_info=_best_info(matches),
        worst_match_info=_worst_info(matches),
        best_angle_info=_best_info(angles),
        worst_angle_info=_worst_info(angles),
        last_5_match_ratings=matches[:5],
        last_5_angle_ratings=angles[:5],
        last_5_segment_ratings=segments[:5],
        total_matches=len(matches),
        total_angles=len(angles),
        total_segments=len(segments),
        avg_duration=round(sum(durations) / len(durations)) if durations else 0,
        total_duration=sum(durations) if durations else 0,
    )
