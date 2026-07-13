import { useState } from 'react'
import type { ModuleRenderProps } from '../types'
import type { WageBill, WageEarner } from '../../api'
import { Bar, CardLabel, ProportionBar, IconTag } from '../finance/shared'
import { fmtMoney } from '../../lib/money'
import { useApp } from '../../context/AppContext'

/** Portrait for a wage earner. WageEarner isn't a full Worker record, so this
 *  mirrors WorkerImg's look (rounded, object-cover, bg-secondary fallback)
 *  rather than forcing a partial object through that component's prop type. */
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

/** Contract-expiry color coding — a real, derived "act soon" signal (not an
 *  invented one): fewer days left means the player needs to renegotiate or
 *  risk losing the worker to free agency. */
function daysLeftTone(days: number): string {
  if (days <= 30) return 'text-red'
  if (days <= 90) return 'text-yellow'
  return 'text-muted'
}

export function FinanceWagesModule({ data, tier }: ModuleRenderProps<WageBill>) {
  const { navigateToEntity } = useApp()
  if (!data) return <div className="loading p-3 text-muted">Loading…</div>
  const { total, count, top, pct_of_income, avg_wage } = data

  if (tier === 'card') {
    const highest = top[0]
    return (
      <div className="flex flex-col h-full p-2 justify-center gap-1">
        <CardLabel icon={<IconTag size={11} className="fin-card-icon" />} small>Wage Bill</CardLabel>
        <div className="text-lg text-bold text-mono text-red">{fmtMoney(total)}</div>
        {highest && (
          <div className="items-center gap-1 text-xs text-muted truncate">
            <EarnerImg earner={highest} size={16} onClick={() => navigateToEntity('worker', highest.uid)} />
            <span className="truncate">{highest.name} ({fmtMoney(highest.amount)})</span>
          </div>
        )}
      </div>
    )
  }

  const max = Math.max(1, ...top.map(e => e.amount))
  const limited = tier === 'small' ? top.slice(0, 5) : tier === 'medium' ? top.slice(0, 10) : top
  const imgSize = tier === 'small' ? 22 : 28

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-2">
      <div className="justify-between items-center">
        <CardLabel icon={<IconTag className="fin-card-icon" />}>Top Earners</CardLabel>
        <div className="text-xs text-muted text-mono">{count} on contract · {fmtMoney(total)} · avg {fmtMoney(avg_wage)}</div>
      </div>
      {tier !== 'small' && (
        <div className="items-center gap-2">
          <ProportionBar pct={pct_of_income} variant={pct_of_income > 100 ? 'over' : 'wage'} tip={`Wage bill: ${pct_of_income}% of income`} />
          <span className="text-xs text-mono text-secondary flex-shrink-0">{pct_of_income}% of income</span>
        </div>
      )}
      {limited.length === 0 ? (
        <div className="text-sm text-muted">No active contracts</div>
      ) : (
        limited.map(e => (
          <div key={e.uid} className="items-center gap-2">
            <EarnerImg earner={e} size={imgSize} onClick={() => navigateToEntity('worker', e.uid)} />
            <div className="w-110 flex-shrink-0 min-w-0 cursor-pointer" onClick={() => navigateToEntity('worker', e.uid)}>
              <div className="truncate text-sm text-secondary">{e.name}</div>
              {tier !== 'small' && e.position && <div className="text-xxs text-muted truncate">{e.position}</div>}
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
