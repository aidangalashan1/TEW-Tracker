import { useState, useEffect, useCallback, useRef } from 'react'

interface SWRResult<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  mutate: () => void
}

export default function useSWR<T>(key: string | null, fetcher: () => Promise<T>): SWRResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const prevKey = useRef<typeof key>(undefined) // start undefined so first key always triggers load
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
    if (key !== prevKey.current) {
      prevKey.current = key
      load()
    }
    return () => { mounted.current = false }
  }, [key, load])

  return { data, error, isLoading: loading, mutate: load }
}
