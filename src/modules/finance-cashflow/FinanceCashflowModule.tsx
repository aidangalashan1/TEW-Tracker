import { useRef, useState, useEffect } from 'react'
import type { ModuleRenderProps } from '../types'
import type { FinanceHistory, FinancePeriod } from '../../api'
import { Legend, EmptyChart, CardLabel, StatTile, IconWallet, IconTrend } from '../finance/shared'
import { fmtMoney, fmtMoneyAccounting } from '../../lib/money'

function PeriodBars({ history, chartW }: { history: FinancePeriod[]; chartW: number }) {
  const H = 200, padL = 8, padR = 8, padT = 14, padB = 8
  const W = Math.max(300, chartW)
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = history.length
  const maxY = Math.max(1, ...history.flatMap(h => [h.income, h.expense]))
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

function project(history: FinancePeriod[]): { net: number; balance: number } | null {
  if (history.length < 2) return null
  const recent = history.slice(-3)
  const net = Math.round(recent.reduce((s, h) => s + h.net, 0) / recent.length)
  return { net, balance: history[history.length - 1].balance + net }
}

/** Simple aggregates over the fetched history — every figure is a plain
 *  average/min/max of real periods, nothing modeled or invented. */
function historyStats(history: FinancePeriod[]) {
  if (history.length === 0) return null
  const avgIncome = Math.round(history.reduce((s, h) => s + h.income, 0) / history.length)
  const avgExpense = Math.round(history.reduce((s, h) => s + h.expense, 0) / history.length)
  const best = history.reduce((a, b) => (b.net > a.net ? b : a))
  const worst = history.reduce((a, b) => (b.net < a.net ? b : a))
  return { avgIncome, avgExpense, best, worst }
}

export function FinanceCashflowModule({ data, tier }: ModuleRenderProps<FinanceHistory>) {
  const history = data?.history || []
  const projection = project(history)
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartW, setChartW] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setChartW(el.clientWidth)
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setChartW(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (tier === 'card') {
    const latest = history[history.length - 1]
    return (
      <div className="flex flex-col h-full p-2 justify-center gap-1">
        <CardLabel icon={<IconWallet size={11} className="fin-card-icon" />} small>Cash Flow</CardLabel>
        {latest ? (
          <>
            <div className={`text-lg text-bold text-mono ${latest.net >= 0 ? 'text-green' : 'text-red'}`}>
              {latest.net >= 0 ? '+' : ''}{fmtMoney(latest.net)}
            </div>
            <div className="text-xs text-muted">last period</div>
          </>
        ) : <div className="text-xs text-muted">No history yet</div>}
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full p-2 gap-1">
        <CardLabel icon={<IconWallet size={11} className="fin-card-icon" />} small>Cash Balance</CardLabel>
        {history.length >= 2
          ? <BalanceTrend history={history} projected={projection ? projection.balance : null} chartW={chartW} />
          : <div className="text-xs text-muted p-2">No history yet</div>}
      </div>
    )
  }

  const stats = historyStats(history)

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-3" ref={containerRef}>
        {stats && (
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Avg Income" value={fmtMoney(stats.avgIncome)} tone="income" />
            <StatTile label="Avg Spending" value={fmtMoney(stats.avgExpense)} tone="expense" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <CardLabel icon={<IconTrend up className="fin-card-icon" />}>Income vs Spending</CardLabel>
          {history.length >= 1
            ? <PeriodBars history={history} chartW={chartW} />
            : <div className="text-xs text-muted">No data yet</div>}
        </div>
        <div className="flex flex-col gap-1">
          <CardLabel icon={<IconWallet className="fin-card-icon" />}>Cash Balance</CardLabel>
          {history.length >= 2
            ? <BalanceTrend history={history} projected={projection ? projection.balance : null} chartW={chartW} />
            : <div className="text-xs text-muted">Not enough history</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-4" ref={containerRef}>
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
