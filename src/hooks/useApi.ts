import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { getCached, setCached, prefetch } from './dataCache'

interface SWRResult<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  mutate: () => void
  /** Optimistic local update — sets `data` immediately and writes through to
   *  the shared cache (so other mounts of the same key see it too), without
   *  a round-trip fetch. For when a caller already knows the new value (e.g.
   *  right after a successful mutation) and doesn't want to wait on `mutate()`. */
  setData: (data: T) => void
}

export default function useSWR<T>(key: string | null, fetcher: () => Promise<T>): SWRResult<T> {
  // storeVersion bumps on every save/reload (see AppContext). Reloading on a
  // version change here — rather than requiring every call site to fold it
  // into `key` by hand — is what actually invalidates a profile page's data
  // after an autosave; before this, a page left open across a save kept
  // showing pre-save data indefinitely.
  //
  // Backed by the shared dataCache (src/hooks/dataCache.ts): a cache hit
  // initializes `data` synchronously (no loading flash), and every fetch
  // goes through `prefetch()` so it dedupes against — and populates the
  // cache for — any other useSWR instance or background prefetch using the
  // same key, including across a full unmount/remount (PageRouter fully
  // unmounts a page on navigation, so component-local state alone can't
  // survive a revisit).
  const { storeVersion } = useApp()
  const [data, setData] = useState<T | null>(() => (key ? getCached<T>(key, storeVersion) ?? null : null))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(() => !(key && getCached<T>(key, storeVersion) !== undefined))
  const prevKey = useRef<typeof key>(undefined) // start undefined so first key always triggers load
  const prevVersion = useRef<number | undefined>(undefined)
  const mounted = useRef(true)

  // `force` bypasses the cache — used by `mutate()`, where the caller wants a
  // guaranteed fresh fetch (e.g. after an action that changed server-side
  // state without bumping storeVersion), not whatever's already cached.
  const load = useCallback(async (force = false) => {
    if (!key) {
      setLoading(false)
      return
    }
    if (!force) {
      const cached = getCached<T>(key, storeVersion)
      if (cached !== undefined) {
        setData(cached)
        setError(null)
        setLoading(false)
        return
      }
    }
    try {
      setLoading(true)
      setError(null)
      const result = await (force ? fetcher().then(r => { setCached(key, storeVersion, r); return r }) : prefetch(key, storeVersion, fetcher))
      if (mounted.current) setData(result)
    } catch (e: any) {
      if (mounted.current) setError(e.message || 'Request failed')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [key, storeVersion, fetcher])

  useEffect(() => {
    mounted.current = true
    if (key !== prevKey.current || storeVersion !== prevVersion.current) {
      prevKey.current = key
      prevVersion.current = storeVersion
      load()
    }
    return () => { mounted.current = false }
  }, [key, storeVersion, load])

  const setLocalData = useCallback((next: T) => {
    setData(next)
    if (key) setCached(key, storeVersion, next)
  }, [key, storeVersion])

  return { data, error, isLoading: loading, mutate: () => load(true), setData: setLocalData }
}
