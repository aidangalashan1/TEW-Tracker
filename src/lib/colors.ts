/** Shared color utilities for ratings, conditions, and heat values. */

export const COLOR_FACE = '#22c55e'
export const COLOR_HEEL = '#ef4444'
export const COLOR_MALE = '#60a5fa'

export function ratingColor(pct: number): string {
  if (pct > 79) return '#60a5fa'
  if (pct > 69) return '#22c55e'
  if (pct > 59) return '#f59e0b'
  if (pct > 39) return '#f97316'
  if (pct > 19) return '#ef4444'
  return '#6b7280'
}

export function ratingClass(pct: number): string {
  if (pct <= 0) return 'text-muted'
  if (pct >= 80) return 'text-blue-400'
  if (pct >= 60) return 'text-green'
  if (pct >= 40) return 'text-yellow'
  return 'text-red'
}

export function heatColor(h: number): string {
  if (h <= 0) return 'var(--text-muted)'
  if (h >= 80) return '#60a5fa'
  if (h >= 60) return '#a855f7'
  if (h >= 40) return '#22c55e'
  return '#f59e0b'
}

export function heatClass(h: number): string {
  if (h >= 80) return 'bg-blue-400'
  if (h >= 60) return 'bg-purple-500'
  if (h >= 40) return 'bg-green'
  return 'bg-yellow'
}

export function tierColor(pct: number): string {
  return ratingColor(pct)
}

/** Maps TEW Gender numeric codes to display icons (sprite-like masks). */
export function genderIcon(g: number): string {
  const icons: Record<number, string> = { 1: 'male', 4: 'male', 5: 'female', 8: 'female', 2: 'trans', 6: 'trans' }
  return icons[g] || 'nonbinary'
}

export function genderTint(g: number): string {
  if (g === 1 || g === 4) return COLOR_MALE
  if (g === 2) return '#93b4e8'
  if (g === 5 || g === 8) return '#f472b6'
  if (g === 6) return '#e88ab8'
  return '#c084fc'
}
