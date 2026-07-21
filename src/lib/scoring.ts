import type { Worker } from '../api'

export function getEntertainmentAvg(w: Worker): number {
  const s = w.skills
  if (!s) return 0
  return Math.round((s.charisma.pct + s.mic.pct + s.acting.pct + s.star.pct) / 4)
}

export function getPrimaryAvg(w: Worker): number {
  const s = w.skills
  if (!s) return 0
  return Math.round((s.brawl.pct + s.puroresu.pct + s.hardcore.pct + s.technical.pct + s.air.pct) / 5)
}

export function getTalentScore(w: Worker): number {
  return Math.round((getEntertainmentAvg(w) + getPrimaryAvg(w)) / 2)
}

const PRIMARY_STATS = [
  ['Brawling', 'brawl'], ['Puroresu', 'puroresu'], ['Hardcore', 'hardcore'],
  ['Technical', 'technical'], ['Aerial', 'air'],
] as const

export function getHighestPrimarySkill(w: Worker): { label: string; pct: number } | null {
  const s = w.skills
  if (!s) return null
  let best: { label: string; pct: number } | null = null
  for (const [label, key] of PRIMARY_STATS) {
    const val = s[key]?.pct ?? 0
    if (!best || val > best.pct) best = { label, pct: val }
  }
  return best
}

export function sortByPopularityThenTalent(workers: Worker[]): Worker[] {
  return [...workers].sort((a, b) => {
    const popDiff = b.pop.pct - a.pop.pct
    if (popDiff !== 0) return popDiff
    return getTalentScore(b) - getTalentScore(a)
  })
}

export function starsFromScore(score: number): number {
  if (score >= 90) return 5; if (score >= 80) return 4.5; if (score >= 70) return 4
  if (score >= 60) return 3.5; if (score >= 50) return 3; if (score >= 40) return 2.5
  if (score >= 30) return 2; if (score >= 20) return 1.5; if (score >= 10) return 1
  return 0.5
}

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
  const ex = pct(s.experience); const mn = pct(s.menace)
  const allRing = [b, pu, ha, te, ai]
  const ringVals = [...allRing].sort((x, y) => y - x)
  const primaryScore = ringVals[0]*0.50 + ringVals[1]*0.25 + ringVals[2]*0.15 + ringVals[3]*0.07 + ringVals[4]*0.03 + fl*0.08
  const entScore = (ch + mi + st) / 3
  const candidates: [string, number][] = []
  if (po > 75 && mn > 75 && to > 65 && ai < 60 && te < 60)
    candidates.push(['Monster', (po + mn + to) / 3])
  if (ps > 74 && ex >= 100 && se > 70 && sa > 80 && co > 80 && entScore < 75)
    candidates.push(['Ring General', (ps + se + sa + co) / 4])
  if (b > 65 && pu > 60 && ha > 50)
    candidates.push(['Bruiser', (b + pu + ha) / 3])
  if (te > 75 && ba > 70 && ai < 65)
    candidates.push(['Technician', (te + ba) / 2])
  if (ai > 75 && at > 70 && fl > 65)
    candidates.push(['High-Flyer', (ai + at + fl) / 3])
  if (po > 75 && b > 60)
    candidates.push(['Powerhouse', (po + b) / 2])
  if (b > 70 && to > 60)
    candidates.push(['Brawler', (b + to) / 2])
  if (to > 70 && po > 65 && mn > 60)
    candidates.push(['Enforcer', (to + po + mn) / 3])
  if (entScore > primaryScore && entScore >= 72)
    candidates.push(['Entertainer', entScore])
  if (Math.max(...allRing) >= 85 && allRing.filter(v => v >= 60).length === 1)
    candidates.push(['Specialist', Math.max(...allRing)])
  if (allRing.every(v => v >= 65 && v <= 79) && co > 70 && sa > 70)
    candidates.push(['Solid Hand', allRing.reduce((a, b) => a + b, 0) / 5])
  if (age >= 38 && ex >= 90 && ps > 70 && se > 70 && (at < 60 || stm < 60))
    candidates.push(['Veteran', (ex + ps + se) / 3])
  if (age <= 25 && allRing.every(v => v >= 40 && v <= 65))
    candidates.push(['Young Lion', allRing.reduce((a, b) => a + b, 0) / 5])
  if (allRing.every(v => v >= 70) && Math.max(...allRing) < 90)
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

export function starLabel(w: any, stars: number, _isPotential: boolean): string {
  const pref = agePrefix(w.age)
  if (!isWrestler(w)) {
    const pos: string[] = w.positions || []
    const levels = ['Ineffective', 'Below Average', 'Average', 'Good', 'Very Good', 'Exceptional']
    const roleLabels: Record<string, string> = {
      Referee: 'Referee', Announcer: 'Announcer', Colour: 'Colour Commentator',
      Manager: 'Manager', Personality: 'Personality', 'Road Agent': 'Agent',
    }
    const role = pos.find(p => roleLabels[p]) || 'Announcer'
    const label = roleLabels[role] || 'Announcer'
    const idx = stars >= 5 ? 5 : stars >= 4 ? 4 : stars >= 3.5 ? 3 : stars >= 2.5 ? 2 : stars >= 1.5 ? 1 : 0
    const agePref = w.age < 23 ? agePrefix(w.age) : w.age >= 60 ? agePrefix(w.age) : ''
    return [agePref, levels[idx], label].filter(Boolean).join(' ')
  }
  const st = workerType(w)
  const fmt = (tier: string) => [pref, st, tier].filter(Boolean).join(' ')
  if (stars >= 5) return fmt('Generational Talent')
  if (stars >= 4.5) return fmt('Buildaround Star')
  if (stars >= 4) return fmt('Regular Main Eventer')
  if (stars >= 3.5) return fmt('Occasional Closer')
  if (stars >= 3) return fmt('Midcarder')
  if (stars >= 2.5) return fmt('Lower Midcarder')
  if (stars >= 2) return fmt('Opener')
  if (stars >= 1.5) return fmt('Jobber')
  if (stars >= 1) return fmt('Deadwood')
  return fmt('Barely a Wrestler')
}
