import { useState } from 'react'
import type { ModuleRenderProps } from '../types'
import type { FinanceBreakdown, FinanceLine } from '../../api'
import { Bar, CardLabel, StatTile, IconTrend } from '../finance/shared'
import { fmtMoney, fmtMoneyAccounting } from '../../lib/money'

function BreakdownSection({ title, subtitle, lines, variant }: { title: string; subtitle: string; lines: FinanceLine[]; variant: 'income' | 'expense' }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const max = Math.max(1, ...lines.map(l => l.value))
  const toggle = (k: string) => setOpen(prev => {
    const next = new Set(prev)
    if (next.has(k)) next.delete(k); else next.add(k)
    return next
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="justify-between items-center">
        <CardLabel icon={<IconTrend up={variant === 'income'} className="fin-card-icon" />}>{title}</CardLabel>
        <div className="text-xs text-muted text-mono">{subtitle}</div>
      </div>
      {lines.length === 0 ? (
        <div className="text-sm text-muted">No data this period</div>
      ) : (
        lines.map(l => {
          const hasKids = l.children.length > 0
          const isOpen = open.has(l.key)
          return (
            <div key={l.key} className="flex flex-col gap-1">
              <div className={`items-center gap-2 ${hasKids ? 'cursor-pointer' : ''}`} onClick={hasKids ? () => toggle(l.key) : undefined}>
                <div className="w-140 flex-shrink-0 items-center gap-1">
                  <span className="w-12 text-xs text-muted text-center flex-shrink-0">{hasKids ? (isOpen ? '▾' : '▸') : ''}</span>
                  <span className="text-sm text-secondary truncate">{l.label}</span>
                </div>
                <Bar pct={(l.value / max) * 100} variant={variant} tip={`${l.label}: ${fmtMoney(l.value)} (${l.pct}%)`} />
                <div className="w-40 text-right flex-shrink-0 text-sm text-muted text-mono">{l.pct}%</div>
                <div className="w-64 text-right flex-shrink-0 text-sm text-mono text-primary">{fmtMoney(l.value)}</div>
              </div>
              {isOpen && l.children.map(ch => (
                <div key={ch.key} className="items-center gap-2">
                  <div className="w-140 flex-shrink-0 pl-62 truncate text-xs text-muted">{ch.label}</div>
                  <Bar pct={(ch.value / l.value) * 100} variant={variant} tip={`${ch.label}: ${fmtMoney(ch.value)}`} />
                  <div className="w-40 flex-shrink-0" />
                  <div className="w-64 text-right flex-shrink-0 text-xs text-mono text-secondary">{fmtMoney(ch.value)}</div>
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}

export function FinanceBreakdownModule({ data, tier }: ModuleRenderProps<FinanceBreakdown>) {
  const income = data?.income || []
  const expense = data?.expense || []
  const totalIncome = income.reduce((s, l) => s + l.value, 0)
  const totalExpense = expense.reduce((s, l) => s + l.value, 0)

  if (tier === 'card') {
    const topInc = income[0]
    const topExp = expense[0]
    return (
      <div className="flex flex-col h-full p-2 justify-center gap-1">
        <div className="text-xs text-semibold text-muted text-uppercase">Top Lines</div>
        {topInc ? <div className="text-xs text-green truncate">{topInc.label}: {fmtMoney(topInc.value)}</div> : <div className="text-xs text-muted">No income data</div>}
        {topExp ? <div className="text-xs text-red truncate">{topExp.label}: {fmtMoney(topExp.value)}</div> : <div className="text-xs text-muted">No spending data</div>}
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1">
        <CardLabel icon={<IconTrend up size={11} className="fin-card-icon" />} small>Income</CardLabel>
        {income.slice(0, 3).map(l => (
          <div key={l.key} className="justify-between text-xs">
            <span className="text-secondary truncate">{l.label}</span>
            <span className="text-mono text-green">{fmtMoney(l.value)}</span>
          </div>
        ))}
        <div className="mt-2">
          <CardLabel icon={<IconTrend up={false} size={11} className="fin-card-icon" />} small>Expenditure</CardLabel>
        </div>
        {expense.slice(0, 3).map(l => (
          <div key={l.key} className="justify-between text-xs">
            <span className="text-secondary truncate">{l.label}</span>
            <span className="text-mono text-red">{fmtMoney(l.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-3">
        <div className="flex flex-col gap-1">
          <CardLabel icon={<IconTrend up className="fin-card-icon" />}>Income ({fmtMoney(totalIncome)})</CardLabel>
          {income.slice(0, 8).map(l => (
            <div key={l.key} className="items-center gap-2 text-xs">
              <div className="flex-1 truncate text-secondary">{l.label}</div>
              <div className="flex-1 h-4 rounded-xs bg-darker overflow-hidden" data-tooltip={`${l.label}: ${fmtMoney(l.value)} (${l.pct}%)`}>
                <div className="h-full rounded-xs bg-green" style={{ width: `${l.pct}%` }} />
              </div>
              <span className="w-50 text-right text-mono">{fmtMoney(l.value)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <CardLabel icon={<IconTrend up={false} className="fin-card-icon" />}>Expenditure ({fmtMoney(totalExpense)})</CardLabel>
          {expense.slice(0, 8).map(l => (
            <div key={l.key} className="items-center gap-2 text-xs">
              <div className="flex-1 truncate text-secondary">{l.label}</div>
              <div className="flex-1 h-4 rounded-xs bg-darker overflow-hidden" data-tooltip={`${l.label}: ${fmtMoney(l.value)} (${l.pct}%)`}>
                <div className="h-full rounded-xs bg-red" style={{ width: `${l.pct}%` }} />
              </div>
              <span className="w-50 text-right text-mono">{fmtMoney(l.value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const net = totalIncome - totalExpense

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-auto">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total Income" value={fmtMoney(totalIncome)} tone="income" />
        <StatTile label="Total Expenditure" value={fmtMoney(totalExpense)} tone="expense" />
        <StatTile label="Net" value={fmtMoneyAccounting(net)} tone={net >= 0 ? 'net-pos' : 'net-neg'} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <BreakdownSection title="Income" subtitle={fmtMoney(totalIncome)} lines={income} variant="income" />
        <BreakdownSection title="Expenditure" subtitle={fmtMoney(totalExpense)} lines={expense} variant="expense" />
      </div>
    </div>
  )
}
