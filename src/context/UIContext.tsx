import React, { createContext, useContext, useState, useMemo } from 'react'

export type RatingFormat = 'pct' | 'grade'

export type RosterTab = 'workers' | 'teams' | 'champions'

interface UIState {
  ratingFormat: RatingFormat
  setRatingFormat: (f: RatingFormat) => void
  moduleDrawerOpen: boolean
  setModuleDrawerOpen: (v: boolean) => void
  workerRoster: number[]
  setWorkerRoster: (ids: number[]) => void
  rosterTab: RosterTab
  setRosterTab: (t: RosterTab) => void
}

const UIContext = createContext<UIState | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [ratingFormat, setRatingFormat] = useState<RatingFormat>('pct')
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false)
  const [workerRoster, setWorkerRoster] = useState<number[]>([])
  const [rosterTab, setRosterTab] = useState<RosterTab>('workers')

  const value: UIState = useMemo(() => ({
    ratingFormat,
    setRatingFormat,
    moduleDrawerOpen,
    setModuleDrawerOpen,
    workerRoster,
    setWorkerRoster,
    rosterTab,
    setRosterTab,
  }), [ratingFormat, moduleDrawerOpen, workerRoster, rosterTab])

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
