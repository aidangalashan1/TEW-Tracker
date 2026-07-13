import type { ModuleRenderProps } from '../types'
import type { FinanceSummary } from '../../api'
import { StatTile, StatCard, CardLabel, IconCoin, IconTrend, IconTag, IconShield } from '../finance/shared'
import { fmtMoney, fmtMoneyAccounting } from '../../lib/money'

export function FinanceSummaryModule({ data, tier }: ModuleRenderProps<FinanceSummary>) {
  if (!data) return <div className="loading p-3 text-muted">Loading…</div>
  const { balance, current, wage_bill, standing } = data

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full p-2 justify-center gap-1">
        <CardLabel icon={<IconCoin size={11} className="fin-card-icon" />} small>Balance</CardLabel>
        <div className="text-xl text-bold text-mono text-primary">{fmtMoney(balance)}</div>
        <div className={`text-xs text-mono ${current.net >= 0 ? 'text-green' : 'text-red'}`}>
          {current.net >= 0 ? '+' : ''}{fmtMoney(current.net)} this period
        </div>
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full p-2 gap-1">
        <div className="text-xs text-semibold text-muted text-uppercase">Finance</div>
        <div className="flex-1 grid grid-cols-2 gap-1">
          <StatTile label="Balance" value={fmtMoney(balance)} />
          <StatTile label="Net" value={fmtMoney(current.net)} tone={current.net >= 0 ? 'net-pos' : 'net-neg'} />
          <StatTile label="Wages" value={fmtMoney(wage_bill.total)} tone="expense" />
          <StatTile label="Standing" value={standing.total ? `#${standing.rank}` : '—'} />
        </div>
      </div>
    )
  }

  const avgWage = wage_bill.count ? Math.round(wage_bill.total / wage_bill.count) : 0
  const percentile = standing.total ? Math.max(1, Math.round((standing.rank / standing.total) * 100)) : null

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full p-3 gap-3 overflow-auto">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<IconCoin className="fin-card-icon" />} label="Balance" value={fmtMoney(balance)} subtitle="Available cash"
            details={[{ label: 'This period', value: fmtMoneyAccounting(current.net), tone: current.net >= 0 ? 'net-pos' : 'net-neg' }]}
          />
          <StatCard
            icon={<IconTrend up={current.net >= 0} className="fin-card-icon" />} label="Profit / Loss"
            value={fmtMoneyAccounting(current.net)} valueTone={current.net >= 0 ? 'net-pos' : 'net-neg'}
            subtitle={`${current.margin}% margin`}
            details={[
              { label: 'Income', value: fmtMoney(current.total_income), tone: 'income' },
              { label: 'Expenses', value: fmtMoney(current.total_expense), tone: 'expense' },
            ]}
          />
          <StatCard
            icon={<IconTag className="fin-card-icon" />} label="Wage Bill"
            value={fmtMoney(wage_bill.total)} valueTone="expense"
            proportion={{ pct: wage_bill.pct_of_income, variant: wage_bill.pct_of_income > 100 ? 'over' : 'wage', tip: `${wage_bill.pct_of_income}% of income` }}
            details={[{ label: 'Contracts', value: `${wage_bill.count}` }, { label: 'Avg wage', value: fmtMoney(avgWage) }]}
          />
          <StatCard
            icon={<IconShield className="fin-card-icon" />} label="Standing" value={standing.total ? `#${standing.rank}` : '—'} subtitle={standing.total ? `of ${standing.total}` : ''}
            details={percentile != null ? [{ label: 'Revenue', value: fmtMoney(current.total_income) }, { label: 'Percentile', value: `Top ${percentile}%` }] : undefined}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full p-3 gap-3 flex-wrap overflow-auto">
      <StatCard
        icon={<IconCoin className="fin-card-icon" />} label="Balance" value={fmtMoney(balance)} subtitle="Available cash"
        details={[{ label: 'This period', value: fmtMoneyAccounting(current.net), tone: current.net >= 0 ? 'net-pos' : 'net-neg' }]}
      />
      <StatCard
        icon={<IconTrend up={current.net >= 0} className="fin-card-icon" />} label="Profit / Loss (period)"
        value={fmtMoneyAccounting(current.net)} valueTone={current.net >= 0 ? 'net-pos' : 'net-neg'}
        subtitle={`${current.margin}% margin on ${fmtMoney(current.total_income)} income`}
        details={[
          { label: 'Income', value: fmtMoney(current.total_income), tone: 'income' },
          { label: 'Expenses', value: fmtMoney(current.total_expense), tone: 'expense' },
        ]}
      />
      <StatCard
        icon={<IconTag className="fin-card-icon" />} label="Wage Bill"
        value={fmtMoney(wage_bill.total)} valueTone="expense"
        subtitle={`${wage_bill.count} on contract`}
        proportion={{ pct: wage_bill.pct_of_income, variant: wage_bill.pct_of_income > 100 ? 'over' : 'wage', tip: `${wage_bill.pct_of_income}% of income` }}
        details={[{ label: 'Avg wage', value: fmtMoney(avgWage) }]}
      />
      <StatCard
        icon={<IconShield className="fin-card-icon" />} label="Standing"
        value={standing.total ? `#${standing.rank}` : '—'}
        subtitle={standing.total ? `of ${standing.total} promotions by revenue` : 'no comparison'}
        details={percentile != null ? [{ label: 'Revenue', value: fmtMoney(current.total_income) }, { label: 'Percentile', value: `Top ${percentile}%` }] : undefined}
      />
    </div>
  )
}
