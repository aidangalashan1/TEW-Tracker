import type { PastShowMatch } from '../api'

/** Splits a show's matches into pre-show/main-show/post-show segments
 *  (was show-history's detail modal). */
export function partitionShowSegments(matches: PastShowMatch[]): { preShow: PastShowMatch[]; mainShow: PastShowMatch[]; postShow: PastShowMatch[] } {
  return {
    preShow: matches.filter(m => m.pre_show),
    mainShow: matches.filter(m => !m.pre_show && !m.post_show),
    postShow: matches.filter(m => m.post_show),
  }
}
