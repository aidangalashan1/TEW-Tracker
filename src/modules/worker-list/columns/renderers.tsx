import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../../context/AppContext'
import { Worker } from '../../../api'
import { NavChip } from '../../../components/NavChip'
import conditionIcon from '../../../assets/UI icons/condition.png'
import { ratingColor } from '../../../lib/colors'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  injured: { label: 'Inj', color: '#ef4444' },
  unhappy: { label: 'Unh', color: '#e94560' },
  absent: { label: 'Abs', color: '#f59e0b' },
  promise: { label: 'Prm', color: '#22c55e' },
  champion: { label: 'Cha', color: '#eab308' },
}

const STATUS_PRIORITY = ['injured', 'absent', 'unhappy', 'promise', 'champion']

export function StatusBadge({ status, workerUid }: { status: string[]; workerUid: number }) {
  if (!status || status.length === 0) return null
  const sorted = [...status].sort((a, b) => {
    const aKey = a.split(':')[0]
    const bKey = b.split(':')[0]
    return STATUS_PRIORITY.indexOf(aKey) - STATUS_PRIORITY.indexOf(bKey)
  })
  const top = sorted[0]
  const [key, ...rest] = top.split(':')
  const reason = rest.join(':').trim()
  const def = STATUS_MAP[key]
  if (!def) return null
  const tooltip = (key === 'unhappy' && reason) ? reason : undefined
  return (
    <span data-tooltip={tooltip} className="status-tooltip relative">
      <NavChip type="worker" id={workerUid} label={def.label}
        style={{
          display: 'inline-block', padding: '1px 4px', borderRadius: 4,
          background: def.color, color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1.3,
          textDecoration: 'none',
        }}
      />
    </span>
  )
}

export function MoneyDisplay({ amount }: { amount: number }) {
  if (amount === 0) return <span className="text-muted">-</span>
  return <span>${(amount / 1000).toFixed(1)}k</span>
}

export function conditionHeart(w: Worker) {
  const p = w.physical as any
  const vals = [p?.condition1, p?.condition2, p?.condition3, p?.condition4].map(v => Number(v ?? 1000))
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const pct = Math.round(avg / 10)
  const color = ratingColor(pct)
  return <div className="flex-center w-full h-full">
    <span data-tooltip={`${pct}%`} className="status-tooltip relative inline-flex">
      <span className="cond-bar" style={{
        mask: `url(${conditionIcon}) center/contain no-repeat`,
        WebkitMask: `url(${conditionIcon}) center/contain no-repeat`,
        background: `linear-gradient(to top, ${color} 0%, ${color} ${pct}%, #444 ${pct}%, #444 100%)`,
      }} />
    </span>
  </div>
}

export function condPctBar(w: Worker, idx: number) {
  const p = w.physical as any
  const key = `condition${idx}`
  const raw = Number(p?.[key] ?? 1000)
  const pct = Math.round(raw / 10)
  const color = ratingColor(pct)
  return <div className="flex-center w-full h-full">
    <span data-tooltip={`${pct}%`} className="status-tooltip relative inline-flex">
      <span className="cond-bar" style={{
        mask: `url(${conditionIcon}) center/contain no-repeat`,
        WebkitMask: `url(${conditionIcon}) center/contain no-repeat`,
        background: `linear-gradient(to top, ${color} 0%, ${color} ${pct}%, #444 ${pct}%, #444 100%)`,
      }} />
    </span>
  </div>
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function fmtDurationHm(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

export function MiniGraphTooltip({ items }: { items: { rating: number; label: string; card: string; log_entry: string }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  if (items.length === 0) return null
  const ordered = [...items].reverse()
  const w = 160; const h = 70; const maxRating = 1000
  const pct = (r: number) => Math.round(r / 10)
  const color = (r: number) => ratingColor(pct(r))
  const points = ordered.map((it, i) => {
    const x = i * (w / Math.max(items.length - 1, 1))
    const y = h - (it.rating / maxRating) * h
    return { x, y, ...it }
  })
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')
  const gridlines = [0, 200, 400, 600, 800, 1000]
  return (
    <div className="relative">
      <svg width={w} height={h} className="block">
        {gridlines.map(val => {
          const y = h - (val / maxRating) * h
          return <line key={val} x1={0} y1={y} x2={w} y2={y} stroke="#333" strokeWidth={val === 0 ? 1 : 0.5} />
        })}
        <path d={line} fill="none" stroke="#60a5fa" strokeWidth={1.5} />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill={color(p.rating)}
              stroke="#1a1a2e" strokeWidth={1}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer" />
          </g>
        ))}
      </svg>
      {hoveredIdx !== null && (() => {
        const it = ordered[hoveredIdx]
        const x = points[hoveredIdx].x
        return (
          <div className="graph-tooltip-flyout" style={{ left: Math.min(x, w - 150), top: -34 }}>
            <div className="text-semibold">{it.log_entry || it.label}</div>
            <div className="flex mt-1 gap-2">
              <span className="text-mono text-bold" style={{ color: color(it.rating) }}>{pct(it.rating)}%</span>
              {it.card && <span className="text-secondary">{it.card}</span>}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export function Last5Cell({ items, workerUid }: { items: { rating: number; label: string; card: string; log_entry: string }[]; workerUid: number }) {
  const { navigateToEntity } = useApp()
  const [showTooltip, setShowTooltip] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const ref = useRef<HTMLSpanElement>(null)
  if (items.length === 0) return null
  const pct = (r: number) => Math.round(r / 10)
  const avg = Math.round(items.reduce((s, it) => s + pct(it.rating), 0) / items.length)
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowTooltip(false), 80)
  }
  const keepVisible = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }
  return (
    <span ref={ref}
      className="cursor-pointer text-mono text-sm text-primary relative"
      onClick={e => { e.stopPropagation(); navigateToEntity('worker', workerUid) }}
      onMouseEnter={() => { keepVisible(); setShowTooltip(true) }}
      onMouseLeave={scheduleHide}
    >
      {avg}
      {showTooltip && ref.current && createPortal(
        <div className="tooltip-flyout" style={{
          left: ref.current.getBoundingClientRect().left,
          top: ref.current.getBoundingClientRect().bottom + 4,
        }}
          onMouseEnter={keepVisible}
          onMouseLeave={scheduleHide}
        >
          <MiniGraphTooltip items={items} />
        </div>,
        document.body
      )}
    </span>
  )
}

export function AvgCell({ workerUid, avg, best, worst, count, bestInfo, worstInfo, avgDuration, totalDuration }:
  { workerUid: number; avg: number; best: number; worst: number; count: number;
    bestInfo?: { rating: number; log_entry: string; label: string; card: string };
    worstInfo?: { rating: number; log_entry: string; label: string; card: string };
    avgDuration?: number; totalDuration?: number }) {
  const { navigateToEntity } = useApp()
  const [showTooltip, setShowTooltip] = useState(false)
  const [hoverBest, setHoverBest] = useState(false)
  const [hoverWorst, setHoverWorst] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const ref = useRef<HTMLSpanElement>(null)
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowTooltip(false), 80)
  }
  const keepVisible = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }
  const pct = (r: number) => Math.round(r / 10)
  const bestPct = bestInfo ? pct(bestInfo.rating) : null
  const worstPct = worstInfo ? pct(worstInfo.rating) : null
  return (
    <span ref={ref}
      className="cursor-pointer text-mono text-sm text-primary relative"
      onClick={e => { e.stopPropagation(); navigateToEntity('worker', workerUid) }}
      onMouseEnter={() => { keepVisible(); setShowTooltip(true) }}
      onMouseLeave={scheduleHide}
    >
      {avg}
      {showTooltip && ref.current && createPortal(
        <div className="tooltip-flyout" style={{
          left: ref.current.getBoundingClientRect().left,
          top: ref.current.getBoundingClientRect().bottom + 4,
        }}
          onMouseEnter={keepVisible}
          onMouseLeave={scheduleHide}
        >
          <div className="flex flex-col min-w-0 gap-3px" style={{ minWidth: 140 }}>
            <div className="avg-tooltip-row" onMouseEnter={() => setHoverBest(true)} onMouseLeave={() => setHoverBest(false)}>
              <span className="text-secondary">Best</span>
              <span className="text-mono" style={{ color: ratingColor(best), borderBottom: bestInfo?.log_entry ? '1px dashed #555' : 'none', cursor: bestInfo?.log_entry ? 'help' : 'default' }}>{pct(best)}%</span>
              {hoverBest && bestInfo?.log_entry && (
                <div className="detail-flyout">
                  <div className="text-semibold">{bestInfo.log_entry || bestInfo.label}</div>
                  <div className="flex mt-1 gap-2">
                    <span className="text-mono text-bold" style={{ color: ratingColor(bestPct ?? 0) }}>{bestPct}%</span>
                    {bestInfo.card && <span className="text-secondary">{bestInfo.card}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="avg-tooltip-row" onMouseEnter={() => setHoverWorst(true)} onMouseLeave={() => setHoverWorst(false)}>
              <span className="text-secondary">Worst</span>
              <span className="text-mono" style={{ color: ratingColor(worst), borderBottom: worstInfo?.log_entry ? '1px dashed #555' : 'none', cursor: worstInfo?.log_entry ? 'help' : 'default' }}>{pct(worst)}%</span>
              {hoverWorst && worstInfo?.log_entry && (
                <div className="detail-flyout">
                  <div className="text-semibold">{worstInfo.log_entry || worstInfo.label}</div>
                  <div className="flex mt-1 gap-2">
                    <span className="text-mono text-bold" style={{ color: ratingColor(worstPct ?? 0) }}>{worstPct}%</span>
                    {worstInfo.card && <span className="text-secondary">{worstInfo.card}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="avg-tooltip-divider">
              <span className="text-secondary">Avg</span>
              <span className="text-mono text-primary text-bold">{avg}%</span>
            </div>
            <div className="avg-tooltip-row">
              <span className="text-secondary">Total</span>
              <span className="text-mono text-primary">{count}</span>
            </div>
            {avgDuration != null && avgDuration > 0 && (
              <div className="avg-tooltip-divider">
                <span className="text-secondary">Avg Time</span>
                <span className="text-mono text-primary">{fmtDuration(avgDuration)}</span>
              </div>
            )}
            {totalDuration != null && totalDuration > 0 && (
              <div className="avg-tooltip-row">
                <span className="text-secondary">Total Time</span>
                <span className="text-mono text-primary">{fmtDurationHm(totalDuration)}</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}
