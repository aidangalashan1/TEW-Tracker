import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../../context/AppContext'
import { Worker } from '../../../api'
import { NavChip } from '../../../components/NavChip'
import conditionIcon from '../../../assets/UI icons/condition.png'
import faceIcon from '../../../assets/UI icons/face.png'
import heelIcon from '../../../assets/UI icons/heel.png'
import { ratingColor } from '../../../lib/colors'
import { pctToGrade } from '../../../lib/grade'
import { fmtDate } from '../../../lib/dates'
import { NATIONALITY_FLAGS, NATIONALITY_NAMES, NATIONALITY_CODES_3 } from '../nationality'
import type { ColumnState } from './types'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  injured: { label: 'Inj', color: '#ef4444' },
  unhappy: { label: 'Unh', color: '#e94560' },
  absent: { label: 'Abs', color: '#f59e0b' },
  promise: { label: 'Prm', color: '#22c55e' },
  champion: { label: 'Cha', color: '#eab308' },
}

const STATUS_PRIORITY = ['injured', 'absent', 'unhappy', 'promise', 'champion']

export function StatusBadge({ status, workerUid }: { status: string[]; workerUid: number }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
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
    <span ref={ref} className="status-tooltip relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <NavChip type="worker" id={workerUid} label={def.label}
        style={{
          display: 'inline-block', padding: '1px 4px', borderRadius: 4,
          background: def.color, color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1.3,
          textDecoration: 'none',
        }}
      />
      {showTooltip && tooltip && ref.current && createPortal(
        <div className="tooltip-flyout" style={{
          left: ref.current.getBoundingClientRect().left + ref.current.offsetWidth / 2,
          top: ref.current.getBoundingClientRect().top - 8,
          transform: 'translateX(-50%) translateY(-100%)',
          zIndex: 99999,
        }}>{tooltip}</div>,
        document.body
      )}
    </span>
  )
}

export function MoneyDisplay({ amount }: { amount: number }) {
  if (amount === 0) return <span className="text-muted">-</span>
  return <span>${(amount / 1000).toFixed(1)}k</span>
}

function PortalTip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} className="status-tooltip relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && ref.current && createPortal(
        <div className="tooltip-flyout" style={{
          left: ref.current.getBoundingClientRect().left + ref.current.offsetWidth / 2,
          top: ref.current.getBoundingClientRect().top - 8,
          transform: 'translateX(-50%) translateY(-100%)',
          zIndex: 99999,
        }}>{content}</div>,
        document.body
      )}
    </span>
  )
}

// Real components taking props (`<ConditionHeart w={w} />`), NOT plain
// functions called directly as `def.render(w)` — column render defs invoke
// `def.render(item.worker)` once per visible row inside a `.map()`, and how
// many rows actually render varies (virtualized scrolling, filtering, sort).
// A hook call inside a plain function invoked that way becomes part of the
// *enclosing* table component's own hook list, whose call count must be
// identical on every render — it isn't here, since it scales with rendered
// row count, which is exactly what threw "Invalid hook call" (React #321)
// in production. Rendering these as genuine JSX elements instead gives each
// row's instance its own independently-managed Fiber/hook state, which is
// what makes useApp() safe to call inside them.
export function ConditionHeart({ w }: { w: Worker }) {
  const { ratingFormat } = useApp()
  const p = w.physical as any
  const vals = [p?.condition1, p?.condition2, p?.condition3, p?.condition4].map(v => Number(v ?? 100))
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const pct = Math.round(avg)
  const color = ratingColor(pct)
  return <div className="flex-center w-full h-full">
    <PortalTip content={ratingFormat === 'pct' ? `${pct}%` : pctToGrade(pct)}>
      <span className="cond-bar" style={{
        mask: `url(${conditionIcon}) center/contain no-repeat`,
        WebkitMask: `url(${conditionIcon}) center/contain no-repeat`,
        background: `linear-gradient(to top, ${color} 0%, ${color} ${pct}%, #444 ${pct}%, #444 100%)`,
      }} />
    </PortalTip>
  </div>
}

export function CondPctBar({ w, idx }: { w: Worker; idx: number }) {
  const { ratingFormat } = useApp()
  const p = w.physical as any
  const key = `condition${idx}`
  const raw = Number(p?.[key] ?? 100)
  const pct = Math.round(raw)
  const color = ratingColor(pct)
  return <div className="flex-center w-full h-full">
    <PortalTip content={ratingFormat === 'pct' ? `${pct}%` : pctToGrade(pct)}>
      <span className="cond-bar" style={{
        mask: `url(${conditionIcon}) center/contain no-repeat`,
        WebkitMask: `url(${conditionIcon}) center/contain no-repeat`,
        background: `linear-gradient(to top, ${color} 0%, ${color} ${pct}%, #444 ${pct}%, #444 100%)`,
      }} />
    </PortalTip>
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
  const { ratingFormat } = useApp()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  if (items.length === 0) return null
  const ordered = [...items].reverse()
  const w = 160; const h = 70; const maxRating = 1000
  const pct = (r: number) => Math.round(r / 10)
  const fmtR = (r: number) => ratingFormat === 'pct' ? `${pct(r)}%` : pctToGrade(pct(r))
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
              <span className="text-mono text-bold" style={{ color: color(it.rating) }}>{fmtR(it.rating)}</span>
              {it.card && <span className="text-secondary">{it.card}</span>}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export function Last5Cell({ items, workerUid }: { items: { rating: number; label: string; card: string; log_entry: string }[]; workerUid: number }) {
  const { navigateToEntity, ratingFormat } = useApp()
  const [showTooltip, setShowTooltip] = useState(false)
  const [hoverPt, setHoverPt] = useState<number | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>()
  const ref = useRef<HTMLSpanElement>(null)
  if (items.length === 0) return null
  const pct = (r: number) => Math.round(r / 10)
  const fmtR = (p: number) => ratingFormat === 'pct' ? String(p) : pctToGrade(p)
  const avg = Math.round(items.reduce((s, it) => s + pct(it.rating), 0) / items.length)
  const ordered = [...items].reverse()
  const allRatings = ordered.map(s => s.rating)
  const minR = Math.min(...allRatings, 0)
  const maxR = Math.max(...allRatings, 1)
  const range = (maxR - minR) || 100
  const sw = 60, sh = 22, pad = 2
  const plotH = sh - pad * 2
  const pts = ordered.map((s, i) => ({
    x: pad + i * ((sw - pad * 2) / Math.max(ordered.length - 1, 1)),
    y: pad + plotH - ((s.rating - minR) / range) * plotH,
    r: s.rating,
    label: s.log_entry || s.label || '',
  }))
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowTooltip(false), 80)
  }
  const keepVisible = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }
  return (
    <span ref={ref}
      className="cursor-pointer relative"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
      onClick={e => { e.stopPropagation(); navigateToEntity('worker', workerUid) }}
      onMouseEnter={() => { keepVisible(); setShowTooltip(true) }}
      onMouseLeave={scheduleHide}
    >
      <svg width={sw} height={sh} style={{ display: 'block', flexShrink: 0 }}
        onMouseEnter={() => { keepVisible(); setShowTooltip(true) }}
        onMouseLeave={scheduleHide}>
        {pts.length > 1 && <path d={lineD} fill="none" stroke="#60a5fa" strokeWidth={1.2} />}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2} fill={ratingColor(pct(p.r))} stroke="#1a1a2e" strokeWidth={0.5}
            onMouseEnter={(e) => { e.stopPropagation(); keepVisible(); setHoverPt(i); setShowTooltip(true) }}
            onMouseLeave={() => { setHoverPt(null); scheduleHide() }} />
        ))}
      </svg>
      <span style={{ fontSize: 11, fontFamily: 'var(--font-family)', color: 'var(--text-secondary)' }}>{fmtR(avg)}</span>
      {showTooltip && ref.current && createPortal(
        <div className="tooltip-flyout" style={{
          left: ref.current.getBoundingClientRect().left,
          top: ref.current.getBoundingClientRect().bottom + 4,
        }}
          onMouseEnter={keepVisible}
          onMouseLeave={scheduleHide}
        >
          {hoverPt != null && pts[hoverPt] ? (
            <div style={{ fontSize: 11, padding: '2px 6px' }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>{pts[hoverPt].label}</div>
              <div style={{ color: ratingColor(pct(pts[hoverPt].r)), fontWeight: 700 }}>{fmtR(pct(pts[hoverPt].r))}</div>
            </div>
          ) : (
            <MiniGraphTooltip items={items} />
          )}
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
  const { navigateToEntity, ratingFormat } = useApp()
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
  const fmtR = (p: number) => ratingFormat === 'pct' ? `${p}%` : pctToGrade(p)
  const bestPct = bestInfo ? pct(bestInfo.rating) : null
  const worstPct = worstInfo ? pct(worstInfo.rating) : null
  return (
    <span ref={ref}
      className="cursor-pointer relative"
      onClick={e => { e.stopPropagation(); navigateToEntity('worker', workerUid) }}
      onMouseEnter={() => { keepVisible(); setShowTooltip(true) }}
      onMouseLeave={scheduleHide}
    >
      {fmtR(avg)}
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
              <span className="text-mono" style={{ color: ratingColor(best), borderBottom: bestInfo?.log_entry ? '1px dashed #555' : 'none', cursor: bestInfo?.log_entry ? 'help' : 'default' }}>{fmtR(pct(best))}</span>
              {hoverBest && bestInfo?.log_entry && (
                <div className="detail-flyout">
                  <div className="text-semibold">{bestInfo.log_entry || bestInfo.label}</div>
                  <div className="flex mt-1 gap-2">
                    <span className="text-mono text-bold" style={{ color: ratingColor(bestPct ?? 0) }}>{bestPct != null ? fmtR(bestPct) : ''}</span>
                    {bestInfo.card && <span className="text-secondary">{bestInfo.card}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="avg-tooltip-row" onMouseEnter={() => setHoverWorst(true)} onMouseLeave={() => setHoverWorst(false)}>
              <span className="text-secondary">Worst</span>
              <span className="text-mono" style={{ color: ratingColor(worst), borderBottom: worstInfo?.log_entry ? '1px dashed #555' : 'none', cursor: worstInfo?.log_entry ? 'help' : 'default' }}>{fmtR(pct(worst))}</span>
              {hoverWorst && worstInfo?.log_entry && (
                <div className="detail-flyout">
                  <div className="text-semibold">{worstInfo.log_entry || worstInfo.label}</div>
                  <div className="flex mt-1 gap-2">
                    <span className="text-mono text-bold" style={{ color: ratingColor(worstPct ?? 0) }}>{worstPct != null ? fmtR(worstPct) : ''}</span>
                    {worstInfo.card && <span className="text-secondary">{worstInfo.card}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="avg-tooltip-divider">
              <span className="text-secondary">Avg</span>
              <span className="text-mono text-primary text-bold">{fmtR(avg)}</span>
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

/** Dispatches per-row cell content by column id for the handful of columns
 *  whose display depends on more than just `def.render(w)` (image needs a
 *  click handler, age/expiry need date formatting plus width-gated detail,
 *  dispo needs a face/heel icon, nat needs width-gated flag/code/name).
 *  Falls back to the plain `cellContent` for every other column, matching
 *  how the rest of the table already renders via `def.render`. */
export function renderCell(opts: {
  cs: ColumnState
  w: Worker
  pw: number
  cellContent: React.ReactNode
  currentDate?: string | null
  onNavigate: (uid: number) => void
}): React.ReactNode {
  const { cs, w, pw, cellContent, currentDate, onNavigate } = opts

  if (cs.id === 'img') {
    return <span className="items-center cursor-pointer" style={{ height: '100%' }} onClick={e => { e.stopPropagation(); onNavigate(w.uid) }}>{cellContent}</span>
  }

  if (cs.id === 'age') {
    return <span style={{ lineHeight: 1.3 }}>
      <span style={{ background: 'var(--bg-tertiary)', color: '#fff', borderRadius: 3, padding: '0 6px', fontFamily: 'var(--font-family)', fontSize: 11, fontWeight: 700, lineHeight: '18px', display: 'inline-block' }}>{w.age}</span>
      {pw >= 90 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{(w as any).Birthday ? fmtDate((w as any).Birthday) : ''}</div>}
    </span>
  }

  if (cs.id === 'expiry') {
    const expDate = w.contract && currentDate
      ? (() => {
          const d = new Date(currentDate)
          d.setDate(d.getDate() + w.contract!.days_left)
          return fmtDate(d.toISOString().split('T')[0])
        })()
      : null
    return <span className="text-md" style={{ lineHeight: 1.3 }}>
      <div>{expDate || `${w.contract?.days_left ?? 0}d`}</div>
      {pw >= 90 && expDate && <div>{w.contract ? `${w.contract.days_left}d remaining` : ''}</div>}
    </span>
  }

  if (cs.id === 'dispo' && w.contract) {
    const color = w.contract.face ? 'var(--accent-green)' : '#ef4444'
    const icon = w.contract.face ? faceIcon : heelIcon
    return <div className="items-center h-full gap-3px">
      <span className="inline-block w-14 h-14 flex-shrink-0" style={{
        backgroundColor: color,
        mask: `url(${icon}) center/contain no-repeat`,
        WebkitMask: `url(${icon}) center/contain no-repeat`,
      }} />
      {pw >= 65 && <span style={{ color }}>{w.contract.face ? 'Face' : 'Heel'}</span>}
    </div>
  }

  if (cs.id === 'nat') {
    const code = NATIONALITY_FLAGS[w.nationality]
    const code3 = NATIONALITY_CODES_3[w.nationality]
    const name = NATIONALITY_NAMES[w.nationality]
    if (!code) return <span>—</span>
    const flagUrl = new URL(`../../../assets/flag-icons-main/flags/4x3/${code}.svg`, import.meta.url).href
    return <div className="items-center h-full cursor-pointer gap-1" onClick={e => { e.stopPropagation(); onNavigate(w.uid) }}>
      <img src={flagUrl} alt="" className="w-20 h-15 object-cover rounded-xs" />
      {pw >= 60 && pw < 100 && <span className="ws-nowrap">{code3 || code.toUpperCase()}</span>}
      {pw >= 100 && <span className="ws-nowrap">{name}</span>}
    </div>
  }

  return cellContent
}
