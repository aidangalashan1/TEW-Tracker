"""Storyline idea suggestions for the player fed.

Given a selected worker, scores every other rostered worker as a potential
partner for two kinds of story and returns the best of each:

  * feud     — opposite alignment, bad chemistry, shared division / title
               stakes, and in-ring history make for a believable rivalry.
  * alliance — same alignment, good chemistry, and real backstage bonds
               (tblRelation professional/respect/friendship + mentor) point to
               a natural tag team, stable, or partnership.

Every signal traces to a literal column in the TEW save — nothing here invents
narrative; it surfaces the relationships the game already tracks but buries.
"""
from datetime import datetime

from datastore import get_store

# tblWorkerSkill columns for a rough star-power proxy (real column names —
# the previous version read Brawling/Aerial/Microphone/Acting/StarQuality,
# none of which exist, so the score was near-zero for everyone).
_STAR_SKILLS = ("Brawl", "Technical", "Air", "Charisma", "Mic", "Act", "Star")

# A storyline the two workers already shared makes a new one feel like a rehash,
# so a recent shared past storyline (tblStorylinePast) is penalised. The penalty
# eases to zero over ~2 years; past that it flips to a growing "nostalgia" bonus
# as fans start wanting the old story revived (capped so it never dominates).
_PAST_STORY_CROSSOVER_MONTHS = 24
_PAST_STORY_PENALTY = 40
_PAST_STORY_BONUS_CAP = 25
_PAST_STORY_BONUS_FULL_MONTHS = 24  # months past the crossover to reach the cap


def _past_story_delta(months_since_end: float) -> tuple[int, str | None]:
    """Score delta (and reason) for a pair's most recent shared past storyline.
    Negative while it still feels like a rehash, crossing to a capped nostalgia
    bonus after ~2 years."""
    if months_since_end < _PAST_STORY_CROSSOVER_MONTHS:
        frac = 1 - months_since_end / _PAST_STORY_CROSSOVER_MONTHS
        return -round(_PAST_STORY_PENALTY * frac), "Recently shared a storyline"
    over = months_since_end - _PAST_STORY_CROSSOVER_MONTHS
    bonus = min(_PAST_STORY_BONUS_CAP, round(_PAST_STORY_BONUS_CAP * over / _PAST_STORY_BONUS_FULL_MONTHS))
    return bonus, ("Overdue for a rematch" if bonus > 0 else None)


# A "rub": pairing a lesser worker with a bigger star in a story to get the
# lesser one over. Popularity supplies the rub; growth headroom (potential −
# current) says who can still benefit from it, and a giver who has stopped
# growing (current ≥ potential — popularity holding them at the top) can afford
# to hand it out. The gap must be *relative*: a believable step up, not a
# nobody rubbing shoulders with a main eventer. Applied to feuds and alliances.
_RUB_MIN_GAP = 12         # below this the two are peers — no rub
_RUB_IDEAL_GAP = 28       # a believable one-tier step up — peak plausibility
_RUB_MAX_GAP = 60         # beyond this the pairing isn't credible in one story
_RUB_MIN_GROWTH = 10      # receiver's potential − current (room to grow)
_RUB_CAP = 35


def _gap_plausibility(gap: int) -> float:
    """How believable a rub across this popularity gap is — a triangular window:
    zero at a peer-level gap, peaking at a one-tier step, then falling back to
    zero for an implausible mismatch (a nobody would not credibly rival, or be
    elevated by, a main eventer in a single story)."""
    if gap <= _RUB_MIN_GAP or gap >= _RUB_MAX_GAP:
        return 0.0
    if gap <= _RUB_IDEAL_GAP:
        return (gap - _RUB_MIN_GAP) / (_RUB_IDEAL_GAP - _RUB_MIN_GAP)
    return (_RUB_MAX_GAP - gap) / (_RUB_MAX_GAP - _RUB_IDEAL_GAP)


def _rub_delta(giver_pop: int, giver_growth: int, recv_pop: int, recv_growth: int) -> int:
    """Score bonus for a rub flowing from a bigger star (giver) to a lesser,
    higher-ceiling worker (receiver). Zero unless the receiver has room to grow
    and the popularity gap is a believable step (see _gap_plausibility)."""
    if recv_growth < _RUB_MIN_GROWTH:
        return 0
    plausibility = _gap_plausibility(giver_pop - recv_pop)
    if plausibility <= 0:
        return 0
    giver_maxed = max(0, -giver_growth)  # current > potential ⇒ established, ideal giver
    return round(min(_RUB_CAP, plausibility * (0.8 * recv_growth + 0.4 * giver_maxed)))


def _worker_score(store, uid: int) -> int:
    skills = store.skills.get(uid, {})
    total = sum((skills.get(k) or 0) for k in _STAR_SKILLS)
    return total // len(_STAR_SKILLS)


def _chem_between(store, a: int, b: int) -> int:
    """Signed chemistry for the player fed between two workers (0 if none).
    Honors Player==1 and skips IgnoreChem (pairings muted in-game)."""
    for cr in store.chemistry:
        if cr.get("Player") != 1 or cr.get("IgnoreChem"):
            continue
        if {cr.get("Person1"), cr.get("Person2")} == {a, b}:
            return cr.get("Chem") or 0
    return 0


def _shared_matches(store, a: int, b: int) -> tuple[int, int]:
    """(count, avg_rating) of matches both workers competed in."""
    a_matches = {mc["MatchLogUID"] for mc in store.match_log_competitors_by_worker.get(a, [])}
    shared = [
        m for m in a_matches
        if any(mc["Worker"] == b for mc in store.match_log_competitors_by_ml.get(m, []))
    ]
    if not shared:
        return 0, 0
    ratings = [
        store.match_log_by_uid[m]["Rating"]
        for m in shared
        if store.match_log_by_uid.get(m) and store.match_log_by_uid[m].get("Rating")
    ]
    avg = round(sum(ratings) / len(ratings)) if ratings else 0
    return len(shared), avg


def _stable_together(store, fed_uid: int, a: int, b: int) -> bool:
    for s in store.stables:
        if s.get("Fed") != fed_uid or not s.get("Active", True):
            continue
        members = {s.get(f"Member{i}") for i in range(1, 19)}
        members.discard(None)
        members.discard(0)
        if a in members and b in members:
            return True
    return False


def _team_together(store, fed_uid: int, a: int, b: int) -> bool:
    for t in store.teams:
        if t.get("Fed") != fed_uid:
            continue
        if {t.get("Worker1"), t.get("Worker2")} == {a, b}:
            return True
    return False


def _top(candidates: list[dict], key: str) -> list[dict]:
    ranked = [c for c in candidates if c[key] > 0]
    ranked.sort(key=lambda c: -c[key])
    out = []
    for c in ranked[:5]:
        out.append({
            "worker_uid": c["worker_uid"],
            "name": c["name"],
            "picture": c["picture"],
            "score": c[key],
            "reasons": [r for _, r in sorted(c[f"{key}_reasons"], reverse=True)][:3],
        })
    return out


def get_storyline_ideas(fed_uid: int, worker_uid: int | None = None) -> dict:
    store = get_store()
    if not store:
        return {"feuds": [], "alliances": []}

    contract_uids = {c["WorkerUID"] for c in store.contracts_by_fed.get(fed_uid, [])}
    if worker_uid is None or worker_uid not in contract_uids:
        return {"feuds": [], "alliances": []}

    workers_list = [store.workers[uid] for uid in contract_uids if uid in store.workers]
    worker_names = {r["UID"]: r.get("Name", "") for r in workers_list}
    worker_pics = {r["UID"]: r.get("Picture", "") for r in workers_list}

    contracts_by_worker = {c["WorkerUID"]: c for c in store.contracts if c["WorkerUID"] in contract_uids}

    # Storylines a worker is currently tied up in (+ heat on the UI's 0–100
    # scale; raw is 0–1000). Presence in tblStoryline already means active —
    # a storyline that has concluded is moved to tblStorylinePast — so every
    # non-deleted row counts, with no furthered/heat gate.
    active_heat: dict[int, int] = {}
    for sl in store.fed_storylines.get(fed_uid, []):
        if sl.get("ToDelete"):
            continue
        active_heat[sl["UID"]] = round((sl.get("Heat") or 0) / 10)
    involved_heat: dict[int, int] = {}
    for inv in store.storyline_involved:
        sl_uid = inv["StorylineUID"]
        if sl_uid in active_heat:
            wu = inv["WorkerUID"]
            involved_heat[wu] = max(involved_heat.get(wu, 0), active_heat[sl_uid])

    game_date = store.game_date_val

    # Reuse the canonical popularity / ability-vs-potential scores (single source
    # of truth in roster_service) rather than recomputing them here.
    from services.roster_service import get_roster
    scored = {w.uid: w for w in get_roster(fed_uid)}

    def _pop_growth(uid):
        w = scored.get(uid)
        if not w:
            return 0, 0
        pop = w.pop.pct if w.pop else 0
        return pop, (w.potential_score or 0) - (w.current_score or 0)

    w_pop, w_growth = _pop_growth(worker_uid)

    def _contract_bits(uid):
        c = contracts_by_worker.get(uid, {})
        return (
            bool(c.get("Face")),
            c.get("Perception") or 3,
            c.get("Division") or 0,
        )

    w_face, w_perception, w_division = _contract_bits(worker_uid)
    w_score = _worker_score(store, worker_uid)

    candidates = []
    for uid in contract_uids:
        if uid == worker_uid:
            continue
        c_face, c_perception, c_division = _contract_bits(uid)

        feud = 0
        alliance = 0
        feud_reasons: list[tuple[int, str]] = []
        ally_reasons: list[tuple[int, str]] = []

        # ── disposition ──
        if w_face != c_face:
            feud += 55
            feud_reasons.append((55, "Opposite alignment"))
        else:
            alliance += 40
            ally_reasons.append((40, "Same alignment"))

        # ── chemistry (real signed magnitude) ──
        chem = _chem_between(store, worker_uid, uid)
        if chem > 0:
            pts = min(chem * 3, 45)
            alliance += pts
            ally_reasons.append((pts, "Great chemistry together"))
        elif chem < 0:
            pts = min(-chem * 3, 45)
            feud += pts
            feud_reasons.append((pts, "Bad chemistry — natural heat"))
            alliance -= 20  # they don't gel; a poor tag pairing

        # ── backstage relationships (alliance signal) ──
        rel = store.relations_by_pair.get(frozenset((worker_uid, uid)))
        if rel:
            p, r, f = rel.get("P_Rel") or 0, rel.get("R_Rel") or 0, rel.get("F_Rel") or 0
            if rel.get("Mentor"):
                alliance += 45
                ally_reasons.append((45, "Mentor / protégé bond"))
            if f >= 5:
                alliance += 40
                ally_reasons.append((40, "Close friends"))
            elif f >= 3:
                alliance += 18
                ally_reasons.append((18, "On friendly terms"))
            if r >= 5:
                alliance += 30
                ally_reasons.append((30, "Deep mutual respect"))
            elif r >= 3:
                alliance += 12
                ally_reasons.append((12, "Mutual respect"))
            if p >= 5:
                alliance += 25
                ally_reasons.append((25, "Strong working relationship"))
            elif p >= 3:
                alliance += 12
                ally_reasons.append((12, "Good working relationship"))

        # ── established pairings ──
        if _team_together(store, fed_uid, worker_uid, uid):
            alliance += 35
            ally_reasons.append((35, "Established tag team"))
        if _stable_together(store, fed_uid, worker_uid, uid):
            alliance += 30
            ally_reasons.append((30, "Stablemates"))

        # ── division / title stakes (feud signal) ──
        if w_division and c_division and w_division == c_division:
            feud += 30
            feud_reasons.append((30, "Same division"))
        w_champ, c_champ = worker_uid in store.champ_set, uid in store.champ_set
        if (w_champ or c_champ) and not (w_champ and c_champ) and abs(w_perception - c_perception) <= 2:
            feud += 25
            feud_reasons.append((25, "Champion vs. contender"))

        # ── in-ring history ──
        count, avg = _shared_matches(store, worker_uid, uid)
        if count:
            pts = min(count * 5, 25)
            feud += pts
            feud_reasons.append((pts, f"{count} match{'es' if count != 1 else ''} together"))
            if avg >= 60:
                alliance += 15
                ally_reasons.append((15, "Work well together in the ring"))

        # ── comparable stature ──
        if abs(w_perception - c_perception) <= 1:
            feud += 20
            alliance += 15
            feud_reasons.append((20, "Similar star power"))
            ally_reasons.append((15, "Similar star power"))
        if w_score and _worker_score(store, uid) >= w_score * 0.7:
            feud += 10
            alliance += 10

        # ── availability / staleness ──
        heat = involved_heat.get(uid)
        if heat is None:
            feud += 25
            alliance += 20
            feud_reasons.append((25, "Not in a storyline"))
            ally_reasons.append((20, "Not in a storyline"))
        elif heat < 40:
            feud += 12
            alliance += 10
            feud_reasons.append((12, "In a cooling storyline"))
            ally_reasons.append((10, "In a cooling storyline"))

        # ── shared storyline history (rehash penalty → nostalgia revival) ──
        end = store.past_storyline_end_by_pair.get(frozenset((worker_uid, uid)))
        if isinstance(end, datetime) and isinstance(game_date, datetime):
            months = (game_date - end).days / 30.44
            delta, reason = _past_story_delta(months)
            feud += delta
            alliance += delta
            if delta > 0 and reason:  # only surface the positive (revival) case
                feud_reasons.append((delta, reason))
                ally_reasons.append((delta, reason))

        # ── the "rub": a bigger star elevating a lesser, higher-ceiling worker ──
        c_pop, c_growth = _pop_growth(uid)
        if c_pop >= w_pop:  # candidate is the bigger star → gives the selected worker a rub
            rub, rub_reason = _rub_delta(c_pop, c_growth, w_pop, w_growth), "Rub from a bigger star"
        else:               # selected worker is bigger → can elevate the candidate
            rub, rub_reason = _rub_delta(w_pop, w_growth, c_pop, c_growth), "Chance to elevate them"
        if rub > 0:
            feud += rub
            alliance += rub
            feud_reasons.append((rub, rub_reason))
            ally_reasons.append((rub, rub_reason))

        candidates.append({
            "worker_uid": uid,
            "name": worker_names.get(uid, ""),
            "picture": worker_pics.get(uid, ""),
            "feud": feud,
            "alliance": alliance,
            "feud_reasons": feud_reasons,
            "alliance_reasons": ally_reasons,
        })

    return {"feuds": _top(candidates, "feud"), "alliances": _top(candidates, "alliance")}
