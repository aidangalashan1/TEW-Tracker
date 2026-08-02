import { useCallback, useMemo } from 'react'
import { api, ArcData, ArcItem, ArcStatus } from '../../../api'
import useSWR from '../../../hooks/useApi'

export const ARC_LIST_FIELDS = ['short_term_arcs', 'long_term_arcs', 'short_term_goals', 'long_term_goals'] as const
export type ArcListField = typeof ARC_LIST_FIELDS[number]

export const ARC_STATUS_LABELS: Record<ArcStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  done: 'Done',
  shelved: 'Shelved',
}

export const ARC_STATUS_COLORS: Record<ArcStatus, string> = {
  planned: 'var(--text-muted)',
  in_progress: 'var(--accent)',
  done: '#22c55e',
  shelved: 'var(--text-muted)',
}

/** Open (not done/shelved) items across all 4 fields — the compact signal a
 *  future WorkerProfile badge or worker-list column would want, without
 *  either of those needing to know ArcData's shape. */
export function countOpenArcs(arc: ArcData): number {
  let n = 0
  for (const field of ARC_LIST_FIELDS) {
    for (const item of arc[field] || []) {
      if (item.status === 'planned' || item.status === 'in_progress') n++
    }
  }
  return n
}

/** Single shared source of the booker's arc/goal notes (arcs.json — local
 *  planning data, not derived from the save file). Every consumer — the
 *  Arcs tab today, WorkerProfile/worker-list later — should go through this
 *  hook rather than each declaring its own useSWR('arcs', ...) call, so
 *  there's one cache entry and one place that knows the `arcs` map shape. */
export function useArcsData() {
  const { data, isLoading, setData } = useSWR('arcs', () => api.arcs.list())
  const arcs = useMemo(() => data?.arcs ?? {}, [data])

  const getArc = useCallback((uid: number): ArcData => arcs[String(uid)] || {}, [arcs])

  /** Optimistic local + cache write — mirrors the pattern used elsewhere
   *  (e.g. ShowEpisodeProfile's card mutations) so an edit shows up
   *  immediately without a redundant round-trip refetch. */
  const setArc = useCallback((uid: number, next: ArcData) => {
    setData({ arcs: { ...arcs, [String(uid)]: next } })
  }, [arcs, setData])

  return { arcs, getArc, setArc, isLoading }
}

export function newArcItem(text = ''): ArcItem {
  return {
    id: crypto.randomUUID().slice(0, 8),
    text,
    description: '',
    status: 'planned',
    linked_belt_uid: null,
    linked_worker_uids: [],
    linked_planned_storyline_id: null,
    linked_segments: [],
  }
}
