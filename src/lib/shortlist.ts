import type { Worker } from '../api-types'

export type PickableWorker = Worker & { is_shortlisted?: boolean }

/** Union a roster/scoped worker list with the player's shortlisted workers,
 *  pulling full Worker data for the shortlisted ones from `allWorkers`
 *  (the unscoped get_all_workers list) rather than the shortlist's own
 *  enriched stub (name/picture/found only) — pickers expect a real Worker
 *  shape (skills, contract, etc). Workers already in `base` (e.g. already
 *  signed to the roster being edited) aren't duplicated. */
export function mergeShortlistWorkers(base: Worker[], allWorkers: Worker[], shortlistUids: Set<number>): PickableWorker[] {
  if (shortlistUids.size === 0) return base
  const baseSet = new Set(base.map(w => w.uid))
  const extra: PickableWorker[] = allWorkers
    .filter(w => shortlistUids.has(w.uid) && !baseSet.has(w.uid))
    .map(w => ({ ...w, is_shortlisted: true }))
  return extra.length > 0 ? [...base, ...extra] : base
}
