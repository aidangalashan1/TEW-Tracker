import { useState, useRef, useEffect } from 'react'
import type { ModuleRenderProps } from '../types'
import type {
  FinanceSummary, FinanceHistory, FinanceBreakdown, WageBill, FinanceStanding,
  FinancePeriod, FinanceLine, WageEarner, FinanceStandingPeer,
} from '../../api'
import {
  StatTile, StatCard, CardLabel, Legend, EmptyChart, Bar, ProportionBar,
  IconCoin, IconTrend, IconTag, IconShield, IconWallet,
} from './shared'
import { fmtMoney, fmtMoneyAccounting } from '../../lib/money'
import { projectNextPeriod, historyStats, computeAvgWage, computeRankPercentile, sumLineValues } from '../../lib/finance'
import { daysLeftTone } from '../../lib/contracts'
import { maxBy } from '../../lib/arrays'
import { useApp } from '../../context/AppContext'
import { formatRatingPct } from '../../lib/grade'

export interface FinanceModuleData {
  summary: FinanceSummary
  history: FinanceHistory
  breakdown: FinanceBreakdown
  wages: WageBill
  standing: FinanceStanding
}

type Tab = 'overview' | 'cashflow' | 'breakdown' | 'wages' | 'standing'
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'cashflow', label: 'Cash Flow' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'wages', label: 'Wages' },
  { id: 'standing', label: 'Standing' },
]

// ---------------------------------------------------------------------------
// Portraits (was finance-wages/EarnerImg, finance-standing/PeerLogo)
// ---------------------------------------------------------------------------

function EarnerImg({ earner, size, onClick }: { earner: WageEarner; size: number; onClick: () => void }) {
  const { img } = useApp()
  const [err, setErr] = useState(false)
  const url = earner.picture ? img('People/' + earner.picture) : ''
  if (!url || err) {
    return <div className="cursor-pointer flex-shrink-0" style={{ width: size, height: size, background: 'var(--bg-secondary)', borderRadius: 8 }} onClick={onClick} />
  }
  return (
    <img src={url} alt="" draggable={false} onClick={onClick} onError={() => setErr(true)}
      className="cursor-pointer flex-shrink-0" style={{ width: size, height: size, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
  )
}

function PeerLogo({ peer, size }: { peer: FinanceStandingPeer; size: number }) {
  const { img } = useApp()
  const [err, setErr] = useState(false)
  const url = peer.logo ? img('Logos/' + peer.logo) : ''
  if (!url || err) {
    return <div className="flex-shrink-0" style={{ width: size, height: size, background: 'var(--bg-secondary)', borderRadius: 8 }} />
  }
  return (
    <img src={url} alt="" draggable={false} onError={() => setErr(true)}
      className="flex-shrink-0" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 8, display: 'block' }} />
  )
}

// ---------------------------------------------------------------------------
// Charts (was finance-cashflow's PeriodBars/BalanceTrend)
// ---------------------------------------------------------------------------

function PeriodBars({ history, chartW }: { history: FinancePeriod[]; chartW: number }) {
  const H = 200, padL = 8, padR = 8, padT = 14, padB = 8
  const W = Math.max(300, chartW)
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = history.length
  const maxY = maxBy(history.flatMap(h => [h.income, h.expense]), v => v)
  const groupW = innerW / n
  const barW = Math.min(16, groupW * 0.36)
  const baseY = padT + innerH
  const y = (v: number) => padT + innerH - (v / maxY) * innerH
  const gridYs = [0, 0.5, 1].map(f => padT + innerH - f * innerH)

  return (
    <svg className="w-full block" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly income and spending">
      {gridYs.map((gy, i) => <line key={i} className="fin-grid-line" x1={padL} y1={gy} x2={W - padR} y2={gy} />)}
      <text className="fin-axis-label" x={padL} y={padT - 4}>{fmtMoney(maxY)}</text>
      {history.map((h, i) => {
        const cx = padL + groupW * i + groupW / 2
        return (
          <g key={i}>
            <rect className="fin-bar-income" x={cx - barW - 1} y={y(h.income)} width={barW} height={baseY - y(h.income)}>
              <title>{`Income: ${fmtMoney(h.income)}`}</title>
            </rect>
            <rect className="fin-bar-expense" x={cx + 1} y={y(h.expense)} width={barW} height={baseY - y(h.expense)}>
              <title>{`Spending: ${fmtMoney(h.expense)}`}</title>
            </rect>
          </g>
        )
      })}
    </svg>
  )
}

function BalanceTrend({ history, projected, chartW }: { history: FinancePeriod[]; projected: number | null; chartW: number }) {
  const H = 150, padL = 8, padR = 8, padT = 14, padB = 8
  const W = Math.max(300, chartW)
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = history.length
  const totalPts = n + (projected != null ? 1 : 0)
  const vals = history.map(h => h.balance).concat(projected != null ? [projected] : [])
  const maxRaw = Math.max(...vals)
  const minRaw = Math.min(...vals)
  const pad = (maxRaw - minRaw) * 0.15 || Math.abs(maxRaw) * 0.1 || 1
  const maxY = maxRaw + pad
  const minY = minRaw - pad
  const span = maxY - minY || 1
  const x = (i: number) => padL + (totalPts <= 1 ? innerW / 2 : (i / (totalPts - 1)) * innerW)
  const y = (v: number) => padT + innerH - ((v - minY) / span) * innerH
  const linePath = history.map((h, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(h.balance).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`
  const projPath = projected != null && n > 0
    ? `M${x(n - 1).toFixed(1)},${y(history[n - 1].balance).toFixed(1)} L${x(n).toFixed(1)},${y(projected).toFixed(1)}`
    : ''

  return (
    <svg className="w-full block" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cash balance over time">
      <line className="fin-grid-line" x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} />
      <text className="fin-axis-label" x={padL} y={padT - 4}>{fmtMoney(maxRaw)}</text>
      <path className="fin-area-balance" d={areaPath} />
      <path className="fin-line fin-line-balance" d={linePath} />
      {projPath && <path className="fin-line fin-line-proj" d={projPath} />}
      {history.map((h, i) => (
        <circle key={i} className="fin-dot-balance" cx={x(i)} cy={y(h.balance)} r={2.5}>
          <title>{`Balance: ${fmtMoney(h.balance)}`}</title>
        </circle>
      ))}
      {projected != null && (
        <circle className="fin-dot-proj" cx={x(n)} cy={y(projected)} r={2.5}>
          <title>{`Projected: ${fmtMoney(projected)}`}</title>
        </circle>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

function OverviewTab({ data, tier, chartW }: { data: FinanceModuleData; tier: 'medium' | 'large'; chartW: number }) {
  const limit = tier === 'large' ? 6 : 3
  const income = data.breakdown.income
  const expense = data.breakdown.expense
  const history = data.history.history
  const projection = projectNextPeriod(history)

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <CardLabel icon={<IconTrend up className="fin-card-icon" />}>Top Income</CardLabel>
          {income.slice(0, limit).map(l => (
            <div key={l.key} className="justify-between text-xs">
              <span className="text-secondary truncate">{l.label}</span>
              <span className="text-mono text-green">{fmtMoney(l.value)}</span>
            </div>
          ))}
          {income.length === 0 && <div className="text-xs text-muted">No income data</div>}
        </div>
        <div className="flex flex-col gap-1">
          <CardLabel icon={<IconTrend up={false} className="fin-card-icon" />}>Top Expenditure</CardLabel>
          {expense.slice(0, limit).map(l => (
            <div key={l.key} className="justify-between text-xs">
              <span className="text-secondary truncate">{l.label}</span>
              <span className="text-mono text-red">{fmtMoney(l.value)}</span>
            </div>
          ))}
          {expense.length === 0 && <div className="text-xs text-muted">No spending data</div>}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <CardLabel icon={<IconWallet className="fin-card-icon" />}>Cash Balance</CardLabel>
        {history.length >= 2
          ? <BalanceTrend history={history} projected={projection ? projection.balance : null} chartW={chartW} />
          : <EmptyChart label="Your cash balance trend will chart here as the game progresses." />}
      </div>
    </div>
  )
}

function CashFlowTab({ data, chartW }: { data: FinanceModuleData; chartW: number }) {
  const history = data.history.history
  const projection = projectNextPeriod(history)
  const stats = historyStats(history)

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-4">
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <StatTile label="Avg Income" value={fmtMoney(stats.avgIncome)} tone="income" subtitle={`over ${history.length} periods`} />
          <StatTile label="Avg Spending" value={fmtMoney(stats.avgExpense)} tone="expense" subtitle={`over ${history.length} periods`} />
          <StatTile label="Best Period" value={fmtMoneyAccounting(stats.best.net)} tone={stats.best.net >= 0 ? 'net-pos' : 'net-neg'} subtitle="peak net" />
          <StatTile label="Worst Period" value={fmtMoneyAccounting(stats.worst.net)} tone={stats.worst.net >= 0 ? 'net-pos' : 'net-neg'} subtitle="low net" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="justify-between items-center">
          <CardLabel icon={<IconTrend up className="fin-card-icon" />}>Income vs Spending Over Time</CardLabel>
          <Legend />
        </div>
        {history.length >= 1
          ? <PeriodBars history={history} chartW={chartW} />
          : <EmptyChart label="Monthly income and spending will chart here as the game progresses." />}
      </div>

      <div className="flex flex-col gap-2">
        <div className="justify-between items-center">
          <CardLabel icon={<IconWallet className="fin-card-icon" />}>Cash Balance</CardLabel>
          {projection && (
            <div className="text-xs text-muted text-mono">
              Projected next period: {projection.net >= 0 ? '+' : ''}{fmtMoney(projection.net)} → {fmtMoney(projection.balance)}
            </div>
          )}
        </div>
        {history.length >= 2
          ? <BalanceTrend history={history} projected={projection ? projection.balance : null} chartW={chartW} />
          : <EmptyChart label="Your cash balance trend will chart here as the game progresses." />}
      </div>
    </div>
  )
}

function BreakdownSection({ title, subtitle, lines, variant }: { title: string; subtitle: string; lines: FinanceLine[]; variant: 'income' | 'expense' }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const max = maxBy(lines, l => l.value)
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

function BreakdownTab({ data }: { data: FinanceModuleData }) {
  const income = data.breakdown.income
  const expense = data.breakdown.expense
  const totalIncome = sumLineValues(income)
  const totalExpense = sumLineValues(expense)
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

function WagesTab({ data, tier }: { data: FinanceModuleData; tier: 'medium' | 'large' }) {
  const { navigateToEntity } = useApp()
  const { total, count, top, pct_of_income, avg_wage } = data.wages
  const max = maxBy(top, e => e.amount)
  const limited = tier === 'large' ? top : top.slice(0, 6)
  const imgSize = tier === 'large' ? 28 : 26

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-2">
      <div className="justify-between items-center">
        <CardLabel icon={<IconTag className="fin-card-icon" />}>Top Earners</CardLabel>
        <div className="text-xs text-muted text-mono">{count} on contract · {fmtMoney(total)} · avg {fmtMoney(avg_wage)}</div>
      </div>
      <div className="items-center gap-2">
        <ProportionBar pct={pct_of_income} variant={pct_of_income > 100 ? 'over' : 'wage'} tip={`Wage bill: ${pct_of_income}% of income`} />
        <span className="text-xs text-mono text-secondary flex-shrink-0">{pct_of_income}% of income</span>
      </div>
      {limited.length === 0 ? (
        <div className="text-sm text-muted">No active contracts</div>
      ) : (
        limited.map(e => (
          <div key={e.uid} className="items-center gap-2">
            <EarnerImg earner={e} size={imgSize} onClick={() => navigateToEntity('worker', e.uid)} />
            <div className="w-110 flex-shrink-0 min-w-0 cursor-pointer" onClick={() => navigateToEntity('worker', e.uid)}>
              <div className="truncate text-sm text-secondary">{e.name}</div>
              {e.position && <div className="text-xxs text-muted truncate">{e.position}</div>}
            </div>
            <Bar pct={(e.amount / max) * 100} variant="wage" tip={`${e.name}: ${fmtMoney(e.amount)} (${((e.amount / total) * 100).toFixed(1)}% of wage bill)`} />
            {tier === 'large' && e.days_left > 0 && (
              <div className={`w-60 text-right flex-shrink-0 text-xxs text-mono ${daysLeftTone(e.days_left)}`} data-tooltip="Days left on contract">{e.days_left}d</div>
            )}
            <div className="w-64 text-right flex-shrink-0 text-sm text-mono text-primary">{fmtMoney(e.amount)}</div>
          </div>
        ))
      )}
    </div>
  )
}

function StandingTab({ data, tier }: { data: FinanceModuleData; tier: 'medium' | 'large' }) {
  const { allFeds, setFocusedFed, ratingFormat } = useApp()
  const { rank, total, peers } = data.standing
  const findFed = (uid: number) => allFeds.find(f => f.uid === uid)
  const focusPeer = (peer: FinanceStandingPeer) => {
    const fed = findFed(peer.fed_uid)
    if (fed) setFocusedFed(fed)
  }

  const max = maxBy(peers, p => p.income)
  const limited = tier === 'large' ? peers : peers.slice(0, 6)
  const logoSize = tier === 'large' ? 28 : 26

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-2">
      <div className="justify-between items-center">
        <CardLabel icon={<IconShield className="fin-card-icon" />}>Financial Standing — By Revenue</CardLabel>
        <div className="text-xs text-muted text-mono">{total ? `#${rank} of ${total}` : 'no comparison'}</div>
      </div>
      {limited.length === 0 ? (
        <div className="text-sm text-muted">No comparison data</div>
      ) : (
        limited.map(p => {
          const fed = findFed(p.fed_uid)
          return (
            <div key={p.fed_uid} className={`items-center gap-2 ${p.is_player ? 'bg-blue-alpha rounded-sm' : ''}`}>
              <div className="w-24 text-xs text-muted text-mono flex-shrink-0 text-center">#{p.rank}</div>
              <PeerLogo peer={p} size={logoSize} />
              <div className={`w-110 flex-shrink-0 truncate text-sm cursor-pointer ${p.is_player ? 'text-primary text-semibold' : 'text-secondary'}`} onClick={() => focusPeer(p)}>{p.name}</div>
              <div className="w-100 flex-shrink-0 text-xxs text-muted truncate" data-tooltip={fed ? `Prestige: ${formatRatingPct(fed.prestige.pct, ratingFormat)} · Momentum: ${formatRatingPct(fed.momentum.pct, ratingFormat)}` : undefined}>
                {fed ? `${fed.size_label} · ${formatRatingPct(fed.prestige.pct, ratingFormat)}` : ''}
              </div>
              <Bar pct={(p.income / max) * 100} variant={p.is_player ? 'wage' : 'income'} tip={`${p.name}: ${fmtMoney(p.income)}`} />
              <div className="w-64 text-right flex-shrink-0 text-sm text-mono text-primary">{fmtMoney(p.income)}</div>
              {tier === 'large' && fed && (
                <div className="w-80 text-right flex-shrink-0 text-xxs text-muted">{fed.worker_count} on roster</div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main module
// ---------------------------------------------------------------------------

export function FinanceModule({ data, tier }: ModuleRenderProps<FinanceModuleData>) {
  const [tab, setTab] = useState<Tab>('overview')
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartW, setChartW] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setChartW(el.clientWidth)
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setChartW(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (!data) return <div className="loading p-3 text-muted">Loading…</div>
  const { balance, current, wage_bill, standing } = data.summary
  const avgWage = computeAvgWage(wage_bill.total, wage_bill.count)
  const percentile = computeRankPercentile(standing.rank, standing.total)

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

  const balanceHistory = data.history.history.map(h => h.balance)
  const topIncome = data.breakdown.income.slice(0, 2)
  const topExpense = data.breakdown.expense.slice(0, 2)

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full p-2 gap-2 overflow-auto">
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={<IconCoin className="fin-card-icon" />} label="Balance" value={fmtMoney(balance)}
            sparkline={balanceHistory} subtitle="Available cash"
          />
          <StatCard
            icon={<IconTrend up={current.net >= 0} className="fin-card-icon" />} label="Profit / Loss"
            value={fmtMoneyAccounting(current.net)} valueTone={current.net >= 0 ? 'net-pos' : 'net-neg'}
            subtitle={`${current.margin}% margin`}
          />
          <StatCard
            icon={<IconTag className="fin-card-icon" />} label="Wage Bill"
            value={fmtMoney(wage_bill.total)} valueTone="expense"
            proportion={{ pct: wage_bill.pct_of_income, variant: wage_bill.pct_of_income > 100 ? 'over' : 'wage', tip: `${wage_bill.pct_of_income}% of income` }}
          />
          <StatCard
            icon={<IconShield className="fin-card-icon" />} label="Standing" value={standing.total ? `#${standing.rank}` : '—'}
            subtitle={standing.total ? `of ${standing.total}` : ''}
          />
        </div>
        {(topIncome.length > 0 || topExpense.length > 0) && (
          <div className="bg-card rounded border-default p-3 flex flex-col gap-2">
            <CardLabel icon={<IconTrend up className="fin-card-icon" />}>Top Lines</CardLabel>
            {topIncome.map(l => (
              <div key={l.key} className="justify-between text-xs">
                <span className="text-secondary truncate">{l.label}</span>
                <span className="text-mono text-green">{fmtMoney(l.value)}</span>
              </div>
            ))}
            {topExpense.map(l => (
              <div key={l.key} className="justify-between text-xs">
                <span className="text-secondary truncate">{l.label}</span>
                <span className="text-mono text-red">{fmtMoney(l.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const bigTier = tier as 'medium' | 'large'

  return (
    <div className="flex flex-col h-full overflow-hidden" ref={containerRef}>
      <div className="flex flex-col gap-3 p-3 flex-shrink-0">
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            icon={<IconCoin className="fin-card-icon" />} label="Balance" value={fmtMoney(balance)} subtitle="Available cash"
            sparkline={balanceHistory}
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

        <div className="flex border-default border-t-0 border-r-0 border-l-0 border-default-bottom">
          {TABS.map(t => (
            <div key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1 text-sm text-bold cursor-pointer ${tab === t.id ? 'text-accent border-bottom-2-accent' : 'text-muted border-bottom-2-transparent'}`}>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'overview' && <OverviewTab data={data} tier={bigTier} chartW={chartW} />}
        {tab === 'cashflow' && <CashFlowTab data={data} chartW={chartW} />}
        {tab === 'breakdown' && <BreakdownTab data={data} />}
        {tab === 'wages' && <WagesTab data={data} tier={bigTier} />}
        {tab === 'standing' && <StandingTab data={data} tier={bigTier} />}
      </div>
    </div>
  )
}
