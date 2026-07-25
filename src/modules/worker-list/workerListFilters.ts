import type { Worker } from '../../api'
import { PERCEPTION_LABELS, SKILL_LABELS } from '../../lib/labels'

export interface FilterRule {
  dimension: string
  operator: 'is' | 'is_not' | 'gte' | 'lte' | 'between'
  values: string[]
  min?: number
  max?: number
  logic?: 'and' | 'or'
}

export interface BasicFilters {
  search: string
  positionFilter: string
}

export type DimDef = {
  id: string; label: string; type: 'cat' | 'num'; group: string
  options?: string[]
  getValue: (w: Worker) => string | number
}

export function getAllPositions(workers: Worker[]): string[] {
  const set = new Set<string>()
  workers.forEach(w => w.positions.forEach(p => set.add(p)))
  return ['all', ...Array.from(set).sort()]
}

export function getAllContracts(workers: Worker[]): string[] {
  const set = new Set<string>()
  workers.forEach(w => { if (w.contract_status) set.add(w.contract_status) })
  return ['all', ...Array.from(set).sort()]
}

export function getAllBrands(workers: Worker[]): number[] {
  const set = new Set<number>()
  workers.forEach(w => { const b = (w as any).contract?.brand; if (b) set.add(b) })
  return Array.from(set).sort((a, b) => a - b)
}

/** The custom-filter-rule-builder's dimension catalog — also the single
 *  source of truth for evaluating saved FilterRules (see filterWorkers),
 *  so a new filterable field only needs to be added here once. */
export function buildFilterDimensions(allContracts: string[], allBrands: number[]): DimDef[] {
  return [
    // Personal
    { id: 'gender', label: 'Gender', type: 'cat', group: 'personal', options: ['Male', 'Female'], getValue: w => w.gender },
    { id: 'age', label: 'Age', type: 'num', group: 'personal', getValue: w => w.age },
    { id: 'status', label: 'Status', type: 'cat', group: 'personal', options: ['Active', 'Inactive'], getValue: w => w.active ? 'Active' : 'Inactive' },
    { id: 'wrestler', label: 'Worker Type', type: 'cat', group: 'personal', options: ['Wrestler', 'Non-Wrestler'], getValue: w => w.non_wrestler ? 'Non-Wrestler' : 'Wrestler' },
    { id: 'retired', label: 'Retirement', type: 'cat', group: 'personal', options: ['Active', 'Retired'], getValue: w => w.retired ? 'Retired' : 'Active' },
    // Creative
    { id: 'perception', label: 'Perception', type: 'cat', group: 'creative', options: Object.values(PERCEPTION_LABELS).filter(v => v !== 'No Perception'), getValue: w => PERCEPTION_LABELS[(w.contract as any)?.Perception ?? 0] || 'Unknown' },
    { id: 'disposition', label: 'Disposition', type: 'cat', group: 'creative', options: ['Face', 'Heel'], getValue: w => w.contract?.face ? 'Face' : 'Heel' },
    { id: 'avg_segment', label: 'Avg Segment', type: 'num', group: 'creative', getValue: w => w.performance?.avg_segment_rating?.pct ?? 0 },
    { id: 'avg_match', label: 'Avg Match', type: 'num', group: 'creative', getValue: w => w.performance?.avg_match_rating?.pct ?? 0 },
    { id: 'avg_angle', label: 'Avg Angle', type: 'num', group: 'creative', getValue: w => w.performance?.avg_angle_rating?.pct ?? 0 },
    { id: 'total_segments', label: '# Segments', type: 'num', group: 'creative', getValue: w => w.performance?.total_segments ?? 0 },
    { id: 'total_matches', label: '# Matches', type: 'num', group: 'creative', getValue: w => w.performance?.total_matches ?? 0 },
    { id: 'total_angles', label: '# Angles', type: 'num', group: 'creative', getValue: w => w.performance?.total_angles ?? 0 },
    // Contract
    { id: 'contract', label: 'Contract', type: 'cat', group: 'contract', options: allContracts.filter(c => c !== 'all'), getValue: w => w.contract_status },
    { id: 'wage', label: 'Wage', type: 'num', group: 'contract', getValue: w => w.contract?.amount ?? 0 },
    { id: 'days_left', label: 'Days Left', type: 'num', group: 'contract', getValue: w => w.contract?.days_left ?? 0 },
    ...(allBrands.length > 1 ? [{ id: 'brand', label: 'Brand', type: 'cat' as const, group: 'contract', options: allBrands.map(b => `Brand ${b}`), getValue: (w: Worker) => `Brand ${(w as any).contract?.brand || 0}` }] : []),
    // Stats
    { id: 'current_score', label: 'Current Ability', type: 'num', group: 'stats', getValue: w => w.current_score },
    { id: 'potential_score', label: 'Potential', type: 'num', group: 'stats', getValue: w => w.potential_score },
    { id: 'brawl', label: SKILL_LABELS.brawl, type: 'num', group: 'stats', getValue: w => w.skills?.brawl?.pct ?? 0 },
    { id: 'tech', label: SKILL_LABELS.technical, type: 'num', group: 'stats', getValue: w => w.skills?.technical?.pct ?? 0 },
    { id: 'air', label: SKILL_LABELS.air, type: 'num', group: 'stats', getValue: w => w.skills?.air?.pct ?? 0 },
    { id: 'psych', label: SKILL_LABELS.psych, type: 'num', group: 'stats', getValue: w => w.skills?.psych?.pct ?? 0 },
    { id: 'charisma', label: SKILL_LABELS.charisma, type: 'num', group: 'stats', getValue: w => w.skills?.charisma?.pct ?? 0 },
    { id: 'mic', label: SKILL_LABELS.mic, type: 'num', group: 'stats', getValue: w => w.skills?.mic?.pct ?? 0 },
    { id: 'acting', label: SKILL_LABELS.acting, type: 'num', group: 'stats', getValue: w => w.skills?.acting?.pct ?? 0 },
    { id: 'star', label: SKILL_LABELS.star, type: 'num', group: 'stats', getValue: w => w.skills?.star?.pct ?? 0 },
    { id: 'menace', label: SKILL_LABELS.menace, type: 'num', group: 'stats', getValue: w => w.skills?.menace?.pct ?? 0 },
    { id: 'stamina', label: SKILL_LABELS.stamina, type: 'num', group: 'stats', getValue: w => w.skills?.stamina?.pct ?? 0 },
    { id: 'flash', label: SKILL_LABELS.flash, type: 'num', group: 'stats', getValue: w => w.skills?.flash?.pct ?? 0 },
    { id: 'consistency', label: SKILL_LABELS.consistency, type: 'num', group: 'stats', getValue: w => w.skills?.consistency?.pct ?? 0 },
    { id: 'selling', label: SKILL_LABELS.selling, type: 'num', group: 'stats', getValue: w => w.skills?.selling?.pct ?? 0 },
    { id: 'basics', label: SKILL_LABELS.basics, type: 'num', group: 'stats', getValue: w => w.skills?.basics?.pct ?? 0 },
    { id: 'safety', label: SKILL_LABELS.safety, type: 'num', group: 'stats', getValue: w => w.skills?.safety?.pct ?? 0 },
    { id: 'respect', label: SKILL_LABELS.respect, type: 'num', group: 'stats', getValue: w => w.skills?.respect?.pct ?? 0 },
    { id: 'reputation', label: SKILL_LABELS.reputation, type: 'num', group: 'stats', getValue: w => w.skills?.reputation?.pct ?? 0 },
    // Popularity
    { id: 'pop', label: 'Popularity', type: 'num', group: 'popularity', getValue: w => w.pop?.pct ?? 0 },
  ]
}

/** Basic dropdown filters, then the custom filterRules — each rule's
 *  dimension is looked up in `dimensions` and evaluated via its own
 *  getValue, so there's one mapping (buildFilterDimensions) instead of a
 *  second hand-duplicated dimension-to-field chain. */
export function filterWorkers(workers: Worker[], basic: BasicFilters, filterRules: FilterRule[], dimensions: DimDef[]): Worker[] {
  let list = workers
  const { search, positionFilter } = basic
  if (search) {
    const q = search.toLowerCase()
    list = list.filter(w => w.name.toLowerCase().includes(q) || w.short_name.toLowerCase().includes(q))
  }
  if (positionFilter !== 'all') {
    list = list.filter(w => w.positions.includes(positionFilter))
  }

  if (filterRules.length === 0) return list
  const dimMap = new Map(dimensions.map(d => [d.id, d]))
  const evalRule = (w: Worker, rule: FilterRule): boolean => {
    const dim = dimMap.get(rule.dimension)
    if (!dim) return true
    if (dim.type === 'cat') {
      if (rule.values.length === 0) return true
      const match = rule.values.includes(String(dim.getValue(w)))
      return rule.operator === 'is_not' ? !match : match
    }
    const val = Number(dim.getValue(w))
    if (rule.operator === 'gte') return val >= (rule.min ?? 0)
    if (rule.operator === 'lte') return val <= (rule.max ?? 999)
    if (rule.operator === 'between') return val >= (rule.min ?? 0) && val <= (rule.max ?? 999)
    return true
  }
  // Rule[i].logic connects rule[i] to the running result of rules before it,
  // evaluated left-to-right (e.g. r0 AND r1 OR r2 == (r0 AND r1) OR r2) —
  // previously every rule was ANDed together regardless of its logic value.
  return list.filter(w => {
    let result = evalRule(w, filterRules[0])
    for (let i = 1; i < filterRules.length; i++) {
      const ruleResult = evalRule(w, filterRules[i])
      result = filterRules[i].logic === 'or' ? (result || ruleResult) : (result && ruleResult)
    }
    return result
  })
}
