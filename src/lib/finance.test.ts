import { describe, it, expect } from 'vitest'
import { projectNextPeriod, historyStats, computeAvgWage, computeRankPercentile, sumLineValues } from './finance'
import type { FinancePeriod, FinanceLine } from '../api'

// Oldest-first (as the service returns it). Last-3 nets are 30k, -20k, 40k →
// avg 16,667 → projected next-period net +$17K, balance 550k + 16,667 = $567K.
const HISTORY: FinancePeriod[] = [
  { period: 4, income: 100000, expense: 80000, net: 20000, balance: 500000 },
  { period: 3, income: 120000, expense: 90000, net: 30000, balance: 530000 },
  { period: 2, income: 110000, expense: 130000, net: -20000, balance: 510000 },
  { period: 1, income: 140000, expense: 100000, net: 40000, balance: 550000 },
]

describe('projectNextPeriod', () => {
  it('projects next-period net and balance from the trailing 3 periods', () => {
    const result = projectNextPeriod(HISTORY)
    expect(result).toEqual({ net: 16667, balance: 566667 })
  })

  it('returns null with fewer than 2 periods', () => {
    expect(projectNextPeriod([HISTORY[0]])).toBeNull()
    expect(projectNextPeriod([])).toBeNull()
  })
})

describe('historyStats', () => {
  it('computes average income/expense and best/worst period by net', () => {
    const stats = historyStats(HISTORY)
    expect(stats).not.toBeNull()
    expect(stats!.avgIncome).toBe(117500)
    expect(stats!.avgExpense).toBe(100000)
    expect(stats!.best.net).toBe(40000)
    expect(stats!.worst.net).toBe(-20000)
  })

  it('returns null with no history', () => {
    expect(historyStats([])).toBeNull()
  })
})

describe('computeAvgWage', () => {
  it('divides total by count', () => {
    expect(computeAvgWage(1490000, 58)).toBe(25690)
  })

  it('returns 0 with zero earners', () => {
    expect(computeAvgWage(0, 0)).toBe(0)
  })
})

describe('computeRankPercentile', () => {
  it('computes rank as a percentile of total, floored at 1', () => {
    expect(computeRankPercentile(7, 35)).toBe(20)
    expect(computeRankPercentile(1, 35)).toBe(3)
  })

  it('returns null with zero total', () => {
    expect(computeRankPercentile(0, 0)).toBeNull()
  })
})

describe('sumLineValues', () => {
  it('sums line values', () => {
    const lines: FinanceLine[] = [
      { key: 'a', label: 'A', value: 100, pct: 50, children: [] },
      { key: 'b', label: 'B', value: 200, pct: 50, children: [] },
    ]
    expect(sumLineValues(lines)).toBe(300)
  })

  it('returns 0 for an empty list', () => {
    expect(sumLineValues([])).toBe(0)
  })
})
