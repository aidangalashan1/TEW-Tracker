import { useState } from 'react'
import { createPortal } from 'react-dom'

const RADIUS_FACTOR = 0.4
const LABEL_OFFSET = 1.3

function dotColor(v: number): string {
  return v > 79 ? '#60a5fa' : v > 69 ? '#22c55e' : v > 59 ? '#f59e0b' : v > 39 ? '#f97316' : v > 19 ? '#ef4444' : '#6b7280'
}

interface RadarChartProps {
  values: number[]
  labels: string[]
  tooltipLabels?: string[]
  size?: number
}

export function RadarChart({ values, labels, tooltipLabels, size = 150 }: RadarChartProps) {
  const [tip, setTip] = useState<{ node: React.ReactNode; x: number; y: number } | null>(null)
  const n = values.length
  const cx = size / 2
  const cy = size / 2
  const r = size * RADIUS_FACTOR

  const angleOffset = -Math.PI / 2
  const step = (2 * Math.PI) / n

  const getPoint = (radius: number, i: number) => {
    const angle = angleOffset + i * step
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  }

  const dataPolygon = values.map((v, i) => getPoint(r * Math.min(v, 100) / 100, i))
  const dataPath = dataPolygon.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'

  return (
    <>
      <svg width={size} height={size} style={{ flexShrink: 0, alignSelf: 'center', display: 'block', overflow: 'visible' }}>
          {(() => {
          const pts = Array.from({ length: n }, (_, i) => getPoint(r, i))
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
          return <path d={path} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        })()}
        {Array.from({ length: n }, (_, i) => {
          const p = getPoint(r, i)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        })}
        <path d={dataPath} fill="rgba(56, 189, 248, 0.12)" stroke="#38bdf8" strokeWidth={1.5} />
        {dataPolygon.map((p, i) => {
          const v = values[i]
          const c = dotColor(v)
          return (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={c} stroke={c} strokeWidth={1}
              onMouseOver={(e) => setTip({ node: <div style={{ fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>{(tooltipLabels || labels)[i]}: <span style={{ background: c, color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 10, lineHeight: '16px', display: 'inline-block' }}>{v}</span></div>, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setTip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
              onMouseOut={() => setTip(null)} />
          )
        })}
        {Array.from({ length: n }, (_, i) => {
          const angle = angleOffset + i * step
          const cos = Math.cos(angle)
          const sin = Math.sin(angle)
          const p = getPoint(r * LABEL_OFFSET, i)
          let anchor: 'middle' | 'start' | 'end' = 'middle'
          let dx = 0
          if (cos > 0.1) { anchor = 'start'; dx = 4 }
          else if (cos < -0.1) { anchor = 'end'; dx = -4 }
          let baseline: 'middle' | 'auto' | 'hanging' = 'middle'
          if (sin < -0.1) baseline = 'auto'
          else if (sin > 0.1) baseline = 'hanging'
          return (
            <text key={i} x={p.x + dx} y={p.y} textAnchor={anchor} dominantBaseline={baseline}
              fill="var(--text-secondary, #a0aab5)" fontSize={10} fontWeight={600}>
              {labels[i]}
            </text>
          )
        })}
      </svg>
      {tip && createPortal(
        <div style={{
          position: 'fixed', left: tip.x + 10, top: tip.y - 10, zIndex: 10000,
          background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
          fontSize: 11, padding: '5px 10px', borderRadius: 4,
          maxWidth: 200, whiteSpace: 'nowrap', lineHeight: 1.5,
          border: '1px solid var(--border-color)', pointerEvents: 'none',
        }}>{tip.node}</div>,
        document.body
      )}
    </>
  )
}
