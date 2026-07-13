import { useState } from 'react'
import type { ModuleRenderProps } from '../types'
import type { FinanceStanding, FinanceStandingPeer } from '../../api'
import { Bar, CardLabel, IconShield } from '../finance/shared'
import { fmtMoney } from '../../lib/money'
import { useApp } from '../../context/AppContext'

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

export function FinanceStandingModule({ data, tier }: ModuleRenderProps<FinanceStanding>) {
  // There's no federation detail page in this app — clicking a peer switches
  // the app's focused federation (same as the TopBar switcher), not a route.
  const { allFeds, setFocusedFed } = useApp()
  if (!data) return <div className="loading p-3 text-muted">Loading…</div>
  const { rank, total, peers } = data

  const findFed = (uid: number) => allFeds.find(f => f.uid === uid)
  const focusPeer = (peer: FinanceStandingPeer) => {
    const fed = findFed(peer.fed_uid)
    if (fed) setFocusedFed(fed)
  }

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full p-2 justify-center gap-1">
        <CardLabel icon={<IconShield size={11} className="fin-card-icon" />} small>Standing</CardLabel>
        <div className="text-2xl text-bold text-mono text-primary">{total ? `#${rank}` : '—'}</div>
        <div className="text-xs text-muted">{total ? `of ${total} promotions` : 'no comparison'}</div>
      </div>
    )
  }

  const max = Math.max(1, ...peers.map(p => p.income))
  const limited = tier === 'small' ? peers.slice(0, 5) : tier === 'medium' ? peers.slice(0, 10) : peers
  const logoSize = tier === 'small' ? 22 : 28

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
          const fed = tier !== 'small' ? findFed(p.fed_uid) : undefined
          return (
            <div key={p.fed_uid} className={`items-center gap-2 ${p.is_player ? 'bg-blue-alpha rounded-sm' : ''}`}>
              <div className="w-24 text-xs text-muted text-mono flex-shrink-0 text-center">#{p.rank}</div>
              <PeerLogo peer={p} size={logoSize} />
              <div className={`w-110 flex-shrink-0 truncate text-sm cursor-pointer ${p.is_player ? 'text-primary text-semibold' : 'text-secondary'}`} onClick={() => focusPeer(p)}>{p.name}</div>
              {tier !== 'small' && (
                <div className="w-100 flex-shrink-0 text-xxs text-muted truncate" data-tooltip={fed ? `Prestige: ${fed.prestige.grade} · Momentum: ${fed.momentum.grade}` : undefined}>
                  {fed ? `${fed.size_label} · ${fed.prestige.grade}` : ''}
                </div>
              )}
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
