import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext'

interface SWRResult<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  mutate: () => void
}

export default function useSWR<T>(key: string | null, fetcher: () => Promise<T>): SWRResult<T> {
  // storeVersion bumps on every save/reload (see AppContext). Reloading on a
  // version change here — rather than requiring every call site to fold it
  // into `key` by hand — is what actually invalidates a profile page's data
  // after an autosave; before this, a page left open across a save kept
  // showing pre-save data indefinitely (the same bug class already fixed
  // ad hoc in WorkerSearchPage/DynamicPage's own caches).
  const { storeVersion } = useApp()
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const prevKey = useRef<typeof key>(undefined) // start undefined so first key always triggers load
  const prevVersion = useRef<number | undefined>(undefined)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    if (!key) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await fetcher()
      if (mounted.current) setData(result)
    } catch (e: any) {
      if (mounted.current) setError(e.message || 'Request failed')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [key, fetcher])

  useEffect(() => {
    mounted.current = true
    if (key !== prevKey.current || storeVersion !== prevVersion.current) {
      prevKey.current = key
      prevVersion.current = storeVersion
      load()
    }
    return () => { mounted.current = false }
  }, [key, storeVersion, load])

  return { data, error, isLoading: loading, mutate: load }
}
