import { useApp } from '../context/AppContext'
import type { RatingData } from '../api'

function mutedColor(pct: number): string {
  if (pct > 79) return '#3b82c4'
  if (pct > 69) return '#1e9b4a'
  if (pct > 59) return '#c47d10'
  if (pct > 39) return '#c05a14'
  if (pct > 19) return '#c03535'
  return '#4b5563'
}

export function RatingBadge({ rating }: { rating: RatingData }) {
  const { ratingFormat } = useApp()
  const display = ratingFormat === 'pct' ? rating.pct : rating.grade
  return <span style={{
    background: mutedColor(rating.pct), color: '#fff', borderRadius: 3, padding: '0 6px',
    fontFamily: 'var(--font-family)', fontSize: 11, fontWeight: 700, lineHeight: '18px', display: 'inline-block',
  }}>{display}</span>
}

export function RatingValue({ value }: { value: number }) {
  const { ratingFormat } = useApp()
  const raw = value
  const pct = Math.round(raw / 10)
  const grade = (() => {
    if (raw >= 950) return 'A*'; if (raw >= 900) return 'A'
    if (raw >= 850) return 'A-'; if (raw >= 800) return 'B+'
    if (raw >= 750) return 'B'; if (raw >= 700) return 'B-'
    if (raw >= 650) return 'C+'; if (raw >= 600) return 'C'
    if (raw >= 550) return 'C-'; if (raw >= 500) return 'D+'
    if (raw >= 450) return 'D'; if (raw >= 400) return 'D-'
    if (raw >= 350) return 'E+'; if (raw >= 300) return 'E'
    if (raw >= 200) return 'E-'; if (raw >= 100) return 'F+'
    return 'F'
  })()
  const display = ratingFormat === 'pct' ? pct : grade
  return <span>{display}</span>
}
