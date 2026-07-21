import React from 'react'
import { NavigationProvider, useNavigation } from './NavigationContext'
import { UIProvider, useUI } from './UIContext'
import { DataProvider, useData } from './DataContext'
import type { GameInfo, Federation } from '../api'
import type { UserPage } from '../pages/pageTypes'
import type { RatingFormat, RosterTab } from './UIContext'
import type { RecentDb } from './DataContext'

export type { RatingFormat }

interface AppState {
  gameInfo: GameInfo | null
  playerFed: Federation | null
  allFeds: Federation[]
  focusedFed: Federation | null
  setFocusedFed: (fed: Federation) => void
  loading: boolean
  error: string | null
  ratingFormat: RatingFormat
  setRatingFormat: (f: RatingFormat) => void
  currentPage: string
  setCurrentPage: (page: string) => void
  navigateToEntity: (type: string, id: number | string) => void
  closeEntity: () => void
  previousPage: string
  goBack: () => void
  goForward: () => void
  canGoBack: boolean
  canGoForward: boolean
  refresh: () => Promise<void>
  db: { connected: boolean; path: string; loading: boolean }
  connectToDb: (path: string) => Promise<void>
  disconnectFromDb: () => Promise<void>
  recentDbs: RecentDb[]
  addRecent: (path: string) => void
  images: { configured: boolean; path: string }
  setImagePath: (path: string) => Promise<void>
  img: (relativePath: string) => string
  pages: UserPage[]
  addPage: (label: string) => void
  removePage: (id: string) => void
  reorderPages: (fromIndex: number, toIndex: number) => void
  resetDefaultView: () => void
  moduleDrawerOpen: boolean
  setModuleDrawerOpen: (v: boolean) => void
  workerRoster: number[]
  setWorkerRoster: (ids: number[]) => void
  syncWorkspace: () => Promise<void>
  rosterTab: RosterTab
  setRosterTab: (t: RosterTab) => void
}

function AppInner({ children }: { children: React.ReactNode }) {
  const nav = useNavigation()
  const ui = useUI()
  const data = useData()

  // Wire cross-context callbacks: data actions that should also navigate
  const connectToDb = React.useCallback(async (path: string) => {
    await data.connectToDb(path)
    nav.setCurrentPage('roster')
  }, [data, nav])

  const disconnectFromDb = React.useCallback(async () => {
    await data.disconnectFromDb()
    nav.setCurrentPage('welcome')
  }, [data, nav])

  const addPage = React.useCallback((label: string) => {
    const id = data.addPageRaw(label)
    nav.setCurrentPage(id)
  }, [data, nav])

  const removePage = React.useCallback((id: string) => {
    const currentPage = nav.currentPage
    data.removePageRaw(id)
    if (currentPage === id) {
      const remaining = data.pages.filter(p => p.id !== id)
      nav.setCurrentPage(remaining.length > 0 ? remaining[0].id : 'roster')
    }
  }, [data, nav])

  const resetDefaultView = React.useCallback(() => {
    data.resetDefaultView()
    nav.setCurrentPage('roster')
  }, [data, nav])

  const value: AppState = React.useMemo(() => ({
    gameInfo: data.gameInfo,
    playerFed: data.playerFed,
    allFeds: data.allFeds,
    focusedFed: data.focusedFed,
    setFocusedFed: data.setFocusedFed,
    loading: data.loading,
    error: data.error,
    ratingFormat: ui.ratingFormat,
    setRatingFormat: ui.setRatingFormat,
    currentPage: nav.currentPage,
    setCurrentPage: nav.setCurrentPage,
    navigateToEntity: nav.navigateToEntity,
    closeEntity: nav.closeEntity,
    previousPage: nav.previousPage,
    goBack: nav.goBack,
    goForward: nav.goForward,
    canGoBack: nav.canGoBack,
    canGoForward: nav.canGoForward,
    refresh: data.refresh,
    db: data.db,
    connectToDb,
    disconnectFromDb,
    recentDbs: data.recentDbs,
    addRecent: data.addRecent,
    images: data.images,
    setImagePath: data.setImagePath,
    img: data.img,
    pages: data.pages,
    addPage,
    removePage,
    reorderPages: data.reorderPages,
    resetDefaultView,
    moduleDrawerOpen: ui.moduleDrawerOpen,
    setModuleDrawerOpen: ui.setModuleDrawerOpen,
    workerRoster: ui.workerRoster,
    setWorkerRoster: ui.setWorkerRoster,
    syncWorkspace: data.syncWorkspace,
    rosterTab: ui.rosterTab,
    setRosterTab: ui.setRosterTab,
  }), [data, nav, ui, connectToDb, disconnectFromDb, addPage, removePage, resetDefaultView])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

const AppContext = React.createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <UIProvider>
        <DataProvider>
          <AppInner>
            {children}
          </AppInner>
        </DataProvider>
      </UIProvider>
    </NavigationProvider>
  )
}

export function useApp() {
  const ctx = React.useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
