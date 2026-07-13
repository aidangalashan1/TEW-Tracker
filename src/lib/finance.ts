import type { FinancePeriod, FinanceLine } from '../api'

/** Forecast next period from the trailing 3 periods' net average — a plain
 *  average of real periods, nothing modeled or invented (was finance-cashflow). */
export function projectNextPeriod(history: FinancePeriod[]): { net: number; balance: number } | null {
  if (history.length < 2) return null
  const recent = history.slice(-3)
  const net = Math.round(recent.reduce((s, h) => s + h.net, 0) / recent.length)
  return { net, balance: history[history.length - 1].balance + net }
}

/** Simple aggregates over history — plain average/min/max of real periods. */
export function historyStats(history: FinancePeriod[]) {
  if (history.length === 0) return null
  const avgIncome = Math.round(history.reduce((s, h) => s + h.income, 0) / history.length)
  const avgExpense = Math.round(history.reduce((s, h) => s + h.expense, 0) / history.length)
  const best = history.reduce((a, b) => (b.net > a.net ? b : a))
  const worst = history.reduce((a, b) => (b.net < a.net ? b : a))
  return { avgIncome, avgExpense, best, worst }
}

export function computeAvgWage(total: number, count: number): number {
  return count ? Math.round(total / count) : 0
}

export function computeRankPercentile(rank: number, total: number): number | null {
  return total ? Math.max(1, Math.round((rank / total) * 100)) : null
}

export function sumLineValues(lines: FinanceLine[]): number {
  return lines.reduce((s, l) => s + l.value, 0)
}
