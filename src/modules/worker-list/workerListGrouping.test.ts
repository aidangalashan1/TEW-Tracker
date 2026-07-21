import { describe, it, expect } from 'vitest'
import type { Worker } from '../../api'
import { computeGroups, type SubgroupDef } from './workerListGrouping'

const rating = (pct: number) => ({ raw: pct * 10, pct, grade: '' })

function makeWorker(overrides: Omit<Partial<Worker>, 'contract'> & { contract?: any } = {}): Worker {
  const { contract, ...rest } = overrides
  return {
    uid: 1, name: 'Test Worker', short_name: 'Test', gender: 'Male', style: 'Regular',
    active: true, non_wrestler: false, freelance: false, age: 30, nationality: 1, based_in: 1,
    positions: ['Wrestler'], overness: [], pop: rating(50), home_area: '', home_region: '',
    win_loss: { wins: 0, losses: 0, draws: 0 }, dead: false, retired: false, mask: false,
    career_goal: 0, picture: '', status: [], storylines: [], tag_teams: [], stables: [],
    chemistry: [], injury_count: 0, contract_status: 'Signed', current_score: 50, potential_score: 50,
    current_stars: 3, potential_stars: 3, contract_expiry_days: 100, company_area_pop: 0,
    roster_avg_primary: 0, roster_avg_ent: 0, roster_avg_psych: 0, roster_avg_fund: 0,
    roster_avg_stamina: 0, roster_avg_pop: 0, belt_history: [], moves: [],
    contract: contract === undefined ? { face: true, amount: 1000, days_left: 100, brand: 0, Perception: 0 } : contract,
    ...rest,
  } as unknown as Worker
}

const noGroupOpts = { subgroups: [] as SubgroupDef[], activeSubgroups: new Set<string>(), advancedRoleFilters: new Set<string>(), sorts: [] }

describe('computeGroups', () => {
  it('returns null when nothing is grouped', () => {
    const workers = [makeWorker()]
    expect(computeGroups(workers, { groupBy: new Set(), ...noGroupOpts })).toBeNull()
  })

  it('groups by a single dimension (gender)', () => {
    const workers = [makeWorker({ gender: 'Male' }), makeWorker({ gender: 'Female' }), makeWorker({ gender: 'Male' })]
    const groups = computeGroups(workers, { groupBy: new Set(['gender']), ...noGroupOpts })
    expect(groups).not.toBeNull()
    const byKey = Object.fromEntries(groups!.map(([k, ws]) => [k, ws.length]))
    expect(byKey).toEqual({ Male: 2, Female: 1 })
  })

  it('groups by role using GROUP_ORDER (Wrestler before Non-Wrestler)', () => {
    const workers = [makeWorker({ non_wrestler: true }), makeWorker({ non_wrestler: false })]
    const groups = computeGroups(workers, { groupBy: new Set(['role']), ...noGroupOpts })
    expect(groups!.map(([k]) => k)).toEqual(['Wrestler', 'Non-Wrestler'])
  })

  it('active subgroups take priority over standard grouping', () => {
    const faceWorker = makeWorker({ name: 'Face Guy', contract: { face: true } })
    const heelWorker = makeWorker({ name: 'Heel Guy', contract: { face: false } })
    const subgroups: SubgroupDef[] = [{ label: 'My Faces', filters: { disposition: ['Face'] } }]
    const groups = computeGroups([faceWorker, heelWorker], {
      groupBy: new Set(['disposition']),
      subgroups,
      activeSubgroups: new Set(['My Faces']),
      advancedRoleFilters: new Set(),
      sorts: [],
    })
    expect(groups).not.toBeNull()
    const sgGroup = groups!.find(([k]) => k === 'My Faces')
    expect(sgGroup?.[1].map(e => e.worker.name)).toEqual(['Face Guy'])
    // the heel worker falls through to standard disposition grouping, not the subgroup
    const heelGroup = groups!.find(([k]) => k === 'Heel')
    expect(heelGroup?.[1].map(e => e.worker.name)).toEqual(['Heel Guy'])
  })

  it('expands a retired/non-wrestler worker into every matching advanced role group', () => {
    const worker = makeWorker({ name: 'Multi Role', retired: true, non_wrestler: true, positions: ['Manager', 'Announcer'] })
    const groups = computeGroups([worker], {
      groupBy: new Set(['role']),
      subgroups: [],
      activeSubgroups: new Set(),
      advancedRoleFilters: new Set(['Manager', 'Announcer']),
      sorts: [],
    })
    expect(groups).not.toBeNull()
    const keys = groups!.map(([k]) => k)
    expect(keys).toContain('Manager')
    expect(keys).toContain('Announcer')
    // present in both groups (multi-role expansion), not deduplicated to one
    expect(groups!.find(([k]) => k === 'Manager')?.[1]).toHaveLength(1)
    expect(groups!.find(([k]) => k === 'Announcer')?.[1]).toHaveLength(1)
  })

  it('falls back to Non-Wrestler when advanced role filters are active but none match', () => {
    const worker = makeWorker({ retired: true, non_wrestler: true, positions: ['Referee'] })
    const groups = computeGroups([worker], {
      groupBy: new Set(['role']),
      subgroups: [],
      activeSubgroups: new Set(),
      advancedRoleFilters: new Set(['Manager']),
      sorts: [],
    })
    expect(groups!.map(([k]) => k)).toEqual(['Non-Wrestler'])
  })
})
