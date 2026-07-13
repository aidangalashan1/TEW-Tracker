const RADIUS_FACTOR = 0.4
const LABEL_OFFSET = 1.3

interface RadarChartProps {
  values: number[]
  labels: string[]
  size?: number
}

export function RadarChart({ values, labels, size = 150 }: RadarChartProps) {
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

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]
  const dataPolygon = values.map((v, i) => getPoint(r * Math.min(v, 100) / 100, i))
  const dataPath = dataPolygon.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'

  return (
    <svg width={size} height={size} style={{ flexShrink: 0, alignSelf: 'center', display: 'block', overflow: 'visible' }}>
      {gridLevels.map((level) => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(r * level, i))
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z'
        return <path key={level} d={path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      })}
      {Array.from({ length: n }, (_, i) => {
        const p = getPoint(r, i)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      })}
      <path d={dataPath} fill="rgba(0, 180, 255, 0.15)" stroke="rgba(0, 180, 255, 0.8)" strokeWidth={2} />
      {dataPolygon.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="rgba(0, 180, 255, 0.9)" />
      ))}
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
  )
}
