import type { RatingFormat } from '../context/AppContext'

/** Mirrors python/models/base.py's scale_to_grade() exactly, just rescaled
 *  from TEW's 0-1000 raw scale to the 0-100 `pct` scale everything in the
 *  frontend already works with (threshold/10, so 950 -> 95, 900 -> 90, ...).
 *  Single source of truth for "0-100 number -> letter grade" on the
 *  frontend — every rating display should go through this rather than
 *  trusting a possibly-empty `.grade` field on a client-synthesized
 *  RatingDisplay-shaped object (see defs.tsx's group/business/booking/
 *  fatigue/ringrust/win%/pop-area columns, which used to hardcode
 *  `grade: ''` because nothing computed it). */
export function pctToGrade(pct: number): string {
  if (pct >= 95) return 'A*'
  if (pct >= 90) return 'A'
  if (pct >= 85) return 'A-'
  if (pct >= 80) return 'B+'
  if (pct >= 75) return 'B'
  if (pct >= 70) return 'B-'
  if (pct >= 65) return 'C+'
  if (pct >= 60) return 'C'
  if (pct >= 55) return 'C-'
  if (pct >= 50) return 'D+'
  if (pct >= 45) return 'D'
  if (pct >= 40) return 'D-'
  if (pct >= 35) return 'E+'
  if (pct >= 30) return 'E'
  if (pct >= 20) return 'E-'
  if (pct >= 10) return 'F+'
  return 'F'
}

/** The one place call sites should format a 0-100 rating for display —
 *  "72" or "B-" depending on the user's Settings > Rating Display Format
 *  toggle. Callers that need a bare number (e.g. for a colored bar's width)
 *  should keep using `pct` directly; this is for the text label. */
export function formatRatingPct(pct: number, format: RatingFormat): string {
  return format === 'pct' ? String(Math.round(pct)) : pctToGrade(pct)
}
