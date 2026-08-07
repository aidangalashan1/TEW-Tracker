import { ratingColor } from '../../../lib/colors'
import { formatRatingPct } from '../../../lib/grade'
import { useApp } from '../../../context/AppContext'

export function RatingBadge({ val, style }: { val: number; style?: React.CSSProperties }) {
  const { ratingFormat } = useApp()
  return (
    <span style={{
      background: ratingColor(val), color: '#fff', borderRadius: 3, padding: '0 6px',
      fontFamily: 'var(--font-family)', fontSize: 12, fontWeight: 700, lineHeight: '18px',
      ...style,
    }}>{formatRatingPct(val, ratingFormat)}</span>
  )
}
