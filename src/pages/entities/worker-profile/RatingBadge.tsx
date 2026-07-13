import { ratingColor } from '../../../lib/colors'

export function RatingBadge({ val, style }: { val: number; style?: React.CSSProperties }) {
  return (
    <span style={{
      background: ratingColor(val), color: '#fff', borderRadius: 3, padding: '0 6px',
      fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, lineHeight: '18px',
      ...style,
    }}>{val}</span>
  )
}
