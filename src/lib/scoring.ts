/** Shared worker scoring utilities — used by the agent report and worker list columns. */

function pct(r: any): number { return Number(r?.pct ?? 0) }

export function calcPerformance(skills: any): number {
  if (!skills) return 0
  const vals = [pct(skills.charisma), pct(skills.mic), pct(skills.star), pct(skills.acting), pct(skills.looks), pct(skills.menace)]
  const indexed = vals.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
  const top3Indices = new Set(indexed.slice(0, 3).map(x => x.i))
  const included = [0, 1, 2, 3, ...(top3Indices.has(4) ? [4] : []), ...(top3Indices.has(5) ? [5] : [])]
    .map(i => vals[i]).sort((a, b) => b - a)
  const weights = included.length === 4 ? [0.35, 0.28, 0.22, 0.15]
    : included.length === 5 ? [0.30, 0.22, 0.20, 0.16, 0.12]
    : [0.25, 0.20, 0.18, 0.15, 0.12, 0.10]
  return included.reduce((sum, v, i) => sum + v * (weights[i] || 0), 0)
}

export function pillarScores(s: any, w: any) {
  const ringVals = [pct(s.brawl), pct(s.puroresu), pct(s.hardcore), pct(s.technical), pct(s.air)].sort((a, b) => b - a)
  const primary = ringVals[0] * 0.50 + ringVals[1] * 0.25 + ringVals[2] * 0.15 + ringVals[3] * 0.07 + ringVals[4] * 0.03 + pct(s.flash) * 0.08
  const perf = calcPerformance(s)
  const pop = w.pop?.pct ?? 0
  const fund = (pct(s.psych) + pct(s.basics) + pct(s.selling) + pct(s.consistency) + pct(s.safety)) / 5
  const stamina = pct(s.stamina)
  return { primary, perf, pop, fund, stamina }
}

function dynamicScore(s: any, w: any): number {
  const { primary, perf, pop, fund, stamina } = pillarScores(s, w)
  const entries = [['primary', primary] as const, ['perf', perf] as const, ['pop', pop] as const]
    .sort((a, b) => b[1] - a[1])
  const wm: Record<string, number> = {}
  wm[entries[0][0]] = 0.40
  wm[entries[1][0]] = 0.30
  wm[entries[2][0]] = 0.20
  let score = primary * wm.primary + perf * wm.perf + pop * wm.pop + fund * 0.05 + stamina * 0.05
  const e85 = ['charisma', 'mic', 'star', 'looks', 'menace'].filter(k => pct(s[k]) >= 85).length
  const e90 = ['charisma', 'mic', 'star', 'looks', 'menace'].filter(k => pct(s[k]) >= 90).length
  if (e85 >= 3) score += 10
  else if (e90 >= 2) score += 10
  else if (e85 >= 2) score += 5
  return Math.max(0, Math.min(100, score))
}

export function calcCurrentScore(w: any): number {
  const s = w.skills; if (!s) return 0
  const workerLevel = dynamicScore(s, w)
  const companyPop = w.company_area_pop || 0
  const rosterAvgPop = w.roster_avg_pop || 0
  const companyLevel = rosterAvgPop > 0
    ? Math.max(companyPop, rosterAvgPop) * 0.65 + Math.min(companyPop, rosterAvgPop) * 0.35
    : companyPop
  const delta = workerLevel - companyLevel
  let score = 70 + delta * 1.5
  if (delta < 0) {
    const rp = w.roster_avg_primary || 0; const re = w.roster_avg_ent || 0
    if (rp > 0 || re > 0) {
      const rosterLevel = rp * 0.35 + re * 0.35 + (w.roster_avg_psych || 0) * 0.10 + (w.roster_avg_fund || 0) * 0.07
      const rosterDelta = workerLevel - rosterLevel
      if (rosterDelta > 0) score += Math.min((rosterDelta / Math.max(companyPop, 1)) * 15, 15)
    }
  }
  return Math.max(0, Math.min(100, score))
}

function ageGrowth(age: number): number {
  if (age <= 20) return 15
  if (age <= 22) return 12
  if (age <= 25) return 10
  if (age <= 28) return 7
  if (age <= 31) return 5
  if (age <= 34) return 3
  if (age <= 37) return 0
  if (age <= 40) return -3
  if (age <= 43) return -5
  return -8
}

export function calcPotentialScore(w: any): number {
  const s = w.skills; if (!s) return 0
  const current = calcCurrentScore(w)
  const companyPop = w.company_area_pop || 0
  const rosterAvgPop = w.roster_avg_pop || 0
  const companyLevel = rosterAvgPop > 0
    ? Math.max(companyPop, rosterAvgPop) * 0.65 + Math.min(companyPop, rosterAvgPop) * 0.35
    : companyPop
  const { primary, perf, pop, fund, stamina } = pillarScores(s, w)
  const entries = [['primary', primary] as const, ['perf', perf] as const, ['pop', pop] as const]
    .sort((a, b) => b[1] - a[1])
  const wm: Record<string, number> = {}
  wm[entries[0][0]] = 0.40; wm[entries[1][0]] = 0.30; wm[entries[2][0]] = 0.20
  const popHalf = wm.pop * 0.5
  const bestNonPop = entries.find(e => e[0] !== 'pop')!
  wm[bestNonPop[0]] += popHalf
  wm.pop = popHalf
  let skillLevel = primary * (wm.primary || 0) + perf * (wm.perf || 0) + pop * (wm.pop || 0) + fund * 0.05 + stamina * 0.05
  const e85 = ['charisma', 'mic', 'star', 'looks', 'menace'].filter(k => pct(s[k]) >= 85).length
  const e90 = ['charisma', 'mic', 'star', 'looks', 'menace'].filter(k => pct(s[k]) >= 90).length
  if (e85 >= 3) skillLevel += 10
  else if (e90 >= 2) skillLevel += 10
  else if (e85 >= 2) skillLevel += 5
  skillLevel = Math.max(0, Math.min(100, skillLevel))
  const delta = skillLevel - companyLevel
  const skillCeiling = 70 + delta * 1.5
  const eliteFloor = e85 >= 2 && w.age <= 30 ? 80 : 0
  let potential: number
  if (w.age <= 37) {
    potential = Math.max(current + ageGrowth(w.age), skillCeiling)
  } else {
    potential = current + ageGrowth(w.age)
  }
  return Math.max(eliteFloor, Math.min(100, potential))
}

export function starsFromScore(score: number): number {
  if (score >= 90) return 5; if (score >= 80) return 4.5; if (score >= 70) return 4
  if (score >= 60) return 3.5; if (score >= 50) return 3; if (score >= 40) return 2.5
  if (score >= 30) return 2; if (score >= 20) return 1.5; if (score >= 10) return 1
  return 0.5
}

/** Compute rating thresholds relative to a company's popularity level. */
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
export function isWrestler(w: any) { const p = w.positions || []; return p.includes('Wrestler') || p.includes('Occasional') }

/** Attribute-based modifier for worker value (personality, marketability, etc.). */
export function calcAttrModifier(w: any): number {
  const attrs = (w as any).attributes || []
  const has = (id: number) => attrs.includes(id)
  let mod = 0
  const age = w.age
  if (age <= 20) mod -= 2
  else if (age <= 22) mod -= 1
  else if (age <= 25) mod += 1
  else if (age <= 28) mod += 2
  else if (age <= 31) mod += 2
  else if (age <= 34) mod += 1
  else if (age <= 37) mod += 0
  else if (age <= 40) mod -= 1
  else if (age <= 43) mod -= 3
  else mod -= 5
  if (has(507)) mod += 2; if (has(509)) mod += 1; if (has(510)) mod -= 2
  const posPers: Record<number, number> = {1:3, 3:2, 4:2, 5:3, 8:4, 9:5, 11:1}
  const negPers: Record<number, number> = {12:-2, 13:-1, 14:-1, 15:-4, 16:-1, 17:-5, 18:-2, 19:-1, 20:-1, 21:-3, 22:-2, 23:-2, 24:-1, 25:-1, 26:-5, 27:-3, 28:-5}
  const pers = attrs.find((id:number) => id >= 1 && id <= 28)
  if (pers && posPers[pers] !== undefined) mod += posPers[pers]
  else if (pers && negPers[pers] !== undefined) mod += negPers[pers]
  if (has(548)) mod += 3; else if (has(547)) mod += 2
  else if ([225,226,227,228,229,231,232,233,535,550].some(id => has(id))) mod += 1
  if (has(314) || has(315)) mod += 2; if (has(310) || has(313)) mod -= 2
  if (has(125) || has(131) || has(134)) mod += 1; if (has(346)) mod += 1; if (has(345)) mod += 1
  if (has(348)) mod += 1; if (has(352)) mod += 1; if (has(502)) mod += 1
  if (has(103)) mod += 2; if (has(104) || has(105)) mod += 1; if (has(122)) mod += 1
  if (has(106)) mod += 1; if (has(347)) mod -= 2; if (has(344)) mod -= 1
  if (has(118)) mod -= 2; if (has(119)) mod -= 1; if (has(351)) mod -= 2
  if (has(340) || has(341) || has(374) || has(375)) mod -= 1
  if (has(545)) mod -= 2; if (has(546)) mod -= 1; if (has(543)) mod -= 5; if (has(544)) mod -= 1
  if (has(349)) mod -= 1; if (has(353)) mod -= 1
  const danger = [197,198,199,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,27,563].filter(id => has(id))
  if (danger.length) mod -= danger.length * 2
  if (has(520) || has(521) || has(522) || has(523) || has(524)) mod -= 2; if (has(552)) mod -= 2
  const perception = (w as any).contract?.perception || 0
  if (perception === 1) mod += 4; else if (perception === 2) mod += 2
  const s = w.skills
  if (s) {
    const pct = (r: any) => Number(r?.pct ?? 0)
    const rPrimary = (w as any).roster_avg_primary || 0; const rEnt = (w as any).roster_avg_ent || 0
    const rPsych = (w as any).roster_avg_psych || 0; const rFund = (w as any).roster_avg_fund || 0
    const rPop = (w as any).roster_avg_pop || 0
    if (rPrimary > 0) {
      const ringVals = [pct(s.brawl), pct(s.puroresu), pct(s.hardcore), pct(s.technical), pct(s.air)].sort((a, b) => b - a)
      mod += Math.max(-5, Math.min(10, Math.floor(Math.round(ringVals[0] * 0.50 + ringVals[1] * 0.25 + ringVals[2] * 0.15 + ringVals[3] * 0.07 + ringVals[4] * 0.03 - rPrimary) / 8)))
    }
    if (rEnt > 0) mod += Math.max(-3, Math.min(8, Math.floor(Math.round(calcPerformance(s) - rEnt) / 8)))
    if (rPsych > 0) mod += Math.max(-2, Math.min(5, Math.floor(Math.round(pct(s.psych) - rPsych) / 8)))
    if (rFund > 0) mod += Math.max(-2, Math.min(5, Math.floor(Math.round((pct(s.basics) + pct(s.selling) + pct(s.consistency) + pct(s.safety)) / 4 - rFund) / 8)))
    if (rPop > 0) mod += Math.max(-3, Math.min(10, Math.floor(Math.round((w.pop?.pct ?? 0) - rPop) / 8)))
  }
  return Math.max(-35, Math.min(45, mod))
}

/** Detect wrestling style from skill values. */
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
