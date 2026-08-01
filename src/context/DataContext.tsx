import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api, GameInfo, Federation, imageUrl } from '../api'
import { UserPage } from '../pages/pageTypes'
import { loadPages, savePages, defaultPages } from '../pages/pageStorage'
import { prefetch, clearCache } from '../hooks/dataCache'

export interface RecentDb {
  path: string
  filename: string
  last_accessed: string
  company?: string
  gameDate?: string
  imagePath?: string
}

interface DbState {
  connected: boolean
  path: string
  loading: boolean
}

interface ImageState {
  configured: boolean
  path: string
}

interface DataState {
  gameInfo: GameInfo | null
  playerFed: Federation | null
  allFeds: Federation[]
  focusedFed: Federation | null
  setFocusedFed: (fed: Federation) => void
  loading: boolean
  error: string | null
  storeVersion: number
  refresh: () => Promise<void>
  /** False while the post-connect blocking prefetch phase (game info +
   *  the fixed navigation targets' data) is still running — see
   *  finishConnect() below. AppLayout keeps its full-screen loading gate up
   *  until this flips true, so the first page the user lands on never shows
   *  its own inline spinner. */
  appReady: boolean
  db: DbState
  connectToDb: (path: string) => Promise<void>
  disconnectFromDb: () => Promise<void>
  recentDbs: RecentDb[]
  addRecent: (path: string, extra?: { company?: string; gameDate?: string }) => void
  images: ImageState
  setImagePath: (path: string) => Promise<void>
  img: (relativePath: string) => string
  pages: UserPage[]
  addPage: (label: string) => void
  addPageRaw: (label: string) => string
  removePage: (id: string) => void
  removePageRaw: (id: string) => boolean
  reorderPages: (fromIndex: number, toIndex: number) => void
  resetDefaultView: () => void
  syncWorkspace: () => Promise<void>
}

const DataContext = createContext<DataState | null>(null)

const RECENT_KEY = 'tew-recent-dbs'
const MAX_RECENT = 5

function loadRecents(): RecentDb[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch { return [] }
}

function saveRecents(list: RecentDb[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [playerFed, setPlayerFed] = useState<Federation | null>(null)
  const [allFeds, setAllFeds] = useState<Federation[]>([])
  const [focusedFed, setFocusedFed] = useState<Federation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Backend store version — bumps on every reconnect and every autosave reload
  // (the watcher swaps the DataStore). Pages that cache built responses across
  // remounts (e.g. Worker Search) key their cache off this so a stale in-memory
  // cache doesn't survive a game save.
  const [storeVersion, setStoreVersion] = useState(0)
  const [db, setDb] = useState<DbState>({connected: false, path: '', loading: true})
  const [appReady, setAppReady] = useState(false)
  const [images, setImages] = useState<ImageState>({configured: false, path: ''})
  const [recentDbs, setRecentDbs] = useState<RecentDb[]>(loadRecents)
  const [pages, setPages] = useState<UserPage[]>(loadPages)

  const img = useCallback((relativePath: string) => {
    return images.configured ? imageUrl(relativePath) : ''
  }, [images.configured])

  const addRecent = useCallback((path: string, extra?: { company?: string; gameDate?: string; imagePath?: string }) => {
    setRecentDbs(prev => {
      const existing = prev.find(d => d.path === path)
      const filename = path.split(/[/\\]/).pop() || path
      const entry: RecentDb = { path, filename, last_accessed: new Date().toISOString(), ...extra }
      if (!extra?.imagePath && existing?.imagePath) entry.imagePath = existing.imagePath
      const filtered = prev.filter(d => d.path !== path)
      const next = [entry, ...filtered].slice(0, MAX_RECENT)
      saveRecents(next)
      return next
    })
  }, [])

  // Guards against out-of-order responses: connectToDb() calls load()
  // explicitly right after a reconnect, and the version-poll effect below
  // can also fire one moments later. If two calls overlap and resolve out
  // of order, the older one's results must not clobber the newer one's —
  // otherwise a field (e.g. gameInfo's date) can end up showing stale data
  // from the previous save while other fields correctly show the new one.
  const loadIdRef = useRef(0)

  const load = useCallback(async () => {
    const id = ++loadIdRef.current
    try {
      setLoading(true)
      setError(null)
      const [info, fed, fedsRes, versionRes] = await Promise.all([
        api.game.info(),
        api.fed.player(),
        api.fed.all().catch(() => ({ feds: [] as Federation[] })),
        api.game.version().catch(() => ({ version: 0 })),
      ])
      if (id !== loadIdRef.current) return null
      setGameInfo(info)
      setPlayerFed(fed)
      setAllFeds(fedsRes.feds)
      setStoreVersion(versionRes.version)
      // No player-controlled fed (a "watcher" save) is a valid state, not an
      // error — fall back to the world's first fed so pages that need a
      // fedUid (roster, etc.) have something real to show instead of going
      // blank, rather than leaving focusedFed stuck on null or undefined.
      setFocusedFed(prev => prev || fed || fedsRes.feds[0] || null)
      // A caller can't reliably read the just-set focusedFed/storeVersion
      // React state synchronously right after `await load()` — those setters
      // haven't committed in this closure yet. Return the resolved values
      // directly instead, for callers (finishConnect) that need them right away.
      return { info, fed, focusedFedUid: fed?.uid ?? fedsRes.feds[0]?.uid ?? null, version: versionRes.version }
    } catch (e: any) {
      if (id === loadIdRef.current) setError(e.message || 'Failed to load game data')
      return null
    } finally {
      if (id === loadIdRef.current) setLoading(false)
    }
  }, [])

  // Backend-warmed fixed navigation targets — the small set of pages a user
  // reaches directly from the sidebar (Roster, Schedule, Show History,
  // Storylines, Champions, Teams/Stables) rather than by clicking through an
  // entity. Blocking on these (Promise.allSettled — individual failures
  // don't hang the batch) during connect means none of them ever shows its
  // own inline spinner on the first visit. Keys match the ones the
  // corresponding useSWR call sites use, so this populates the same cache
  // entries they'll read. The backend itself pre-warms the underlying
  // DataStore groups behind most of these the instant init_store() runs
  // (see domains/worker/roster.py, domains/show/schedule.py,
  // domains/company/finance.py's warm_cache hooks), so these requests are
  // normally fast rather than a fresh multi-second build.
  //
  // Worker Search's full roster dump is deliberately left out of the
  // blocking batch — it's heavier and not a guaranteed first click — and
  // instead just warmed in the background, non-blocking, once the gate closes.
  const finishConnect = useCallback(async (fedUid: number | null, version: number) => {
    try {
      if (fedUid != null) {
        await Promise.allSettled([
          prefetch('roster-' + fedUid, version, () => api.roster.list(fedUid)),
          prefetch('schedule-' + fedUid, version, () => api.schedule.list(fedUid)),
          prefetch('past-shows-' + fedUid, version, () => api.show_history.list(fedUid, 100)),
          prefetch('storylines-cross-' + fedUid, version, () => api.storylines.cross(fedUid)),
          prefetch('fed-belts-' + fedUid, version, () => api.fed.belts(fedUid)),
          prefetch('belt-history-' + fedUid, version, () => api.fed.beltHistory(fedUid)),
        ])
      }
    } finally {
      // Always flips, success or failure — the loading gate must never get stuck.
      setAppReady(true)
      prefetch('all-workers', version, () => api.roster.all(1, 99999)).catch(() => {})
    }
  }, [])

  const connectToDb = useCallback(async (path: string) => {
    setDb(prev => ({ ...prev, loading: true }))
    setAppReady(false)
    try {
      await api.db.connect(path)
      setDb({connected: true, path, loading: false})
      const imgStatus = await api.images.status().catch(() => ({configured: false, path: ''}))
      setImages({configured: imgStatus.configured, path: imgStatus.path})
      const data = await load()
      await finishConnect(data?.focusedFedUid ?? null, data?.version ?? 0)
      addRecent(path, {
        company: data?.fed?.name,
        gameDate: data?.info?.current_date ?? undefined,
        imagePath: imgStatus.path || undefined,
      })
    } catch (e: any) {
      setDb(prev => ({ ...prev, loading: false }))
      setAppReady(true)
      throw e
    }
  }, [load, addRecent, finishConnect])

  const setImagePath = useCallback(async (path: string) => {
    await api.images.setPath(path)
    setImages({configured: !!path, path})
    addRecent(db.path, { imagePath: path || undefined })
  }, [db.path, addRecent])

  const disconnectFromDb = useCallback(async () => {
    try {
      await api.db.disconnect()
    } catch {}
    clearCache()
    setDb({connected: false, path: '', loading: false})
    setGameInfo(null)
    setPlayerFed(null)
    setAllFeds([])
    setFocusedFed(null)
    setError(null)
    setAppReady(false)
  }, [])

  const refresh = useCallback(async () => {
    await api.game.refresh()
    await load()
  }, [load])

  useEffect(() => {
    (async () => {
      try {
        const [s, imgStatus] = await Promise.all([
          api.db.status(),
          api.images.status().catch(() => ({configured: false, path: ''})),
        ])
        if (!imgStatus.configured && s.connected && s.path) {
          const saved = loadRecents().find(d => d.path === s.path && d.imagePath)
          if (saved?.imagePath) {
            try { await api.images.setPath(saved.imagePath); imgStatus.path = saved.imagePath; imgStatus.configured = true } catch {}
          }
        }
        setImages({configured: imgStatus.configured, path: imgStatus.path})
        if (s.connected && s.path) {
          setDb({connected: true, path: s.path, loading: false})
          const data = await load()
          await finishConnect(data?.focusedFedUid ?? null, data?.version ?? 0)
        } else {
          setDb({connected: false, path: '', loading: false})
          setLoading(false)
        }
      } catch {
        setDb({connected: false, path: '', loading: false})
        setLoading(false)
        setError('Backend unavailable')
      }
    })()
  }, [load, finishConnect])

  const addPageRaw = useCallback((label: string) => {
    const id = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setPages(prev => {
      const next = [...prev, { id, label }]
      savePages(next)
      return next
    })
    return id
  }, [])

  const addPage = useCallback((label: string) => {
    addPageRaw(label)
  }, [addPageRaw])

  const removePageRaw = useCallback((id: string) => {
    if (id === 'entity-module-worker-list') return false
    if (id === 'worker-search') return false
    if (id === 'booking') return false
    let removed = false
    setPages(prev => {
      const next = prev.filter(p => p.id !== id)
      if (next.length !== prev.length) removed = true
      savePages(next)
      return next
    })
    return removed
  }, [])

  const removePage = useCallback((id: string) => {
    removePageRaw(id)
  }, [removePageRaw])

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setPages(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      savePages(next)
      return next
    })
  }, [])

  const resetDefaultView = useCallback(() => {
    localStorage.removeItem('tew-pages')
    localStorage.removeItem('tew-layouts')
    const defaults = defaultPages()
    setPages(defaults)
  }, [])

  const syncWorkspace = useCallback(async () => {
    const { loadWorkspaceFromBackend } = await import('../pages/pageStorage')
    const { seedLayoutsFromBackend } = await import('../layout/storage')
    const workspace = await loadWorkspaceFromBackend()
    if (workspace) {
      setPages(workspace.pages)
      seedLayoutsFromBackend(workspace.layouts)
    }
  }, [setPages])

  // Poll data version and re-fetch everything on change
  useEffect(() => {
    if (!db.connected) return
    let lastVersion = -1
    const id = setInterval(async () => {
      try {
        const { version } = await api.game.version()
        if (lastVersion === -1) { lastVersion = version; return }
        if (version !== lastVersion) {
          lastVersion = version
          await load()
        }
      } catch {}
    }, 5000)
    return () => clearInterval(id)
  }, [db.connected, load])

  const value: DataState = useMemo(() => ({
    gameInfo, playerFed, allFeds, focusedFed, setFocusedFed,
    loading, error, storeVersion, refresh, appReady,
    db, connectToDb, disconnectFromDb,
    recentDbs, addRecent, images, setImagePath, img,
    pages, addPage, addPageRaw, removePage, removePageRaw, reorderPages,
    resetDefaultView, syncWorkspace,
  }), [
    gameInfo, playerFed, allFeds, focusedFed,
    loading, error, storeVersion, refresh, appReady,
    db, connectToDb, disconnectFromDb,
    recentDbs, addRecent, images, setImagePath, img,
    pages, addPage, addPageRaw, removePage, removePageRaw, reorderPages,
    resetDefaultView, syncWorkspace,
  ])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
