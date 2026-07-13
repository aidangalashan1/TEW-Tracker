import { useState } from 'react'
import { Belt } from '../../api'
import { useApp } from '../../context/AppContext'
import type { ModuleRenderProps } from '../types'

function BeltChip({ belt, img, size }: { belt: Belt; img: (p: string) => string; size: 'card' | 'small' | 'medium' }) {
  const [err, setErr] = useState(false)
  const url = belt.picture && !err ? img('Belts/' + belt.picture) : ''
  const pct = belt.prestige?.pct ?? 0
  const color = pct >= 80 ? '#60a5fa' : pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'

  if (size === 'card') {
    return (
      <div className="flex-col items-center bg-secondary rounded-lg border-default overflow-hidden cursor-pointer min-w-0" style={{ flex: '1 1 60px', maxWidth: 80 }}>
        <div className="flex-center" style={{ height: 36, background: 'var(--bg-darker)' }}>
          {url ? <img src={url} alt="" className="h-3/4 object-contain" onError={() => setErr(true)} /> : <div className="w-16 h-16 bg-darker rounded-sm" />}
        </div>
        <div className="px-1 py-0 text-center w-full">
          <div className="text-xxs text-primary truncate">{belt.name}</div>
          <div className="w-full h-1 rounded-xs bg-darker mt-1 overflow-hidden">
            <div className="h-full rounded-xs" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-1 bg-secondary rounded-lg border-default">
      <div className="w-28 h-28 bg-darker rounded-sm flex-shrink-0 overflow-hidden flex-center">
        {url ? <img src={url} alt="" className="h-full object-contain" onError={() => setErr(true)} /> : <div className="w-16 h-16 bg-darker rounded-sm" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-primary truncate">{belt.name}</div>
        <div className="text-xxs text-secondary">{belt.level} · {belt.style}</div>
      </div>
      {size === 'medium' && (
        <>
          <div className="text-xxs text-secondary w-24 text-right">{belt.defences} def.</div>
          <span className={`text-xxs px-1 py-0 rounded-xs text-bold ${belt.active ? 'bg-green text-white' : 'bg-dark-muted text-secondary'}`}>{belt.active ? 'Active' : 'Inactive'}</span>
        </>
      )}
      <div className="flex items-center gap-1">
        <div className="w-20 h-2 rounded-xs bg-darker overflow-hidden">
          <div className="h-full rounded-xs" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-xxs text-bold text-mono w-20 text-right" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

function BeltCard({ belt, img }: { belt: Belt; img: (p: string) => string }) {
  const [err, setErr] = useState(false)
  const url = belt.picture && !err ? img('Belts/' + belt.picture) : ''
  const pct = belt.prestige?.pct ?? 0
  const color = pct >= 80 ? '#60a5fa' : pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex-col bg-secondary rounded-lg border-default overflow-hidden">
      <div className="flex-center" style={{ height: 160, background: 'var(--bg-darker)', padding: 12 }}>
        {url ? <img src={url} alt="" className="h-full object-contain" onError={() => setErr(true)} /> : <div className="w-40 h-40 bg-darker rounded-sm" />}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <div className="text-sm text-bold text-primary truncate">{belt.name}</div>
        <div className="flex items-center gap-2 text-xs text-secondary"><span>{belt.level}</span><span>·</span><span>{belt.style}</span></div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-secondary">Prestige</span>
            <span className="text-bold text-mono" style={{ color }}>{pct}%</span>
          </div>
          <div className="flex items-center gap-1 text-xs ml-auto">
            <span className="text-secondary">Defences</span>
            <span className="text-bold text-primary">{belt.defences}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs mt-1">
          <span className={`px-1 py-0 rounded-xs text-xs text-bold ${belt.active ? 'bg-green text-white' : 'bg-dark-muted text-secondary'}`}>{belt.active ? 'Active' : 'Inactive'}</span>
          {belt.holder1 > 0 && <span className="text-blue text-xs text-semibold cursor-pointer ml-auto">Holder #{belt.holder1}</span>}
        </div>
      </div>
    </div>
  )
}

export function BeltListModule({ data, tier }: ModuleRenderProps<{belts: Belt[]}>) {
  const { img } = useApp()
  const belts = data?.belts || []

  if (!data) return <div className="loading p-5 text-center text-muted">Loading...</div>
  if (belts.length === 0) return <div className="p-5 text-center text-muted">No belts found</div>

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full overflow-auto p-1 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase px-1">Belts</div>
        <div className="flex flex-row flex-wrap gap-1">
          {belts.map(b => <BeltChip key={b.uid} belt={b} img={img} size="card" />)}
        </div>
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase px-1">Belts ({belts.length})</div>
        {belts.map(b => <BeltChip key={b.uid} belt={b} img={img} size="small" />)}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-1">
        <div className="text-xs text-bold text-muted text-uppercase px-1">Belts ({belts.length})</div>
        {belts.map(b => <BeltChip key={b.uid} belt={b} img={img} size="medium" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {belts.map(b => <BeltCard key={b.uid} belt={b} img={img} />)}
      </div>
    </div>
  )
}
