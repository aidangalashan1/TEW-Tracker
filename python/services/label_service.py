"""Worker type detection and usage-label formatting, ported from
src/lib/scoring.ts so the backend computes the final label string and the
frontend merely renders it."""

from models import Worker


def _pct(s: any, k: str) -> float:
    return float(getattr(s, k).pct) if hasattr(getattr(s, k, None), "pct") else 0.0


def detect_style(w: Worker) -> str:
    """Determine the worker's style type (Monster, Complete, Technician, etc.)
    by evaluating all candidate types and returning the highest-scoring one.
    Pure port of src/lib/scoring.ts detectStyle()."""
    s = w.skills
    if not s:
        return ""
    age = w.age or 0

    b = _pct(s, "brawl"); pu = _pct(s, "puroresu"); ha = _pct(s, "hardcore")
    te = _pct(s, "technical"); ai = _pct(s, "air"); fl = _pct(s, "flash")
    ch = _pct(s, "charisma"); mi = _pct(s, "mic"); st = _pct(s, "star")
    ps = _pct(s, "psych"); ba = _pct(s, "basics"); se = _pct(s, "selling")
    co = _pct(s, "consistency"); sa = _pct(s, "safety"); stm = _pct(s, "stamina")
    at = _pct(s, "athletic"); po = _pct(s, "power"); to = _pct(s, "toughness")
    ex = _pct(s, "experience"); mn = _pct(s, "menace"); lk = _pct(s, "looks")

    all_ring = [b, pu, ha, te, ai]
    ring_vals = sorted(all_ring, reverse=True)
    ent_score = (ch + mi + st) / 3

    def tier(t: str) -> int:
        if t in ("Monster", "Dominator", "Ring General", "Complete", "Superstar"):
            return 30
        if t in ("Well-Rounded", "Solid Hand", "All-Rounder"):
            return 25
        if t in ("Technician", "Bruiser", "High-Flyer", "Powerhouse", "Brawler",
                 "Enforcer", "Specialist", "Entertainer", "Showman"):
            return 15
        return 0

    candidates: list[tuple[str, float]] = []

    # Complete (Tier 1)
    if (all(v >= 55 for v in ring_vals[:3]) and ps >= 85 and ba >= 80
            and co >= 80 and sa >= 70 and stm >= 75 and ent_score >= 65):
        score = (sum(ring_vals[:3]) / 3 * 0.5
                 + (ps + ba + co + sa) / 4 * 0.3
                 + ent_score * 0.2) + tier("Complete")
        candidates.append(("Complete", score))

    # Superstar (Tier 1)
    if st >= 90 and lk >= 80 and po >= 75 and ent_score >= 75 and ps >= 70:
        score = (ent_score * 0.3 + st * 0.3 + lk * 0.2 + po * 0.2) + tier("Superstar")
        candidates.append(("Superstar", score))

    # Ring General (Tier 1)
    if (ps > 74 and ex >= 100 and se > 70 and sa > 80
            and co > 80 and ent_score < 75):
        score = ((ps + se + sa + co) / 4) + tier("Ring General")
        candidates.append(("Ring General", score))

    # Monster (Tier 1) — pure brawler/menace with limited ring ability
    if (po > 70 and mn > 75 and to > 65 and ai < 60 and te < 60
            and (b + pu + ha) / 3 < 65):
        score = ((po + mn + to) / 3) + tier("Monster")
        candidates.append(("Monster", score))

    # Dominator (Tier 1) — elite physical specimen who can work
    if po > 80 and at > 75 and to > 75 and b > 70 and te < 70:
        score = ((po + at + to + b) / 4) + tier("Dominator")
        candidates.append(("Dominator", score))

    # Entertainer (Tier 2)
    if ent_score > (ring_vals[0] * 0.50 + ring_vals[1] * 0.25 + ring_vals[2] * 0.15
                    + ring_vals[3] * 0.07 + ring_vals[4] * 0.03) * (
            1 + min(5, max(0, (fl - 50) * 0.1)) / 100) and ent_score >= 76:
        candidates.append(("Entertainer", ent_score + tier("Entertainer")))

    # Showman (Tier 2)
    if (ai >= 70 or fl >= 70) and ent_score >= 70 and st >= 75 and se >= 75:
        score = ((ai + fl + se + ch) / 4) + tier("Showman")
        candidates.append(("Showman", score))

    # Bruiser (Tier 2)
    if b > 65 and pu > 60 and ha > 50:
        score = ((b + pu + ha) / 3) + tier("Bruiser")
        candidates.append(("Bruiser", score))

    # Technician (Tier 2)
    if te > 75 and ba > 70 and ai < 65:
        score = ((te + ba) / 2) + tier("Technician")
        candidates.append(("Technician", score))

    # High-Flyer (Tier 2)
    if ai > 75 and at > 70 and fl > 65:
        score = ((ai + at + fl) / 3) + tier("High-Flyer")
        candidates.append(("High-Flyer", score))

    # Powerhouse (Tier 2)
    if po > 75 and b > 60:
        score = ((po + b) / 2) + tier("Powerhouse")
        candidates.append(("Powerhouse", score))

    # Brawler (Tier 2)
    if b > 70 and to > 60:
        score = ((b + to) / 2) + tier("Brawler")
        candidates.append(("Brawler", score))

    # Enforcer (Tier 2)
    if to > 70 and po > 65 and mn > 60:
        score = ((to + po + mn) / 3) + tier("Enforcer")
        candidates.append(("Enforcer", score))

    # Well-Rounded (Tier 2)
    if (all(v >= 60 for v in ring_vals[:3])
            and (ba + co + sa) / 3 > 70 and ent_score > 60):
        ring_avg = sum(all_ring) / 5
        score = ((ring_avg + ent_score) / 2) + tier("Well-Rounded")
        candidates.append(("Well-Rounded", score))

    # Solid Hand (Tier 2)
    if sum(1 for v in all_ring if 65 <= v <= 79) >= 3 and co > 70 and sa > 70:
        score = (sum(all_ring) / 5) + tier("Solid Hand")
        candidates.append(("Solid Hand", score))

    # Specialist (Tier 2)
    if max(all_ring) >= 85 and sum(1 for v in all_ring if v >= 60) == 1:
        candidates.append(("Specialist", max(all_ring) + tier("Specialist")))

    # Veteran (Tier 3)
    if age >= 38 and ex >= 90 and ps > 70 and se > 70 and (at < 60 or stm < 60):
        score = ((ex + ps + se) / 3)
        candidates.append(("Veteran", score))

    # Young Lion (Tier 3)
    if age <= 25 and all(40 <= v <= 65 for v in all_ring):
        score = (sum(all_ring) / 5)
        candidates.append(("Young Lion", score))

    # All-Rounder (Tier 3)
    if sum(1 for v in all_ring if v >= 70) >= 3 and max(all_ring) < 90:
        score = (sum(all_ring) / 5)
        candidates.append(("All-Rounder", score))

    if not candidates:
        return ""
    candidates.sort(key=lambda x: -x[1])
    return candidates[0][0]


def age_prefix(age: int) -> str:
    if age >= 44:
        return "Aging"
    if age >= 41:
        return "Grizzled"
    if age >= 38:
        return "Veteran"
    if age >= 35:
        return "Seasoned"
    if age >= 32:
        return "Established"
    if age >= 23:
        return "Up-and-Coming"
    if age >= 20:
        return "Rising"
    if age < 20:
        return "Young"
    return ""


def is_banged_up(w: Worker) -> bool:
    p = w.physical
    if not p:
        return False
    return min(p.condition1 or 100, p.condition2 or 100,
               p.condition3 or 100, p.condition4 or 100) < 55


def _is_wrestler(w: Worker) -> bool:
    if w.retired:
        return False
    return "Wrestler" in (w.positions or []) or "Occasional" in (w.positions or [])


def usage_label(w: Worker, stars: float, score: int, is_potential: bool = False) -> str:
    """Compute the full usage label for a worker.
    Port of src/lib/scoring.ts starLabel()."""
    st = w.worker_type or ""
    s = float(score) if score else float(stars) * 10

    if not _is_wrestler(w):
        levels = ["Ineffective", "Poor", "Below Average", "Average", "Good",
                  "Very Good", "Impressive", "Exceptional", "World Class"]
        role_map = {
            "Referee": "Referee", "Announcer": "Announcer", "Colour": "Colour Commentator",
            "Manager": "Manager", "Personality": "Personality", "Road Agent": "Agent",
        }
        role = next((p for p in (w.positions or []) if p in role_map), "Announcer")
        label = role_map.get(role, "Announcer")
        idx = 8 if s >= 90 else 7 if s >= 80 else 6 if s >= 70 else 5 if s >= 57.5 else 4 if s >= 40 else 3 if s >= 20 else 2 if s >= 10 else 1 if s >= 5 else 0
        return f"{levels[idx]} {label}"

    # Banged-up wrestlers with a type
    if not w.retired and w.is_banged_up and st and st not in ("Complete", "Well-Rounded"):
        return f"Banged Up {st}"

    # Detect workers whose local pop lags far behind their true ability —
    # world-class talent that's unknown in the fed's home area shouldn't
    # show as "Preliminary" or "Deadwood".
    local_pop = getattr(w, "pillar_local_pop", 0) or 0
    skill_peak = max(getattr(w, "pillar_primary", 0) or 0, getattr(w, "pillar_perf", 0) or 0)
    max_region_pop = getattr(w, "pillar_max_region_pop", 0) or 0
    pop_gap = skill_peak - local_pop
    hidden = pop_gap > 20 and local_pop < 40
    international = max_region_pop > local_pop + 20 and max_region_pop >= 70

    ap = age_prefix(w.age)
    is_young = ap in ("Young", "Rising", "Up-and-Coming")
    is_old = ap in ("Veteran", "Grizzled", "Aging")

    adj_form = {
        "Monster": "Monstrous", "Technician": "Technical", "Bruiser": "Bruising",
        "High-Flyer": "High-Flying", "Powerhouse": "Powerful", "Brawler": "Brawling",
        "Enforcer": "Enforcing", "Entertainer": "Entertaining", "Specialist": "Specialist",
        "Solid Hand": "Solid", "Veteran": "Veteran", "Young Lion": "Young Lion",
        "All-Rounder": "All-Rounding", "Ring General": "Ring General",
        "Complete": "Complete", "Well-Rounded": "Well-Rounded",
    }
    role_types = {"Monster", "Technician", "Bruiser", "High-Flyer", "Powerhouse",
                  "Brawler", "Enforcer", "Entertainer", "Ring General", "Young Lion",
                  "Specialist", "Solid Hand", "Veteran", "All-Rounder"}

    def fmt_pos(pos_adj: str, pos_noun: str, typ: str) -> str:
        if not typ:
            return pos_noun
        if typ in ("Complete", "Well-Rounded"):
            return f"{typ} {pos_noun}"
        return f"{pos_adj} {typ}"

    if s >= 70:
        label = fmt_pos("Main Event", "Main Eventer", st)
    elif s >= 57.5:
        if is_young:
            label = f"Rising {st}" if st else "Rising Upper Midcarder"
        elif is_old:
            adj = adj_form.get(st, st)
            label = f"{adj} Veteran" if adj != st else (f"Veteran {st}" if st else "Veteran Upper Midcarder")
        else:
            label = fmt_pos("Upper Midcard", "Upper Midcarder", st)
    elif s >= 40:
        if is_young:
            label = f"Rising {st}" if st else "Rising Midcarder"
        elif is_old:
            label = f"Established {st}" if st else "Established Midcarder"
        else:
            label = fmt_pos("Midcard", "Midcarder", st)
    elif s >= 20:
        if is_old:
            label = f"Journeyman {st}" if st else "Journeyman"
        else:
            label = f"Preliminary {st}" if st else "Preliminary"
    elif not is_potential and (w.potential_stars or 0) >= 2.5:
        label = "Developing Young Lion"
    else:
        low = "Deadwood" if w.age >= 30 else ("Enhancement Talent" if w.age >= 28 else "Developing")
        label = f"{low} {st}" if st else low

    if st and international:
        label = f"International {st}"
    elif st and hidden:
        label = f"Hidden {st}"

    return label
