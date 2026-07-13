from datastore import get_store
from models import (
    Worker, WorkerSkills, WorkerPhysical, WorkerContract,
    OvernessEntry, RatingDisplay, WinLoss, StorylineAssignment,
    WorkerPerformance, TagTeamInfo, StableInfo, ChemistryInfo,
)
from regions import REGION_TO_AREA, AREAS
from datetime import datetime, timedelta
from morale_types import NEGATIVE_MORALE

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


def get_player_fed_uid() -> int:
    store = get_store()
    if not store:
        return 0
    controlled = [uid for uid, f in store.feds.items() if f.get("User_Controlled") == 1]
    return controlled[0] if controlled else 0


def get_fed_home_area(fed_uid: int) -> str:
    store = get_store()
    if not store:
        return ""
    row = store.feds.get(fed_uid)
    return REGION_TO_AREA.get(row["Based_In"], "") if row else ""


def get_roster(fed_uid: int = None) -> list[Worker]:
    store = get_store()
    if not store:
        return []

    if fed_uid is None:
        fed_uid = get_player_fed_uid()

    home_area = get_fed_home_area(fed_uid)
    area_region_ids = AREAS.get(home_area, [])
    game_date_val = store.game_date_val

    contracts = store.contracts_by_fed.get(fed_uid, [])
    if not contracts:
        return []

    uids = [c["WorkerUID"] for c in contracts]
    uids_set = set(uids)
    twelve_months_ago = (game_date_val - timedelta(days=365)) if game_date_val else (datetime.now() - timedelta(days=365))

    # ── Win/loss from match log ──
    wl_map: dict[int, dict[str, int]] = {}
    match_log_by_card = {}
    for ml in store.match_log:
        card = store.past_cards.get(ml["CardUID"])
        if card and card.get("Fed") == fed_uid and card.get("PastCardWhen", datetime.min) >= twelve_months_ago:
            match_log_by_card[ml["UID"]] = ml
    for mc in store.match_log_competitors:
        ml = match_log_by_card.get(mc["MatchLogUID"])
        if ml and mc["Worker"] in uids_set and ml["Victor"] > 0:
            rec = wl_map.setdefault(mc["Worker"], {"wins": 0, "losses": 0, "draws": 0})
            if mc["Side"] == ml["Victor"]:
                rec["wins"] += 1
            else:
                rec["losses"] += 1

    # ── Performance from match log ──
    perf_by_worker: dict[int, dict] = {}
    for ml_uid, ml in match_log_by_card.items():
        for mc in store.match_log_competitors_by_ml.get(ml_uid, []):
            worker = mc["Worker"]
            if worker not in uids_set:
                continue
            if worker not in perf_by_worker:
                perf_by_worker[worker] = {"match": [], "angle": [], "segment": []}
            mt = ml["Match_Type"]
            entry = ml["Rating"] if mt == 0 else (mc["Performance"] or ml["Rating"] or 0)
            if not entry:
                continue
            label = MATCH_TYPE_NAMES.get(mt) or store.match_types.get(mt) or f"Type {mt}"
            card_name = (store.past_cards.get(ml["CardUID"], {}).get("CardName") or "").strip()
            seg = {"rating": entry, "label": label, "card": card_name, "log_entry": (ml.get("LogEntry") or "").strip()}
            ts = ml.get("TimeStampText")
            if ts:
                try:
                    parts = str(ts).strip().split(":")
                    if len(parts) == 3:
                        seg["length"] = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                    elif len(parts) == 2:
                        seg["length"] = int(parts[0]) * 60 + int(parts[1])
                except (ValueError, IndexError):
                    pass
            perf_by_worker[worker]["segment"].append(seg)
            if mt == 0:
                perf_by_worker[worker]["angle"].append(seg)
            else:
                perf_by_worker[worker]["match"].append(seg)

    # ── Unhappy map from morale ──
    unhappy_map = {}
    latest_morale = {}
    for r in store.morale:
        if r["MoraleType"] >= 100:
            continue
        uid = r["WorkerUID"]
        dt = r.get("MoraleDate")
        if dt and (uid not in latest_morale or dt > latest_morale[uid]):
            latest_morale[uid] = dt
            reason = NEGATIVE_MORALE.get(r["MoraleType"], f"MoraleType {r['MoraleType']}")
            ctx = (r.get("ShowName") or "").strip()
            if ctx:
                reason = f"{reason}: {ctx}"
            for lvl_name, col in [("Furious", "Level1"), ("Angry", "Level2"), ("Annoyed", "Level3")]:
                val = r.get(col)
                if val and val > 0:
                    intensity = f"{lvl_name} ({val}w)"
                    break
            else:
                val = r.get("Level4") or 0
                intensity = f"Irritated ({val}w)"
            unhappy_map[uid] = f"{reason} - {intensity}"

    # ── Assemble workers ──
    result = []
    for c in contracts:
        uid = c["WorkerUID"]
        w_row = store.workers.get(uid)
        if w_row is None:
            continue

        w = Worker.from_db_row(w_row)
        w.skills = WorkerSkills.from_db_row(store.skills.get(uid, {})) if uid in store.skills else None
        w.physical = WorkerPhysical.from_db_row(store.physical.get(uid, {})) if uid in store.physical else None
        w.contract = WorkerContract.from_db_row(c)

        cname = c.get("Name", "").strip()
        if cname:
            w.name = cname

        over_row = store.overness.get(uid)
        if over_row:
            w.overness = [
                OvernessEntry(region=i, value=RatingDisplay.from_raw(over_row.get(f"Over{i}", 0)))
                for i in range(1, 58)
            ]
            if area_region_ids:
                vals = [over_row.get(f"Over{i}", 0) for i in area_region_ids]
                avg = round(sum(vals) / len(vals)) if vals else 0
                w.pop = RatingDisplay.from_raw(avg)
            w.home_area = home_area
            w.home_region = REGION_TO_AREA.get(w.based_in, "")
            raw_home = over_row.get(f"Over{w.based_in}", 0)
            w.home_region_pop = RatingDisplay.from_raw(raw_home)

        wl = wl_map.get(uid)
        if wl:
            w.win_loss = WinLoss(**wl)

        flags = []
        if uid in store.injured_set:
            flags.append("injured")
        if uid in unhappy_map:
            flags.append(f"unhappy:{unhappy_map[uid]}")
        if uid in store.away_set:
            flags.append("absent")
        if uid in store.goal_set:
            flags.append("promise")
        if uid in store.champ_set:
            flags.append("champion")
        w.status = flags

        w.age = _compute_age(w_row.get("Birthday"), game_date_val)

        biz = store.worker_business.get(uid)
        if biz:
            for k in ("Business", "Booking_Reputation", "Booking_Skill"):
                v = biz.get(k)
                if v is not None:
                    setattr(w, k, v)

        # Storylines
        sl_uids_for_worker = store.storyline_workers.get(uid, [])
        assignments = []
        for sl in store.fed_storylines.get(fed_uid, []):
            if sl["UID"] not in sl_uids_for_worker:
                continue
            involved = store.storyline_involved_by_sl.get(sl["UID"], [])
            involved_with = [
                {"uid": i["uid"], "name": i["name"], "alignment": i["alignment"], "major_role": i["major_role"]}
                for i in ({"uid": r["WorkerUID"], "name": store.workers.get(r["WorkerUID"], {}).get("Name", "") or "", "alignment": r.get("Alignment", 0) or 0, "major_role": bool(r.get("MajorRole"))} for r in involved) if i["uid"] != uid
            ]
            major = uid in store.storyline_major.get(sl["UID"], set())
            assignments.append(StorylineAssignment(
                storyline_uid=sl["UID"],
                storyline_name=sl.get("Name") or "",
                heat=RatingDisplay.from_raw(sl.get("Heat") or 0),
                major_role=major,
                involved_with=involved_with,
            ))
        if assignments:
            w.storylines = assignments

        # Performance
        perf = perf_by_worker.get(uid)
        if perf:
            durations = [v.get("length", 0) for v in perf["segment"] if v.get("length")]
            w.performance = WorkerPerformance(
                avg_match_rating=RatingDisplay.from_raw(_avg_rating(perf["match"])),
                avg_angle_rating=RatingDisplay.from_raw(_avg_rating(perf["angle"])),
                avg_segment_rating=RatingDisplay.from_raw(_avg_rating(perf["segment"])),
                best_match_rating=_best_rating(perf["match"]),
                worst_match_rating=_worst_rating(perf["match"]),
                best_angle_rating=_best_rating(perf["angle"]),
                worst_angle_rating=_worst_rating(perf["angle"]),
                best_segment_rating=_best_rating(perf["segment"]),
                worst_segment_rating=_worst_rating(perf["segment"]),
                best_segment_info=_best_info(perf["segment"]),
                worst_segment_info=_worst_info(perf["segment"]),
                best_match_info=_best_info(perf["match"]),
                worst_match_info=_worst_info(perf["match"]),
                best_angle_info=_best_info(perf["angle"]),
                worst_angle_info=_worst_info(perf["angle"]),
                last_5_match_ratings=perf["match"][:5],
                last_5_angle_ratings=perf["angle"][:5],
                last_5_segment_ratings=perf["segment"][:5],
                total_matches=len(perf["match"]),
                total_angles=len(perf["angle"]),
                total_segments=len(perf["segment"]),
                avg_duration=round(sum(durations) / len(durations)) if durations else 0,
                total_duration=sum(durations) if durations else 0,
            )

        # Tag teams
        tags = []
        for r in store.teams:
            if r.get("Fed") not in (fed_uid, 0):
                continue
            if r.get("Worker1") == uid:
                partner = r["Worker2"]
                tags.append({"name": r.get("Name") or "", "partner": partner, "exp": r.get("Experience", 0)})
            elif r.get("Worker2") == uid:
                partner = r["Worker1"]
                tags.append({"name": r.get("Name") or "", "partner": partner, "exp": r.get("Experience", 0)})
        if tags:
            w.tag_teams = [
                TagTeamInfo(name=t["name"], partner_name=store.workers.get(t["partner"], {}).get("Name", "") or "" if t["partner"] in store.workers else "", partner_uid=t["partner"], experience=t["exp"])
                for t in tags
            ]

        # Stables
        stabs = []
        for sr in store.stables:
            if sr.get("Fed") != fed_uid:
                continue
            for i in range(1, 19):
                if sr.get(f"Member{i}") == uid:
                    stabs.append({"name": sr.get("Name") or "", "leader": sr.get(f"Role{i}", 0) == 1})
        if stabs:
            w.stables = [StableInfo(name=s["name"], leader=s["leader"]) for s in stabs]

        # Chemistry
        chems = []
        for cr in store.chemistry:
            if cr.get("Player") != 1:
                continue
            cval = 1 if cr["Chem"] > 0 else -1
            if cr["Person1"] == uid:
                chems.append({"worker": cr["Person2"], "chem": cval})
            elif cr["Person2"] == uid:
                chems.append({"worker": cr["Person1"], "chem": cval})
        if chems:
            w.chemistry = [
                ChemistryInfo(worker_name=store.workers.get(c["worker"], {}).get("Name", "") or "" if c["worker"] in store.workers else "", worker_uid=c["worker"], chemistry=c["chem"])
                for c in chems
            ]

        result.append(w)

    return result


def _get_worker_segments(store, worker_uid: int) -> list[dict]:
    """Every match/angle a worker has ever competed in, across every fed and
    card in the save — not scoped to a fed or a time window. `rating` is the
    RAW (pre-/10) value, matching _avg_rating/_best_rating/_best_info's
    convention; get_worker_form() converts to a display percentage.
    """
    segments = []
    for mc in store.match_log_competitors_by_worker.get(worker_uid, []):
        ml = store.match_log_by_uid.get(mc["MatchLogUID"])
        if not ml:
            continue
        card = store.past_cards.get(ml["CardUID"])
        if not card:
            continue
        mt = ml.get("Match_Type", 0)
        is_angle = mt == 0
        rating = ml["Rating"] if is_angle else (mc.get("Performance") or ml.get("Rating") or 0)
        if not rating:
            continue

        fed_uid = card.get("Fed", 0)
        fed_row = store.feds.get(fed_uid)
        my_side = mc.get("Side")
        victor = ml.get("Victor", 0)

        allies, opponents = [], []
        for o in store.match_log_competitors_by_ml.get(mc["MatchLogUID"], []):
            if o["Worker"] == worker_uid:
                continue
            w_row = store.workers.get(o["Worker"])
            entry = {
                "uid": o["Worker"],
                "name": (w_row.get("Name") if w_row else "") or "",
                "picture": (w_row.get("Picture") if w_row else "") or "",
            }
            (allies if o.get("Side") == my_side else opponents).append(entry)

        raw_date = card.get("PastCardWhen")
        length = None
        ts = ml.get("TimeStampText")
        if ts:
            try:
                parts = str(ts).strip().split(":")
                if len(parts) == 3:
                    length = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                elif len(parts) == 2:
                    length = int(parts[0]) * 60 + int(parts[1])
            except (ValueError, IndexError):
                pass

        segments.append({
            "match_log_uid": mc["MatchLogUID"],
            "date": str(raw_date)[:10] if raw_date else "",
            "length": length,
            "fed_uid": fed_uid,
            "fed_name": (fed_row.get("Name") if fed_row else "") or "",
            "card_uid": card.get("UID"),
            "card": (card.get("CardName") or "").strip(),
            "is_tv": bool(card.get("TV")),
            "is_angle": is_angle,
            "rating": rating,
            "label": MATCH_TYPE_NAMES.get(mt) or store.match_types.get(mt) or f"Type {mt}",
            "log_entry": (ml.get("LogEntry") or "").strip(),
            "is_title_match": bool(ml.get("Title1") or ml.get("Title2")),
            "won": bool(victor and my_side == victor),
            "lost": bool(victor and my_side != victor),
            "allies": allies,
            "opponents": opponents,
        })

    segments.sort(key=lambda s: s["date"], reverse=True)
    return segments


def _pct(v: int) -> int:
    return round(v / 10)


def _avg_pct(vals: list[dict]) -> int:
    return _pct(_avg_rating(vals)) if vals else 0


def _summarize_segments(raw_segments: list[dict]) -> dict:
    matches = [s for s in raw_segments if not s["is_angle"]]
    angles = [s for s in raw_segments if s["is_angle"]]
    return {
        "total_segments": len(raw_segments),
        "total_matches": len(matches),
        "total_angles": len(angles),
        "avg_rating": _avg_pct(raw_segments),
        "avg_match_rating": _avg_pct(matches),
        "avg_angle_rating": _avg_pct(angles),
        "best_rating": _pct(_best_rating(raw_segments)),
        "worst_rating": _pct(_worst_rating(raw_segments)) if raw_segments else 0,
        "wins": sum(1 for s in matches if s["won"]),
        "losses": sum(1 for s in matches if s["lost"]),
        "title_matches": sum(1 for s in raw_segments if s["is_title_match"]),
    }


def get_worker_form(worker_uid: int) -> dict:
    """The 'Form' tab: full career match/angle history for one worker, with
    summary stats — deliberately unscoped by fed or time window, unlike the
    roster list's 12-month/current-fed performance snapshot."""
    store = get_store()
    if not store:
        return {"summary": None, "segments": []}

    raw_segments = _get_worker_segments(store, worker_uid)
    summary = _summarize_segments(raw_segments)
    segments = [{**s, "rating": _pct(s["rating"])} for s in raw_segments]
    return {"summary": summary, "segments": segments}


def get_roster_form(fed_uid: int) -> dict:
    """Roster-wide form guide: every current roster member's full-career
    performance summary + a recent-form trend strip, for the standalone
    Form module (as opposed to one worker's tab on their own profile)."""
    store = get_store()
    if not store:
        return {"fed_uid": fed_uid, "workers": []}

    contracts = store.contracts_by_fed.get(fed_uid, [])
    result = []
    for c in contracts:
        uid = c["WorkerUID"]
        w_row = store.workers.get(uid)
        if not w_row:
            continue
        raw_segments = _get_worker_segments(store, uid)
        summary = _summarize_segments(raw_segments)
        name = (c.get("Name") or w_row.get("Name") or "").strip()
        picture = c.get("Picture") or w_row.get("Picture") or ""
        recent = [_pct(s["rating"]) for s in raw_segments[:10]]
        result.append({
            "uid": uid,
            "name": name,
            "picture": picture,
            "face": bool(c.get("Face", True)),
            "summary": summary,
            "recent_ratings": recent,
        })

    return {"fed_uid": fed_uid, "workers": result}


def get_worker_detail(worker_uid: int, fed_uid: int = None) -> Worker | None:
    store = get_store()
    if not store:
        return None

    w_row = store.workers.get(worker_uid)
    if not w_row:
        return None

    w = Worker.from_db_row(w_row)

    skill_row = store.skills.get(worker_uid)
    if skill_row:
        w.skills = WorkerSkills.from_db_row(skill_row)

    phys_row = store.physical.get(worker_uid)
    if phys_row:
        w.physical = WorkerPhysical.from_db_row(phys_row)

    contract_rows = store.contracts_by_worker.get(worker_uid, [])
    if contract_rows:
        w.contract = WorkerContract.from_db_row(contract_rows[0])
        fed_ids = set()
        for cr in contract_rows:
            fed = cr.get("FedUID")
            if fed and fed > 0:
                fed_ids.add(fed)
            parent = cr.get("ParentFedUID")
            if parent and parent > 0:
                fed_ids.add(parent)
        if fed_ids:
            w.all_fed_ids = list(fed_ids)

    over_row = store.overness.get(worker_uid)
    if over_row:
        w.overness = [
            OvernessEntry(region=i, value=RatingDisplay.from_raw(over_row.get(f"Over{i}", 0)))
            for i in range(1, 58)
        ]
        if fed_uid is None:
            controlled = [uid for uid, f in store.feds.items() if f.get("User_Controlled") == 1]
            fed_uid = controlled[0] if controlled else None
        if fed_uid:
            fed_row = store.feds.get(fed_uid)
            if fed_row:
                home_area = REGION_TO_AREA.get(fed_row["Based_In"], "")
                area_region_ids = AREAS.get(home_area, [])
                if area_region_ids:
                    vals = [over_row.get(f"Over{i}", 0) for i in area_region_ids]
                    avg = round(sum(vals) / len(vals)) if vals else 0
                    w.pop = RatingDisplay.from_raw(avg)
        if w.pop.pct == 0:
            all_vals = [over_row.get(f"Over{i}", 0) for i in range(1, 58)]
            w.pop = RatingDisplay.from_raw(round(sum(all_vals) / len(all_vals)))

    game_date_val = store.game_date_val
    w.age = _compute_age(w_row.get("Birthday"), game_date_val)

    biz = store.worker_business.get(worker_uid)
    if biz:
        for k in ("Business", "Booking_Reputation", "Booking_Skill"):
            v = biz.get(k)
            if v is not None:
                setattr(w, k, v)

    w.attributes = [r["Attribute"] for r in store.attributes if r["WorkerUID"] == worker_uid and not r.get("Hidden")]
    w.injury_count = sum(1 for r in store.injury_history if r["WorkerUID"] == worker_uid)

    # Performance — deliberately the worker's full career (every fed, all time),
    # not the roster list's 12-month/current-fed snapshot: this is their own
    # profile page, not a roster comparison.
    raw_segments = _get_worker_segments(store, worker_uid)
    if raw_segments:
        matches = [s for s in raw_segments if not s["is_angle"]]
        angles = [s for s in raw_segments if s["is_angle"]]
        durations = [v.get("length", 0) for v in raw_segments if v.get("length")]
        w.performance = WorkerPerformance(
            avg_match_rating=RatingDisplay.from_raw(_avg_rating(matches)),
            avg_angle_rating=RatingDisplay.from_raw(_avg_rating(angles)),
            avg_segment_rating=RatingDisplay.from_raw(_avg_rating(raw_segments)),
            best_match_rating=_best_rating(matches),
            worst_match_rating=_worst_rating(matches),
            best_angle_rating=_best_rating(angles),
            worst_angle_rating=_worst_rating(angles),
            best_segment_rating=_best_rating(raw_segments),
            worst_segment_rating=_worst_rating(raw_segments),
            best_segment_info=_best_info(raw_segments),
            worst_segment_info=_worst_info(raw_segments),
            best_match_info=_best_info(matches),
            worst_match_info=_worst_info(matches),
            best_angle_info=_best_info(angles),
            worst_angle_info=_worst_info(angles),
            last_5_match_ratings=matches[:5],
            last_5_angle_ratings=angles[:5],
            last_5_segment_ratings=raw_segments[:5],
            total_matches=len(matches),
            total_angles=len(angles),
            total_segments=len(raw_segments),
            avg_duration=round(sum(durations) / len(durations)) if durations else 0,
            total_duration=sum(durations) if durations else 0,
        )

    w.contract_status = "none"
    w.contract_expiry_days = 0
    if contract_rows:
        main = contract_rows[0]
        for cr in contract_rows:
            if cr.get("WrittenContract") and cr.get("ExclusiveContract"):
                main = cr
                break
            elif cr.get("WrittenContract") and not main.get("WrittenContract"):
                main = cr
        w.contract_status = "written"
        if main.get("ExclusiveContract"):
            w.contract_status = "exclusive_written"
        if main.get("OnLoan"):
            w.contract_status = "loan"
        if main.get("Developmental"):
            w.contract_status = "developmental"
        w.contract_expiry_days = main.get("Daysleft", 0) or 0

    w.company_area_pop = 0
    if game_date_val:
        controlled = [uid for uid, f in store.feds.items() if f.get("User_Controlled") == 1]
        if controlled:
            inner_fed = store.feds[controlled[0]]
            based_in = inner_fed.get("Based_In", 0)
            from_area = None
            for area_name, region_ids in AREAS.items():
                if based_in in region_ids:
                    from_area = area_name
                    break
            if from_area:
                area_regions = AREAS.get(from_area, [])
                if area_regions:
                    over_row = store.fed_over.get(controlled[0])
                    if over_row:
                        vals = [over_row.get(f"Over{i}", 0) for i in area_regions if 1 <= i <= 57]
                        if vals:
                            w.company_area_pop = round(sum(vals) / len(vals) / 10)

    # Roster averages
    w.roster_avg_primary = 0
    w.roster_avg_ent = 0
    w.roster_avg_psych = 0
    w.roster_avg_fund = 0
    w.roster_avg_stamina = 0
    w.roster_avg_pop = 0
    if game_date_val:
        controlled = [uid for uid, f in store.feds.items() if f.get("User_Controlled") == 1]
        if controlled:
            inner_fed_uid = controlled[0]
            roster_ids = [cr["WorkerUID"] for cr in store.contracts_by_fed.get(inner_fed_uid, []) if cr.get("Position_Wrestler") or cr.get("Position_Occasional")]
            if len(roster_ids) >= 1:
                skill_vals = [store.skills.get(uid) for uid in roster_ids if uid in store.skills]
                if skill_vals:
                    def r10(v): return round((v or 0) / 10)
                    b_avg = r10(sum(s.get("Brawl", 0) or 0 for s in skill_vals) / len(skill_vals))
                    p_avg = r10(sum(s.get("Puroresu", 0) or 0 for s in skill_vals) / len(skill_vals))
                    h_avg = r10(sum(s.get("Hardcore", 0) or 0 for s in skill_vals) / len(skill_vals))
                    t_avg = r10(sum(s.get("Technical", 0) or 0 for s in skill_vals) / len(skill_vals))
                    a_avg = r10(sum(s.get("Air", 0) or 0 for s in skill_vals) / len(skill_vals))
                    ring = sorted([b_avg, p_avg, h_avg, t_avg, a_avg], reverse=True)
                    w.roster_avg_primary = round(ring[0] * 0.50 + ring[1] * 0.25 + ring[2] * 0.15 + ring[3] * 0.07 + ring[4] * 0.03)
                    w.roster_avg_psych = r10(sum(s.get("Psych", 0) or 0 for s in skill_vals) / len(skill_vals))
                    ba = r10(sum(s.get("Basics", 0) or 0 for s in skill_vals) / len(skill_vals))
                    se = r10(sum(s.get("Sell", 0) or 0 for s in skill_vals) / len(skill_vals))
                    co = r10(sum(s.get("Consistency", 0) or 0 for s in skill_vals) / len(skill_vals))
                    sa = r10(sum(s.get("Safety", 0) or 0 for s in skill_vals) / len(skill_vals))
                    w.roster_avg_fund = round((ba + se + co + sa) / 4)
                    w.roster_avg_stamina = r10(sum(s.get("Stamina", 0) or 0 for s in skill_vals) / len(skill_vals))
                    c_list = [
                        r10(sum(s.get("Charisma", 0) or 0 for s in skill_vals) / len(skill_vals)),
                        r10(sum(s.get("Mic", 0) or 0 for s in skill_vals) / len(skill_vals)),
                        r10(sum(s.get("Act", 0) or 0 for s in skill_vals) / len(skill_vals)),
                        r10(sum(s.get("Star", 0) or 0 for s in skill_vals) / len(skill_vals)),
                        r10(sum(s.get("Looks", 0) or 0 for s in skill_vals) / len(skill_vals)),
                        r10(sum(s.get("Menace", 0) or 0 for s in skill_vals) / len(skill_vals)),
                    ]
                    c_sorted = sorted(c_list, reverse=True)
                    w.roster_avg_ent = round(sum(c_list[:5]) / 5) if c_list[5] < c_sorted[2] else round(sum(c_list) / 6)

                based_in = store.feds[inner_fed_uid].get("Based_In", 0)
                from_area = None
                for area_name, region_ids in AREAS.items():
                    if based_in in region_ids:
                        from_area = area_name
                        break
                if from_area:
                    area_regions = AREAS.get(from_area, [])
                    if area_regions:
                        pop_vals = []
                        for uid in roster_ids:
                            ov = store.overness.get(uid)
                            if ov:
                                vals = [ov.get(f"Over{r}", 0) or 0 for r in area_regions]
                                pop_vals.append(sum(vals) / len(vals))
                        if pop_vals:
                            w.roster_avg_pop = round(sum(pop_vals) / len(pop_vals) / 10)

    # Belt history
    w.belt_history = []
    for br in store.belt_history:
        if br.get("Holder1") == worker_uid or br.get("Holder2") == worker_uid or br.get("Holder3") == worker_uid:
            belt = store.belts.get(br["BeltUID"])
            w.belt_history.append({
                "belt_uid": br["BeltUID"],
                "belt_name": belt.get("Name", "") if belt else "",
                "belt_picture": belt.get("Picture", "") if belt else "",
                "captured": str(br["BeltCaptured"]) if br.get("BeltCaptured") else "",
                "lost": str(br["BeltLost"]) if br.get("BeltLost") else "",
                "defences": br.get("Defences", 0) or 0,
            })

    # Moveset
    w.moves = []
    moveset_id = w_row.get("Moveset", 0) or 0
    if moveset_id > 0:
        for ar in store.moveset_arsenal:
            if ar["MoveSetUID"] == moveset_id:
                move = store.wrestling_moves.get(ar["Move"])
                w.moves.append({
                    "name": move.get("MoveName", "") if move else "",
                    "desc": move.get("MoveDesc", "") if move else "",
                    "level": ar.get("MoveLevel", 1) or 1,
                })
        w.moves.sort(key=lambda m: (-m["level"], m["name"]))

    return w
