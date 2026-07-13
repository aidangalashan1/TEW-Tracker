import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { FinanceCashflowModule } from './FinanceCashflowModule'
import type { FinanceHistory, FinancePeriod } from '../../api'

afterEach(cleanup)

// Oldest-first (as the service returns it). Last-3 nets are 30k, -20k, 40k →
// avg 16,667 → projected next-period net +$17K, balance 550k + 16,667 = $567K.
const HISTORY: FinancePeriod[] = [
  { period: 4, income: 100000, expense: 80000, net: 20000, balance: 500000 },
  { period: 3, income: 120000, expense: 90000, net: 30000, balance: 530000 },
  { period: 2, income: 110000, expense: 130000, net: -20000, balance: 510000 },
  { period: 1, income: 140000, expense: 100000, net: 40000, balance: 550000 },
]

const props = { width: 10, height: 10, tier: 'large' as const, config: {}, onConfigChange: () => {} }

function makeData(history: FinancePeriod[]): FinanceHistory {
  return { history }
}

describe('FinanceCashflowModule', () => {
  it('renders monthly income/spending bars — one pair per period', () => {
    const { container } = render(<FinanceCashflowModule data={makeData(HISTORY)} {...props} />)
    const bars = container.querySelector('svg[aria-label="Monthly income and spending"]')
    expect(bars).not.toBeNull()
    expect(bars!.querySelectorAll('.fin-bar-income').length).toBe(HISTORY.length)
    expect(bars!.querySelectorAll('.fin-bar-expense').length).toBe(HISTORY.length)
  })

  it('renders the cash-balance trend with a dashed projected segment', () => {
    const { container } = render(<FinanceCashflowModule data={makeData(HISTORY)} {...props} />)
    const trend = container.querySelector('svg[aria-label="Cash balance over time"]')
    expect(trend).not.toBeNull()
    expect(trend!.querySelector('.fin-line-balance')).not.toBeNull()
    expect(trend!.querySelector('.fin-line-proj')).not.toBeNull()
    expect(trend!.querySelectorAll('.fin-dot-balance').length).toBe(HISTORY.length)
  })

  it('projects next-period net and balance from the recent trend', () => {
    render(<FinanceCashflowModule data={makeData(HISTORY)} {...props} />)
    expect(screen.getByText(/Projected next period: \+\$17K → \$567K/)).toBeInTheDocument()
  })

  it('shows empty states and no charts when there is no history', () => {
    const { container } = render(<FinanceCashflowModule data={makeData([])} {...props} />)
    expect(screen.getAllByText(/No financial history yet/i)).toHaveLength(2)
    expect(container.querySelector('svg[aria-label="Monthly income and spending"]')).toBeNull()
    expect(container.querySelector('svg[aria-label="Cash balance over time"]')).toBeNull()
    expect(screen.queryByText(/Projected next period/i)).toBeNull()
  })

  it('card tier shows the latest period net without charts', () => {
    const { container } = render(<FinanceCashflowModule data={makeData(HISTORY)} {...props} tier="card" />)
    expect(screen.getByText('+$40K')).toBeInTheDocument()
    expect(container.querySelector('svg[aria-label="Monthly income and spending"]')).toBeNull()
    expect(container.querySelector('svg[aria-label="Cash balance over time"]')).toBeNull()
  })
})
