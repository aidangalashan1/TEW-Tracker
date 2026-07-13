import { useApp } from '../context/AppContext'
import type { RatingData } from '../api'

export function RatingBadge({ rating }: { rating: RatingData }) {
  const { ratingFormat } = useApp()
  const display = ratingFormat === 'pct' ? rating.pct : rating.grade
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>{display}</span>
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
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>{display}</span>
}
