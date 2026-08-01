"""Agent report: derives a worker's strengths, weaknesses, recommended usage
narrative and best role from their skills, attributes, popularity and contract.

Ported from the old frontend AgentReportTab so the backend "makes sense" of the
data and the tab merely renders it. `icon` fields are string keys the frontend
maps to its scouting-icon assets — no asset paths cross the boundary.
"""
from core.regions import REGION_TO_AREA, AREAS

# Absolute skill thresholds (0–100), independent of company level.
_A = {"elite": 90, "strong": 85, "solid": 75, "weak": 50, "poor": 35}


def _rel_tier(cp: float) -> dict:
    c = max(cp, 10)
    return {"elite": c + 25, "strong": c + 15, "solid": c + 5, "weak": c - 10, "poor": c - 20}


def _pro_impact(stat: float, threshold: float, cp: float) -> float:
    scale = max(cp * 0.12, 5)
    return max(0.05, min(5, 1 + (stat - threshold) / scale))


def _con_severity(stat: float, threshold: float, cp: float) -> float:
    scale = max(cp * 0.12, 5)
    return max(0.05, min(5, 1 + (threshold - stat) / scale))


def _is_elite(stat: float) -> bool:
    return stat >= 90


def _world_class2(*stats: float) -> bool:
    return sum(1 for s in stats if s >= 90) >= 2


def _is_wrestler(w) -> bool:
    pos = w.positions or []
    return "Wrestler" in pos or "Occasional" in pos


def build_agent_report(w, fed_row: dict | None, player_fed_uid: int | None) -> dict:
    s = w.skills

    def sk(name: str) -> int:
        return getattr(s, name).pct if s and hasattr(s, name) else 0

    attrs = w.attributes or []

    def has(i: int) -> bool:
        return i in attrs

    company_pop = getattr(w, "company_area_pop", 0) or 0
    roster_avg_pop = getattr(w, "roster_avg_pop", 0) or 0
    T = _rel_tier(company_pop)
    iW = _is_wrestler(w)
    fed_name = (fed_row or {}).get("Name") or "your company"
    fed_area = REGION_TO_AREA.get((fed_row or {}).get("Based_In"), "") if fed_row else ""
    area_regs = AREAS.get(fed_area, [])
    overness = w.overness or []

    area_pop = 0
    if area_regs and overness:
        vals = []
        for rid in area_regs:
            e = overness[rid - 1] if 0 <= rid - 1 < len(overness) else None
            vals.append(e.value.pct if e and e.value else 0)
        area_pop = round(sum(vals) / len(vals)) if vals else 0

    pros: list[dict] = []
    cons: list[dict] = []

    def pro(t, d, impact, icon, v=None, is_elite=False):
        pros.append({"text": t, "detail": d, "value": v, "impact": impact, "icon": icon, "is_elite": is_elite})

    def con(t, d, impact, icon, v=None, warn=False):
        cons.append({"text": t, "detail": d, "value": v, "impact": impact, "icon": icon, "warn": warn})

    cv, mv, sv = sk("charisma"), sk("mic"), sk("star")

    # ── performance pros ──
    pro(
        "Has a magnetic presence on-screen." if cv >= T["elite"]
        else "Is a charismatic performer." if cv >= T["strong"] else "Is decently charismatic.",
        f"Charisma: {cv}/100.", (_pro_impact(cv, T["elite"], company_pop) if cv >= T["elite"]
                                 else _pro_impact(cv, T["strong"] if cv >= T["strong"] else T["solid"], company_pop)),
        "charisma", v=cv, is_elite=_is_elite(cv),
    )
    if mv >= _A["elite"]:
        pro("Electrifying on the microphone.", f"Microphone: {mv}/100.", 4.0 if mv >= 95 else 3.0, "mic", v=mv, is_elite=True)
    elif mv >= 80:
        pro("Excellent on the microphone.", f"Microphone: {mv}/100.", 2.0, "mic", v=mv)
    elif mv >= T["solid"]:
        pro("Good on the microphone.", f"Microphone: {mv}/100.", _pro_impact(mv, T["solid"], company_pop), "mic", v=mv, is_elite=_is_elite(mv))
    if sv >= _A["elite"]:
        pro("Looks like a generational superstar.", f"Star Quality: {sv}/100.", 4.0 if sv >= 95 else 3.0, "star", v=sv, is_elite=True)
    elif sv >= 80:
        pro("Dripping with star quality.", f"Star Quality: {sv}/100.", 2.5, "star", v=sv)
    elif sv >= T["solid"]:
        pro("Looks like a star.", f"Star Quality: {sv}/100.", _pro_impact(sv, T["solid"], company_pop), "star", v=sv, is_elite=_is_elite(sv))

    psych = sk("psych")
    if psych >= _A["solid"]:
        pro("Master psychologist." if psych >= _A["elite"] else "Excellent ring psychology." if psych >= _A["strong"] else "Knows how to work a crowd.",
            f"Psychology: {psych}/100.", 4.0 if psych >= _A["elite"] else 2.5 if psych >= _A["strong"] else 1.0, "psych", v=psych, is_elite=psych >= _A["elite"])
    exp = sk("experience")
    if exp >= _A["strong"]:
        pro("An experienced hand who delivers every night.", f"Experience: {exp}/100.", 2.0, "experience", v=exp)
    if exp < 30 and iW:
        con("Green around the edges. Needs more ring time to develop.", f"Experience: {exp}/100.", 2.5, "experience", v=exp)
    if iW:
        fl = sk("flash")
        if fl >= _A["strong"]:
            pro("Crowd-pleasing moveset.", f"Flashiness: {fl}/100.", 2.5, "flash", v=fl, is_elite=fl >= 95)
        mn = sk("menace")
        is_monster = mn >= _A["strong"] or (sk("power") >= _A["solid"] and sk("brawl") >= _A["solid"])
        if is_monster and mn >= _A["strong"]:
            pro("Terrifying presence." if mn >= 95 else "Intimidating presence.", f"Menace: {mn}/100.", 1.5, "menace", v=mn, is_elite=mn >= 95)
    lk = sk("looks")
    if lk >= 95:
        pro("Model good looks.", f"Looks: {lk}/100.", 2.5, "looks", v=lk, is_elite=True)
    if lk < _A["poor"] and iW:
        con("Has an unfortunate appearance.", f"Looks: {lk}/100.", 2.0, "looks", v=lk)
    if _world_class2(cv, mv, sv, psych):
        pro("World-class entertainer.", "Elite across multiple performance categories. A true global talent.", 5.0, "worldClass", is_elite=True)

    # ── in-ring pros/cons (wrestlers only) ──
    if iW:
        b2, se2, st2 = sk("basics"), sk("selling"), sk("stamina")
        at2, po2, in2 = sk("athletic"), sk("power"), sk("injury")
        co2, sa2, to2 = sk("consistency"), sk("safety"), sk("toughness")
        if b2 < _A["weak"]:
            con("Weak technical fundamentals.", f"Basics: {b2}/100.", 2.5, "basics", v=b2)
        if se2 >= 95:
            pro("A world-class seller.", f"Selling: {se2}/100.", 4.0, "selling", v=se2, is_elite=True)
        elif se2 >= _A["strong"]:
            pro("Is an exceptional seller.", f"Selling: {se2}/100.", 2.5, "selling", v=se2)
        if co2 >= 95:
            pro("Never has an off night.", f"Consistency: {co2}/100.", 3.0, "consistency", v=co2, is_elite=True)
        elif co2 >= _A["strong"]:
            pro("Consistent performer.", f"Consistency: {co2}/100.", 2.0, "consistency", v=co2)
        if sa2 >= 95:
            pro("An extremely safe worker.", f"Safety: {sa2}/100.", 3.0, "safety", v=sa2, is_elite=True)
        elif sa2 >= _A["strong"]:
            pro("Safe worker.", f"Safety: {sa2}/100.", 2.0, "safety", v=sa2)
        if st2 >= 95:
            pro("Has an endless motor.", f"Stamina: {st2}/100.", 3.5, "stamina", v=st2, is_elite=True)
        elif st2 >= _A["strong"]:
            pro("Can go the distance in long matches.", f"Stamina: {st2}/100.", 2.0, "stamina", v=st2)
        if at2 >= 95:
            pro("Freak athlete.", f"Athleticism: {at2}/100.", 3.5, "athletic", v=at2, is_elite=True)
        elif at2 >= _A["strong"]:
            pro("Highly athletic.", f"Athleticism: {at2}/100.", 2.0, "athletic", v=at2)
        if in2 >= 95:
            pro("Is an iron man, never gets hurt.", f"Injury Resistance: {in2}/100.", 3.5, "injury", v=in2, is_elite=True)
        elif in2 >= _A["strong"]:
            pro("Unlikely to get hurt.", f"Injury Resistance: {in2}/100.", 2.0, "injury", v=in2)
        is_pwr = po2 >= _A["strong"] or (sk("brawl") >= _A["solid"] and po2 >= _A["strong"])
        if is_pwr and po2 >= _A["strong"]:
            pro("Freakish strength." if po2 >= 95 else "Impressive strength.", f"Power: {po2}/100.", 3.5 if po2 >= 95 else 2.0, "power", v=po2, is_elite=po2 >= 95)
        if to2 >= _A["strong"]:
            pro("Tough as nails.", f"Toughness: {to2}/100.", 1.5, "toughness", v=to2)
        if psych >= _A["strong"] and co2 >= _A["strong"]:
            pro("Reliable performer.", "Strong psychology and consistency.", 2.5, "reliable")

    # ── attribute pros ──
    if has(314) or has(315):
        pro("Can work both face and heel at a high level.", "Versatile and valuable.", 2.5, "faceHeel")
    else:
        if has(311):
            pro("Natural babyface.", "Can still work heel if needed.", 1.5, "faceHeel")
        if has(312):
            pro("Natural heel.", "Can still work babyface if needed.", 1.5, "faceHeel")
    pos_pers = {1, 3, 4, 5, 8, 9, 11}
    mixed_pers = {6, 7, 10}
    pers_ids = set(range(1, 29))
    p_attr = next((i for i in attrs if i in pers_ids), None)
    if p_attr in pos_pers:
        pro("Positive backstage influence.", "A net positive in the locker room.", 2.0, "positive")
    if p_attr in mixed_pers:
        if p_attr == 6:
            pro("Keeps morale high backstage.", "Class Clown. Creates positive backstage incidents and energy.", 1.5, "positive")
        elif p_attr == 7:
            pro("Energising backstage presence.", "Party Animal. Major positive impact on backstage environment.", 1.5, "positive")
    if has(125) or has(131):
        pro("Easy to do business with.", "Will put others over without complaint. Helpful for building the roster.", 1.5, "tag")
    if has(134):
        pro("Low maintenance.", "Undemanding. Will not complain about being left off shows.", 1.0, "reliable")
    if has(346):
        pro("Tag team specialist.", "Performs better with established tag partners (15+ experience, no negative chemistry).", 1.5, "tag")
    if has(507):
        pro("Develops quickly.", "Prodigy. Improves skills faster than normal during their maturity phase.", 2.0, "athletic")
    if has(509):
        pro("Age-defying performer.", "Age Is Just A Number. Loses skills slower than normal during decline.", 2.0, "stamina")
    if has(345):
        pro("Never holds back.", "Dynamo. Always gives full effort, even on unimportant shows.", 1.5, "athletic")
    if has(348):
        pro("Generous performer.", "Giving Performer. Makes opponents look better than they are.", 1.5, "positive")
    if has(352):
        pro("High pain tolerance.", "High Pain Threshold. Penalties from working injured are lessened.", 1.0, "power")
    if has(502):
        pro("Long career ahead." if (w.age or 0) <= 35 else "Won't retire early.", "Desperado. Will not retire early unless forced by injury.", 1.5, "stamina")
    if has(103):
        pro("Creative dynamo.", "Extraordinarily creative. Likely to generate new spots and gimmick ideas.", 2.0, "creative")
    elif has(104) or has(105):
        pro("Creative.", "More likely to come up with new spots and gimmick ideas.", 1.0, "creative")
    if has(122):
        pro("Great storyteller.", "Well known for entertaining backstage with tales.", 0.5, "mic")
    if has(106):
        pro("Mentors younger workers.", "Passes On Knowledge. More likely to take on protégés.", 1.0, "positive")
    if has(548):
        pro("A marketing dream.", "Everyone wants a piece of them. Merchandise sales massively boosted.", 3.0, "market")
    elif has(547):
        pro("Easily marketable.", "Naturally suited to being monetised. Merchandise sales boosted.", 2.5, "market")
    elif any(has(i) for i in (225, 226, 227, 228, 229, 231, 232, 233, 535, 550)):
        pro("Marketable.", "Boosts merchandise sales.", 2.0, "market")
    if (w.age or 0) <= 25:
        pro("Has time to develop further.", f"Age {w.age}. Significant room to grow.", 2.0, "stamina")

    # ── popularity / draw pros ──
    if area_pop >= company_pop and company_pop > 0:
        pro("A draw in this market.", f"{area_pop} average popularity.",
            3.0 if area_pop >= company_pop + 15 else 2.0 if area_pop >= company_pop + 5 else 1.0, "popularity", v=area_pop)
    if area_pop >= company_pop + 10:
        pro("Major draw in this market.", f"{area_pop} average popularity.", 3.5, "popularity", v=area_pop)
    if area_pop >= company_pop and company_pop > 0:
        pro(f"Major draw in {fed_area}." if area_pop >= company_pop + 15 else f"A draw in {fed_area}." if area_pop >= company_pop + 5 else f"Known in {fed_area}.",
            f"{area_pop} average popularity.", 3.5 if area_pop >= company_pop + 15 else 2.5 if area_pop >= company_pop + 5 else 1.5, "popularity", v=area_pop)

    perception = (w.contract.perception if w.contract else 0) or 0
    is_figurehead = bool(fed_row and fed_row.get("Ace") and fed_row.get("Ace") == w.uid)
    is_face = bool(w.contract and w.contract.face)
    if is_figurehead:
        pro(f"Face of {fed_name}.", "The designated figurehead of the company.", 5.0, "perception")
    elif perception == 1:
        pro(f"One of the top faces in {fed_name}." if is_face else f"One of the top heels in {fed_name}.",
            "Recognised as a premier performer on the roster.", 4.0, "perception")
    elif perception == 2:
        pro(f"A prominent face in {fed_name}." if is_face else f"A prominent heel in {fed_name}.",
            "Seen as a top tier talent on the roster.", 3.0, "perception")

    c_status = getattr(w, "contract_status", "none")
    contract_fed = w.contract.fed_uid if w.contract else None
    is_elsewhere = c_status == "exclusive_written" and not w.freelance and contract_fed and contract_fed != player_fed_uid
    is_own = c_status == "exclusive_written" and not w.freelance and contract_fed == player_fed_uid
    exp_days = getattr(w, "contract_expiry_days", 0) or 0
    if w.freelance or c_status == "none":
        pro(f"Available to sign with {fed_name}.", "Free agent. Can be signed immediately.", 3.0, "contract")
    if is_elsewhere and 0 < exp_days < 90:
        pro("Contract expiring soon.", f"{exp_days} days remaining on their current deal. Could become available.", 2.5, "contract")
    if is_own and exp_days >= 180:
        pro("Long-term commitment.", f"{exp_days} days remaining. Worker is locked in.", 1.0, "contract")
    if roster_avg_pop > 0 and area_pop > 0 and area_pop >= roster_avg_pop + 10:
        pro(f"More popular than the {fed_name} average.", f"{area_pop} pop vs roster average {roster_avg_pop}.", 3.0, "popularity", v=area_pop)

    # ── performance cons ──
    if cv < T["weak"]:
        con("Lacks the charisma to really perform at the top of the card.", f"Charisma: {cv}/100.", _con_severity(cv, T["weak"], company_pop), "charisma", v=cv)
    if mv < T["weak"]:
        con("May be too weak on the microphone to perform in the main event.", f"Microphone: {mv}/100.", _con_severity(mv, T["weak"], company_pop), "mic", v=mv)
    if sv < T["weak"]:
        con("Lacks the star presence to really be a top-level worker.", f"Star Quality: {sv}/100.", _con_severity(sv, T["weak"], company_pop), "star", v=sv)
    act = sk("acting")
    if act < T["poor"]:
        con("Struggles with angle work.", f"Acting: {act}/100.", _con_severity(act, T["poor"], company_pop), "mic", v=act)
    avg_perf = (cv + mv + sv + act) / 4
    if avg_perf < T["poor"]:
        con(f"Lacks the performance skills to be a top star in {fed_name}.", f"Avg performance: {round(avg_perf)} vs company {company_pop}.", _con_severity(avg_perf, T["poor"], company_pop), "mic", v=round(avg_perf))
    elif avg_perf < T["weak"]:
        con(f"May slightly lack the performance skills to be a top star in {fed_name}.", f"Avg performance: {round(avg_perf)} vs company {company_pop}.", _con_severity(avg_perf, T["weak"], company_pop), "mic", v=round(avg_perf))
    if psych < _A["weak"]:
        con("Lacks intelligence in the ring.", f"Psychology: {psych}/100.", 2.5, "psych", v=psych)
    if iW:
        if sk("stamina") < _A["weak"]:
            con("May struggle in longer matches.", f"Stamina: {sk('stamina')}/100.", 2.0, "stamina", v=sk("stamina"))
        if sk("injury") < _A["weak"]:
            con("Injury prone.", f"Injury Resistance: {sk('injury')}/100.", 2.5, "injury", v=sk("injury"))
        if sk("consistency") < _A["weak"]:
            con("Inconsistent performer.", f"Consistency: {sk('consistency')}/100.", 2.0, "consistency", v=sk("consistency"))
        if sk("basics") < _A["weak"]:
            con("Weak fundamentals.", f"Basics: {sk('basics')}/100.", 2.5, "basics", v=sk("basics"))
        if sk("selling") < _A["weak"]:
            con("Does not sell well.", f"Selling: {sk('selling')}/100.", 2.0, "selling", v=sk("selling"))
        if sk("safety") < _A["weak"]:
            con("Dangerous in the ring.", f"Safety: {sk('safety')}/100.", 3.0, "safety", v=sk("safety"))
        body_parts = [i for i in (520, 521, 522, 523, 524) if has(i)]
        if body_parts:
            if len(body_parts) >= 3 or sk("injury") < 40:
                con("Chronic injury concerns.", "Troublesome body parts.", 3.5, "health")
            else:
                con("Injury concerns.", "Troublesome body part.", 2.0, "health")

    # ── attribute cons ──
    neg_pers = set(range(12, 29))
    if p_attr in neg_pers:
        con("Negative backstage influence.", "", 3.0, "negative")
    if p_attr in mixed_pers:
        if p_attr == 6:
            con("May rile up colleagues backstage.", "Class Clown.", 1.5, "negative")
        elif p_attr == 7:
            con("May be unreliable.", "Party Animal.", 2.0, "negative")
        elif p_attr == 10:
            con("May be unreliable.", "Free Spirit.", 1.5, "negative")
    if has(310):
        con("Can only work as a babyface.", "100% Babyface.", 2.0, "faceHeel")
    if has(313):
        con("Can only work as a heel.", "100% Heel.", 2.0, "faceHeel")
    if has(510):
        con("Cannot fight time.", "Declines faster than normal.", 2.5, "age")
    if has(552):
        con("May be more likely to suffer a severe injury.", "Brittle Bones.", 2.5, "health")
    if has(545):
        con("Is a marketing nightmare.", "Impossible to market.", 3.0, "unmarketable")
    if has(546):
        con("Not easily marketed. May sell less merch.", "Unmarketable.", 2.0, "unmarketable")
    if has(544):
        con("Speech impediment. Struggles in promos.", "", 1.5, "speech")
    if has(543):
        con("Is not able to wrestle again.", "Limited to non-wrestling roles.", 5.0, "unavailable")
    if has(344):
        con("May hold back on minor shows.", "Canny Operator.", 1.0, "selfish", warn=True)
    if has(347):
        con("Is a selfish performer.", "Tends to dominate lesser opponents.", 2.0, "selfish")
    if has(118):
        con("Has a temper.", "Prone to backstage altercations.", 1.5, "negative")
    if has(119):
        con("Prone to backstage fights.", "Born Fighter.", 2.0, "negative")
    if has(351):
        con("Often forgets scripted promos.", "Cannot do scripted matches.", 2.0, "scatter")
    if has(340) or has(341):
        con("Hates comedy matches.", "Struggles with comedy-based matches.", 0.5, "comedy", warn=True)
    if has(374) or has(375):
        con("Cannot do comedy angles.", "Struggles as comic relief in angles.", 0.5, "comedy", warn=True)
    if has(349):
        con("Struggles in slower matches.", "Explosive Ring Style.", 1.5, "stamina", warn=True)
    if has(353):
        con("Struggles in shorter matches.", "Slow And Steady.", 1.5, "stamina", warn=True)
    if any(has(i) for i in (197, 198, 199, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 27, 563)):
        con("May have trouble with substances or law enforcement.", "", 3.0, "danger")
    if area_pop < T["poor"]:
        con(f"Unknown in {fed_area or 'this market'}.", f"{area_pop} average popularity in {fed_area}.", _con_severity(area_pop, T["poor"], company_pop), "popularity", v=area_pop)
    if area_pop < T["weak"]:
        con(f"Less popular than the {fed_name} average.", "", _con_severity(area_pop, T["weak"], company_pop), "popularity", v=area_pop)
    age = w.age or 0
    if age >= 38:
        con("Past their prime.", f"Age {age}.", 2.0 + (age - 38) * 0.1, "age")
    inj_cnt = getattr(w, "injury_count", 0) or 0
    if inj_cnt >= 3:
        con("History of injuries.", f"Injured {inj_cnt} times.", 2.5, "injuryHistory")
    elif inj_cnt > 0:
        con("Previous injury history.", f"Injured {inj_cnt} time{'s' if inj_cnt > 1 else ''}.", 1.5, "injuryHistory")
    if is_elsewhere:
        con("Under exclusive contract elsewhere.", "Signed to another company.", 2.0, "contract")
        if exp_days > 180:
            con("Long-term commitment elsewhere.", f"{exp_days} days remaining.", 1.5, "contract")
    if is_own and 0 < exp_days < 90:
        con("Contract expiring soon.", f"{exp_days} days on current deal.", 2.0, "contract")

    pros.sort(key=lambda x: -x["impact"])
    cons.sort(key=lambda x: -x["impact"])

    return {
        "pros": pros,
        "cons": cons,
        "best_role": _best_role(w),
        "summary": _summary(w, fed_name, fed_area),
    }


def _best_role(w) -> str:
    roles = ["Wrestler", "Occasional", "Manager", "Personality", "Road Agent", "Announcer", "Colour", "Referee"]
    active = [r for r in roles if r in (w.positions or [])]
    if not active:
        return ""
    s = w.skills

    def sk(name):
        return getattr(s, name).pct if s and hasattr(s, name) else 0

    in_ring = max(sk("brawl"), sk("puroresu"), sk("hardcore"), sk("technical"), sk("air"))
    announce, colour, ref = sk("announcing"), sk("colour"), sk("refereeing")
    best = active[0]
    if best == "Occasional" and in_ring >= 60:
        best = "Wrestler"
    if "Announcer" in active and announce >= 60:
        best = "Announcer"
    if "Colour" in active and colour >= 60 and colour > announce:
        best = "Colour Commentator"
    if "Referee" in active and ref >= 60 and ref > max(announce, colour):
        best = "Referee"
    if "Manager" in active and sk("charisma") >= 65:
        best = "Manager"
    return best


def _summary(w, fed_name: str, fed_area: str) -> str:
    if not w.skills:
        return ""
    entries = sorted(
        [("primary", getattr(w, "pillar_primary", 0) or 0),
         ("perf", getattr(w, "pillar_perf", 0) or 0),
         ("pop", getattr(w, "pillar_pop", 0) or 0)],
        key=lambda e: -e[1],
    )
    best, worst = entries[0], entries[2]
    vals = dict(entries)
    current_label = getattr(w, "usage_label", "") or "Unknown"
    potential_label = getattr(w, "potential_usage_label", "") or "Unknown"
    name, age = w.name, (w.age or 0)
    seed = w.uid + age

    def g(lst, i):
        return lst[i % len(lst)]

    parts = []
    openings = [
        f"{name} projects as a {current_label.lower()} for {fed_name}.",
        f"{name} profiles as a {current_label.lower()} within {fed_name}.",
        f"{name} slots in as a {current_label.lower()} for {fed_name}.",
    ]
    parts.append(g(openings, seed))
    best_phrases = {
        "primary": ["Their greatest weapon is their in-ring ability.", "They live and die by their craft in the ring.", "Their technical prowess sets them apart."],
        "perf": ["Charisma and presence are their calling card.", "Star quality is what makes them stand out.", "They connect with audiences like few others can."],
        "pop": [f"They already draw interest in {fed_area or 'their market'}.", f"Well known to {fed_area or 'regional'} audiences already.", "Name recognition is their strongest asset."],
    }
    if best[1] >= 75:
        parts.append(g(best_phrases.get(best[0], ["This is their standout quality."]), seed))
    elif best[1] >= 55:
        parts.append(f"Their {'in-ring work' if best[0] == 'primary' else 'charisma and presence' if best[0] == 'perf' else 'name value'} is their strongest attribute.")
    roster_primary = getattr(w, "roster_avg_primary", 0) or 0
    roster_perf = getattr(w, "roster_avg_ent", 0) or 0
    roster_pop = getattr(w, "roster_avg_pop", 0) or 0
    if best[0] == "primary" and roster_primary > 0 and vals["primary"] > roster_primary + 10:
        parts.append(f"A clear step up from the {fed_name} roster in ring ability.")
    elif best[0] == "perf" and roster_perf > 0 and vals["perf"] > roster_perf + 10:
        parts.append(f"Brings more entertainment value than most of the current {fed_name} roster.")
    elif best[0] == "pop" and roster_pop > 0 and vals["pop"] > roster_pop + 10:
        parts.append(f"Already more recognised than the average {fed_name} performer.")
    weak_phrases = {
        "primary": ["Their in-ring work is a limiting factor.", "They lack the ring skills to reach the next level.", "Their weak point is between the ropes."],
        "perf": ["They struggle to connect with the audience.", "Their entertainment skills hold them back from the spotlight.", "Charisma is the missing piece of their game."],
        "pop": ["They are not yet a household name.", "Building their name recognition will be key.", "Still relatively unknown to wider audiences."],
    }
    if worst[1] < 45:
        parts.append(g(weak_phrases.get(worst[0], ["This is an area of concern."]), seed + 1))
    elif worst[1] < 60:
        parts.append(f"Their {'ring work' if worst[0] == 'primary' else 'entertainment skills' if worst[0] == 'perf' else 'name value'} could use improvement.")
    if age < 20:
        parts.append(f"At just {age}, they have their entire career ahead of them.")
    elif age <= 22:
        parts.append(f"Still early in their career at {age}. Plenty of room to grow.")
    elif age <= 25:
        parts.append(f"At {age}, they are still developing and finding their footing.")
    elif age <= 28:
        parts.append(f"At {age}, they are entering their prime years.")
    elif age <= 34:
        parts.append(f"At {age}, they are squarely in their prime.")
    elif age <= 37:
        parts.append(f"At {age}, they still have plenty of good years left.")
    elif age <= 40:
        parts.append(f"At {age}, they are in the veteran stage of their career.")
    elif age <= 43:
        parts.append(f"At {age}, the clock is ticking on their in-ring career.")
    else:
        parts.append(f"At {age}, every year could be their last between the ropes.")
    gap = (getattr(w, "potential_stars", 0) or 0) - (getattr(w, "current_stars", 0) or 0)
    if gap > 1.5:
        parts.append(g(["The sky is the limit for this one.", "Boundless potential. Could become something truly special with the right development."], seed))
    elif gap > 0.5:
        parts.append(g(["Still has room to grow and develop further.", "Untapped potential waiting to be unlocked."], seed))
    elif gap > 0:
        parts.append(g(["Near their ceiling, but still room to refine their game.", "Close to their peak, though a bit more seasoning could help."], seed))
    elif gap < 0:
        parts.append("Already past their peak at this stage of their career.")
    if gap > 0:
        parts.append(f"Could develop into a {potential_label.lower()} with the right opportunities.")
    return " ".join(parts)
