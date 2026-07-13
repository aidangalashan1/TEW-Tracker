import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api, GameInfo, Federation, imageUrl } from '../api'
import { UserPage } from '../pages/pageTypes'
import { loadPages, savePages, defaultPages } from '../pages/pageStorage'

export interface RecentDb {
  path: string
  filename: string
  last_accessed: string
  company?: string
  gameDate?: string
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
  refresh: () => Promise<void>
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
  const [db, setDb] = useState<DbState>({connected: false, path: '', loading: true})
  const [images, setImages] = useState<ImageState>({configured: false, path: ''})
  const [recentDbs, setRecentDbs] = useState<RecentDb[]>(loadRecents)
  const [pages, setPages] = useState<UserPage[]>(loadPages)

  const img = useCallback((relativePath: string) => {
    return images.configured ? imageUrl(relativePath) : ''
  }, [images.configured])

  const addRecent = useCallback((path: string, extra?: { company?: string; gameDate?: string }) => {
    setRecentDbs(prev => {
      const filename = path.split(/[/\\]/).pop() || path
      const entry: RecentDb = { path, filename, last_accessed: new Date().toISOString(), ...extra }
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
      const [info, fed, fedsRes] = await Promise.all([
        api.game.info(),
        api.fed.player(),
        api.fed.all().catch(() => ({ feds: [] as Federation[] })),
      ])
      if (id !== loadIdRef.current) return null
      setGameInfo(info)
      setPlayerFed(fed)
      setAllFeds(fedsRes.feds)
      setFocusedFed(prev => prev || fed)
      return { info, fed }
    } catch (e: any) {
      if (id === loadIdRef.current) setError(e.message || 'Failed to load game data')
      return null
    } finally {
      if (id === loadIdRef.current) setLoading(false)
    }
  }, [])

  const connectToDb = useCallback(async (path: string) => {
    setDb(prev => ({ ...prev, loading: true }))
    try {
      await api.db.connect(path)
      setDb({connected: true, path, loading: false})
      await api.images.status().then(s => setImages({configured: s.configured, path: s.path})).catch(() => {})
      const data = await load()
      addRecent(path, {
        company: data?.fed?.name,
        gameDate: data?.info?.current_date ?? undefined,
      })
    } catch (e: any) {
      setDb(prev => ({ ...prev, loading: false }))
      throw e
    }
  }, [load, addRecent])

  const setImagePath = useCallback(async (path: string) => {
    await api.images.setPath(path)
    setImages({configured: !!path, path})
  }, [])

  const disconnectFromDb = useCallback(async () => {
    try {
      await api.db.disconnect()
    } catch {}
    setDb({connected: false, path: '', loading: false})
    setGameInfo(null)
    setPlayerFed(null)
    setAllFeds([])
    setFocusedFed(null)
    setError(null)
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
        setImages({configured: imgStatus.configured, path: imgStatus.path})
        if (s.connected && s.path) {
          setDb({connected: true, path: s.path, loading: false})
          await load()
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
  }, [load])

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
    loading, error, refresh,
    db, connectToDb, disconnectFromDb,
    recentDbs, addRecent, images, setImagePath, img,
    pages, addPage, addPageRaw, removePage, removePageRaw, reorderPages,
    resetDefaultView, syncWorkspace,
  }), [
    gameInfo, playerFed, allFeds, focusedFed,
    loading, error, refresh,
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
