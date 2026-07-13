import type { SizeTier } from './types'

export function getSizeTier(w: number, h: number): SizeTier {
  const area = w * h
  if (area <= 4) return 'card'
  if (area <= 16) return 'small'
  if (area <= 64) return 'medium'
  return 'large'
}
