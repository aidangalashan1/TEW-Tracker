/** Shared color utilities for ratings, conditions, and heat values. */

export const COLOR_FACE = '#22c55e'
export const COLOR_HEEL = '#ef4444'
export const COLOR_MALE = '#60a5fa'
export const COLOR_FEMALE = '#f472b6'

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
