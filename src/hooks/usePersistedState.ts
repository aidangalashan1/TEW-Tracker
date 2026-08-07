import { useState } from 'react'

/** Per-machine UI preference (like ui-scale, group-by, filters) persisted to
 *  localStorage under the existing `tew-*` key convention — see
 *  src/lib/uiScale.ts and WorkerListTable's `LS()` closure for the same
 *  pattern applied ad hoc. Use this for any single-value toggle/filter that
 *  should survive navigating away from a page and back. */
export function usePersistedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : fallback
    } catch {
      return fallback
    }
  })

  const setPersisted = (v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* best-effort */ }
      return next
    })
  }

  return [value, setPersisted] as const
}
