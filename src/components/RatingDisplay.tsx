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
