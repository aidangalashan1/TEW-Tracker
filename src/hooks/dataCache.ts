// A single shared, cross-mount data cache — consolidates what used to be
// three separate ad hoc module-level caches (WorkerSearchPage, DynamicPage,
// and none at all for most manual-fetch pages/tabs). Keyed by a string plus
// the backend's storeVersion, since that's the existing signal for "did the
// underlying save-file data change" (autosave reload, reconnect).
//
// Lives outside React state/component lifecycle so cached data survives a
// page unmounting and remounting — PageRouter fully unmounts a page on
// every navigation, so component-local state alone can never avoid a
// re-fetch on revisit.

interface CacheEntry<T> {
  version: number
  data: T
}

const cache = new Map<string, CacheEntry<unknown>>()
const inFlight = new Map<string, Promise<unknown>>()

export function getCached<T>(key: string, version: number): T | undefined {
  const entry = cache.get(key)
  return entry && entry.version === version ? (entry.data as T) : undefined
}

export function setCached<T>(key: string, version: number, data: T): void {
  cache.set(key, { version, data })
}

/** Cache hit -> resolves immediately. A fetch already in flight for this key
 *  is reused instead of firing a duplicate request (e.g. a background
 *  prefetch racing a component's own mount-triggered fetch). Otherwise runs
 *  `fetcher` and caches the result. */
export function prefetch<T>(key: string, version: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key, version)
  if (cached !== undefined) return Promise.resolve(cached)

  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = fetcher()
    .then(data => {
      setCached(key, version, data)
      inFlight.delete(key)
      return data
    })
    .catch(e => {
      inFlight.delete(key)
      throw e
    })
  inFlight.set(key, promise)
  return promise
}

export function clearCache(): void {
  cache.clear()
  inFlight.clear()
}
