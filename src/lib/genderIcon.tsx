import maleIcon from '../assets/UI icons/male.png'
import femaleIcon from '../assets/UI icons/female.png'
import transIcon from '../assets/UI icons/trans.png'
import nonbinaryIcon from '../assets/UI icons/nonbinary.png'
import { COLOR_MALE, COLOR_FEMALE } from './colors'

/** Maps TEW Gender numeric codes to a display icon. */
export function genderIcon(g: number): string {
  if (g === 1 || g === 4) return maleIcon
  if (g === 5 || g === 8) return femaleIcon
  if (g === 2 || g === 6) return transIcon
  return nonbinaryIcon
}

/** Maps TEW Gender numeric codes to a tint color for the icon mask. */
export function genderTint(g: number): string {
  if (g === 1 || g === 4) return COLOR_MALE
  if (g === 2) return '#93b4e8'
  if (g === 5 || g === 8) return COLOR_FEMALE
  if (g === 6) return '#e88ab8'
  return '#c084fc'
}

export function GenderIcon({ gender, size = 16 }: { gender: number; size?: number }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, flexShrink: 0,
      backgroundColor: genderTint(gender),
      mask: `url(${genderIcon(gender)}) center/contain no-repeat`,
      WebkitMask: `url(${genderIcon(gender)}) center/contain no-repeat`,
    }} />
  )
}
