// Frontend display helpers for the Agent Report and star labels. The numeric
// star scores themselves (current_score / current_stars / potential_*) are
// computed once on the backend (roster_service._compute_star_scores) and
// consumed from the API — this module holds only presentation-layer
// derivations, so the score algorithm has a single source of truth.

function pct(r: any): number { return Number(r?.pct ?? 0) }

export function pillarScores(s: any, w: any) {
  const ringVals = [pct(s.brawl), pct(s.puroresu), pct(s.hardcore), pct(s.technical), pct(s.air), pct(s.flash)]
  return {
    primary: Math.max(...ringVals),
    perf: calcPerformance(s),
    pop: w.pop?.pct ?? 0,
    fund: (pct(s.psych) + pct(s.basics) + pct(s.selling) + pct(s.consistency) + pct(s.safety)) / 5,
    stamina: pct(s.stamina),
  }
}

export function calcPerformance(skills: any): number {
  if (!skills) return 0
  const cha = Number(skills.charisma?.pct ?? 0)
  const mic = Number(skills.mic?.pct ?? 0)
  const act = Number(skills.acting?.pct ?? 0)
  const bestVis = Math.max(Number(skills.star?.pct ?? 0), Number(skills.looks?.pct ?? 0), Number(skills.menace?.pct ?? 0))
  return (cha + mic + act + bestVis) / 4
}

export function relTier(cp: number) {
  const c = Math.max(cp, 10)
  return { elite: c + 25, strong: c + 15, solid: c + 5, weak: c - 10, poor: c - 20 }
}

export function proImpact(stat: number, threshold: number, cp: number): number {
  const gap = stat - threshold
  const scale = Math.max(cp * 0.12, 5)
  return Math.max(0.05, Math.min(5, 1 + gap / scale))
}

export function conSeverity(stat: number, threshold: number, cp: number): number {
  const gap = threshold - stat
  const scale = Math.max(cp * 0.12, 5)
  return Math.max(0.05, Math.min(5, 1 + gap / scale))
}

export function isElite(stat: number) { return stat >= 90 }
export function isWorldClass2(...stats: number[]) { return stats.filter(s => s >= 90).length >= 2 }
export function isWrestler(w: any) {
  if (w.retired) return false
  const p = w.positions || []; return p.includes('Wrestler') || p.includes('Occasional')
}

export function detectStyle(s: any, w: any): string {
  const pct = (r: any) => Number(r?.pct ?? 0)
  const age = w.age
  const b = pct(s.brawl); const pu = pct(s.puroresu); const ha = pct(s.hardcore)
  const te = pct(s.technical); const ai = pct(s.air); const fl = pct(s.flash)
  const ch = pct(s.charisma); const mi = pct(s.mic); const st = pct(s.star)
  const ps = pct(s.psych); const ba = pct(s.basics); const se = pct(s.selling)
  const co = pct(s.consistency); const sa = pct(s.safety); const stm = pct(s.stamina)
  const at = pct(s.athletic); const po = pct(s.power); const to = pct(s.toughness)
  const ex = pct(s.experience); const mn = pct(s.menace); const lk = pct(s.looks)
  const allRing = [b, pu, ha, te, ai]
  const ringVals = [...allRing].sort((x, y) => y - x)
  const primaryScore = (ringVals[0]*0.50 + ringVals[1]*0.25 + ringVals[2]*0.15 + ringVals[3]*0.07 + ringVals[4]*0.03) * (1 + Math.min(5, Math.max(0, (fl - 50) * 0.1)) / 100)
  const entScore = (ch + mi + st) / 3
  const TIER = (t: string) => {
    if (['Monster','Dominator','Ring General','Complete','Superstar'].includes(t)) return 30
    if (['Well-Rounded','Solid Hand','All-Rounder'].includes(t)) return 25
    if (['Technician','Bruiser','High-Flyer','Powerhouse','Brawler','Enforcer','Specialist','Entertainer','Showman'].includes(t)) return 15
    return 0
  }
  const candidates: [string, number][] = []
  if (po > 70 && mn > 75 && to > 65 && ai < 60 && te < 60 && (b + pu + ha) / 3 < 65)
    candidates.push(['Monster', (po + mn + to) / 3 + TIER('Monster')])
  if (po > 80 && at > 75 && to > 75 && b > 70 && te < 70)
    candidates.push(['Dominator', (po + at + to + b) / 4 + TIER('Dominator')])
  if (ps > 74 && ex >= 100 && se > 70 && sa > 80 && co > 80 && entScore < 75)
    candidates.push(['Ring General', (ps + se + sa + co) / 4 + TIER('Ring General')])
  if (ringVals.slice(0, 3).every(v => v >= 55) && ps >= 85 && ba >= 80 && co >= 80 && sa >= 70 && stm >= 75 && entScore >= 65)
    candidates.push(['Complete', ((ringVals[0] + ringVals[1] + ringVals[2] + ringVals[3]) / 4 * 0.5 + (ps + ba + co + sa) / 4 * 0.3 + entScore * 0.2) + TIER('Complete')])
  if (st >= 90 && lk >= 80 && po >= 75 && entScore >= 75 && ps >= 70)
    candidates.push(['Superstar', (entScore * 0.3 + st * 0.3 + lk * 0.2 + po * 0.2) + TIER('Superstar')])
  if (entScore > primaryScore && entScore >= 76)
    candidates.push(['Entertainer', entScore + TIER('Entertainer')])
  if (b > 65 && pu > 60 && ha > 50)
    candidates.push(['Bruiser', (b + pu + ha) / 3 + TIER('Bruiser')])
  if (te > 75 && ba > 70 && ai < 65)
    candidates.push(['Technician', (te + ba) / 2 + TIER('Technician')])
  if ((ai >= 70 || fl >= 70) && entScore >= 70 && st >= 75 && se >= 75)
    candidates.push(['Showman', (ai + fl + se + ch) / 4 + TIER('Showman')])
  if (ai > 75 && at > 70 && fl > 65)
    candidates.push(['High-Flyer', (ai + at + fl) / 3 + TIER('High-Flyer')])
  if (po > 75 && b > 60)
    candidates.push(['Powerhouse', (po + b) / 2 + TIER('Powerhouse')])
  if (b > 70 && to > 60)
    candidates.push(['Brawler', (b + to) / 2 + TIER('Brawler')])
  if (to > 70 && po > 65 && mn > 60)
    candidates.push(['Enforcer', (to + po + mn) / 3 + TIER('Enforcer')])
  if (ringVals.slice(0, 3).every(v => v >= 60) && (ba + co + sa) / 3 > 70 && entScore > 60)
    candidates.push(['Well-Rounded', (allRing.reduce((a, b) => a + b, 0) / 5 + entScore) / 2 + TIER('Well-Rounded')])
  if (allRing.filter(v => v >= 65 && v <= 79).length >= 3 && co > 70 && sa > 70)
    candidates.push(['Solid Hand', allRing.reduce((a, b) => a + b, 0) / 5 + TIER('Solid Hand')])
  if (Math.max(...allRing) >= 85 && allRing.filter(v => v >= 60).length === 1)
    candidates.push(['Specialist', Math.max(...allRing) + TIER('Specialist')])
  if (age >= 38 && ex >= 90 && ps > 70 && se > 70 && (at < 60 || stm < 60))
    candidates.push(['Veteran', (ex + ps + se) / 3])
  if (age <= 25 && allRing.every(v => v >= 40 && v <= 65))
    candidates.push(['Young Lion', allRing.reduce((a, b) => a + b, 0) / 5])
  if (allRing.filter(v => v >= 70).length >= 3 && Math.max(...allRing) < 90)
    candidates.push(['All-Rounder', allRing.reduce((a, b) => a + b, 0) / 5])
  if (candidates.length === 0) return ''
  candidates.sort((a, b) => b[1] - a[1])
  return candidates[0][0]
}

export function workerType(w: any): string {
  if (!w.skills) return ''
  return detectStyle(w.skills, w)
}

export function agePrefix(age: number): string {
  if (age >= 44) return 'Aging'
  if (age >= 41) return 'Grizzled'
  if (age >= 38) return 'Veteran'
  if (age >= 35) return 'Seasoned'
  if (age >= 32) return 'Established'
  if (age >= 23) return 'Up-and-Coming'
  if (age >= 20) return 'Rising'
  if (age < 20) return 'Young'
  return ''
}

function isBangedUp(w: any): boolean {
  const p = w.physical
  if (!p) return false
  return Math.min(p.condition1 ?? 100, p.condition2 ?? 100, p.condition3 ?? 100, p.condition4 ?? 100) < 55
}

export function starLabel(w: any, stars: number, _isPotential: boolean, score?: number): string {
  if (!isWrestler(w)) {
    const pos: string[] = w.positions || []
    const levels = ['Ineffective', 'Poor', 'Below Average', 'Average', 'Good', 'Very Good', 'Impressive', 'Exceptional', 'World Class']
    const roleLabels: Record<string, string> = {
      Referee: 'Referee', Announcer: 'Announcer', Colour: 'Colour Commentator',
      Manager: 'Manager', Personality: 'Personality', 'Road Agent': 'Agent',
    }
    const role = pos.find(p => roleLabels[p]) || 'Announcer'
    const label = roleLabels[role] || 'Announcer'
    const sv = score ?? (stars * 10)
    const idx = sv >= 90 ? 8 : sv >= 80 ? 7 : sv >= 70 ? 6 : sv >= 57.5 ? 5 : sv >= 40 ? 4 : sv >= 20 ? 3 : sv >= 10 ? 2 : sv >= 5 ? 1 : 0
    return `${levels[idx]} ${label}`
  }
  const st = workerType(w)
  const s = score ?? (stars * 10)
  if (!w.retired && isBangedUp(w) && st && !['Complete', 'Well-Rounded'].includes(st)) return `Banged Up ${st}`

  const ap = agePrefix(w.age)
  const isYoung = ap === 'Young' || ap === 'Rising' || ap === 'Up-and-Coming'
  const isOld = ap === 'Veteran' || ap === 'Grizzled' || ap === 'Aging'

  const adjForm: Record<string, string> = {
    Monster: 'Monstrous', Technician: 'Technical', Bruiser: 'Bruising',
    'High-Flyer': 'High-Flying', Powerhouse: 'Powerful', Brawler: 'Brawling',
    Enforcer: 'Enforcing', Entertainer: 'Entertaining', Specialist: 'Specialist',
    'Solid Hand': 'Solid', Veteran: 'Veteran', 'Young Lion': 'Young Lion',
    'All-Rounder': 'All-Rounding', 'Ring General': 'Ring General',
    Complete: 'Complete', 'Well-Rounded': 'Well-Rounded',
  }

  const fmtPos = (posAdj: string, posNoun: string, type: string | null) => {
    if (!type) return posNoun
    const typeFirst = ['Complete', 'Well-Rounded']
    if (typeFirst.includes(type)) return `${type} ${posNoun}`
    return `${posAdj} ${type}`
  }

  if (s >= 70) return fmtPos('Main Event', 'Main Eventer', st)
  if (s >= 57.5) {
    if (isYoung) return st ? `Rising ${st}` : 'Rising Upper Midcarder'
    if (isOld) return st ? (adjForm[st] !== st ? `${adjForm[st]} Veteran` : `Veteran ${st}`) : 'Veteran Upper Midcarder'
    return fmtPos('Upper Midcard', 'Upper Midcarder', st)
  }
  if (s >= 40) {
    if (isYoung) return st ? `Rising ${st}` : 'Rising Midcarder'
    if (isOld) return st ? `Established ${st}` : 'Established Midcarder'
    return fmtPos('Midcard', 'Midcarder', st)
  }
  if (s >= 20) {
    if (isOld) return st ? `Journeyman ${st}` : 'Journeyman'
    return st ? `Preliminary ${st}` : 'Preliminary'
  }
  if (!_isPotential && (w.potential_stars ?? 0) >= 2.5) return 'Developing Young Lion'
  const lowLabel = w.age >= 30 ? 'Deadwood' : w.age >= 28 ? 'Enhancement Talent' : 'Developing'
  return st ? `${lowLabel} ${st}` : lowLabel
}
