import { describe, it, expect } from 'vitest'
import type { Worker } from '../../api'
import { getAllPositions, getAllContracts, getAllBrands, buildFilterDimensions, filterWorkers } from './workerListFilters'

const rating = (pct: number) => ({ raw: pct * 10, pct, grade: '' })

/** Minimal worker fixture — only fields the filter logic actually reads are
 *  given real values; the rest are cheap defaults satisfying the type. */
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

describe('getAllPositions / getAllContracts / getAllBrands', () => {
  const workers = [
    makeWorker({ positions: ['Wrestler'], contract_status: 'Signed', contract: { brand: 1 } }),
    makeWorker({ positions: ['Manager'], contract_status: 'Freelance', contract: { brand: 2 } }),
    makeWorker({ positions: ['Wrestler', 'Announcer'], contract_status: 'Signed', contract: { brand: 0 } }),
  ]

  it('collects unique sorted positions with an "all" option first', () => {
    expect(getAllPositions(workers)).toEqual(['all', 'Announcer', 'Manager', 'Wrestler'])
  })

  it('collects unique sorted contract statuses with an "all" option first', () => {
    expect(getAllContracts(workers)).toEqual(['all', 'Freelance', 'Signed'])
  })

  it('collects unique sorted non-zero brand ids', () => {
    expect(getAllBrands(workers)).toEqual([1, 2])
  })
})

describe('filterWorkers', () => {
  const noFilters = { search: '', positionFilter: 'all' }
  const dims = buildFilterDimensions(['all', 'Signed'], [])

  it('filters by search across name and short_name', () => {
    const workers = [makeWorker({ name: 'Aaron Andrews', short_name: 'Aaron' }), makeWorker({ name: 'Bob Barker', short_name: 'Bob' })]
    const result = filterWorkers(workers, { ...noFilters, search: 'aaron' }, [], dims)
    expect(result.map(w => w.name)).toEqual(['Aaron Andrews'])
  })

  it('filters by active status via the status dimension', () => {
    const workers = [makeWorker({ active: true }), makeWorker({ active: false })]
    expect(filterWorkers(workers, noFilters, [{ dimension: 'status', operator: 'is', values: ['Active'] }], dims)).toHaveLength(1)
    expect(filterWorkers(workers, noFilters, [{ dimension: 'status', operator: 'is', values: ['Inactive'] }], dims)).toHaveLength(1)
  })

  it('applies a categorical filterRule via the dimension catalog (gender)', () => {
    const workers = [makeWorker({ gender: 'Male' }), makeWorker({ gender: 'Female' })]
    const result = filterWorkers(workers, noFilters, [{ dimension: 'gender', operator: 'is', values: ['Female'] }], dims)
    expect(result).toHaveLength(1)
    expect(result[0].gender).toBe('Female')
  })

  it('inverts a categorical filterRule with is_not', () => {
    const workers = [makeWorker({ gender: 'Male' }), makeWorker({ gender: 'Female' })]
    const result = filterWorkers(workers, noFilters, [{ dimension: 'gender', operator: 'is_not', values: ['Female'] }], dims)
    expect(result.map(w => w.gender)).toEqual(['Male'])
  })

  it('applies a numeric filterRule (age gte)', () => {
    const workers = [makeWorker({ age: 20 }), makeWorker({ age: 40 })]
    const result = filterWorkers(workers, noFilters, [{ dimension: 'age', operator: 'gte', values: [], min: 30 }], dims)
    expect(result.map(w => w.age)).toEqual([40])
  })

  it('applies a numeric between filterRule', () => {
    const workers = [makeWorker({ age: 10 }), makeWorker({ age: 25 }), makeWorker({ age: 50 })]
    const result = filterWorkers(workers, noFilters, [{ dimension: 'age', operator: 'between', values: [], min: 20, max: 30 }], dims)
    expect(result.map(w => w.age)).toEqual([25])
  })

  it('reads perception off the raw contract Perception field via the shared dimension', () => {
    const workers = [makeWorker({ contract: { Perception: 1 } }), makeWorker({ contract: { Perception: 0 } })]
    const result = filterWorkers(workers, noFilters, [{ dimension: 'perception', operator: 'is', values: ['Major Star'] }], dims)
    expect(result).toHaveLength(1)
  })

  it('skips an unrecognized filter dimension instead of misfiltering', () => {
    const workers = [makeWorker(), makeWorker()]
    const result = filterWorkers(workers, noFilters, [{ dimension: 'not_a_real_dimension', operator: 'is', values: ['x'] }], dims)
    expect(result).toHaveLength(2)
  })

  it('intersects multiple rules by default (implicit AND)', () => {
    const workers = [
      makeWorker({ name: 'Match Both', gender: 'Female', age: 40 }),
      makeWorker({ name: 'Gender Only', gender: 'Female', age: 20 }),
      makeWorker({ name: 'Age Only', gender: 'Male', age: 40 }),
    ]
    const result = filterWorkers(workers, noFilters, [
      { dimension: 'gender', operator: 'is', values: ['Female'] },
      { dimension: 'age', operator: 'gte', values: [], min: 30, logic: 'and' },
    ], dims)
    expect(result.map(w => w.name)).toEqual(['Match Both'])
  })

  it('unions rules when a rule specifies logic: "or"', () => {
    const workers = [
      makeWorker({ name: 'Match Both', gender: 'Female', age: 40 }),
      makeWorker({ name: 'Gender Only', gender: 'Female', age: 20 }),
      makeWorker({ name: 'Age Only', gender: 'Male', age: 40 }),
      makeWorker({ name: 'Match Neither', gender: 'Male', age: 20 }),
    ]
    const result = filterWorkers(workers, noFilters, [
      { dimension: 'gender', operator: 'is', values: ['Female'] },
      { dimension: 'age', operator: 'gte', values: [], min: 30, logic: 'or' },
    ], dims)
    expect(result.map(w => w.name).sort()).toEqual(['Age Only', 'Gender Only', 'Match Both'])
  })
})
