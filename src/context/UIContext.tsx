import React, { createContext, useContext, useState, useMemo } from 'react'

export type RatingFormat = 'pct' | 'grade'

export type RosterTab = 'workers' | 'developmental' | 'teams' | 'champions'
export type CreativeTab = 'schedule' | 'history' | 'segments' | 'storylines' | 'arcs' | 'diary' | 'rankings'
export type StorylinesSubTab = 'list' | 'beats'

interface UIState {
  ratingFormat: RatingFormat
  setRatingFormat: (f: RatingFormat) => void
  moduleDrawerOpen: boolean
  setModuleDrawerOpen: (v: boolean) => void
  workerRoster: number[]
  setWorkerRoster: (ids: number[]) => void
  rosterTab: RosterTab
  setRosterTab: (t: RosterTab) => void
  creativeTab: CreativeTab
  setCreativeTab: (t: CreativeTab) => void
  // Which sub-view the Storylines page shows — lifted up to UIContext (rather
  // than kept local to StorylinesTab) so the page-tab bar itself can render
  // this as a dropdown and control it directly.
  storylinesSubTab: StorylinesSubTab
  setStorylinesSubTab: (t: StorylinesSubTab) => void
}

const UIContext = createContext<UIState | null>(null)

export interface UIInitialState {
  rosterTab?: RosterTab
  creativeTab?: CreativeTab
  storylinesSubTab?: StorylinesSubTab
}

export function UIProvider({ children, initial }: { children: React.ReactNode; initial?: UIInitialState }) {
  const [ratingFormat, setRatingFormat] = useState<RatingFormat>('pct')
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false)
  const [workerRoster, setWorkerRoster] = useState<number[]>([])
  const [rosterTab, setRosterTab] = useState<RosterTab>(initial?.rosterTab || 'workers')
  const [creativeTab, setCreativeTab] = useState<CreativeTab>(initial?.creativeTab || 'schedule')
  const [storylinesSubTab, setStorylinesSubTab] = useState<StorylinesSubTab>(initial?.storylinesSubTab || 'list')

  const value: UIState = useMemo(() => ({
    ratingFormat,
    setRatingFormat,
    moduleDrawerOpen,
    setModuleDrawerOpen,
    workerRoster,
    setWorkerRoster,
    rosterTab,
    setRosterTab,
    creativeTab,
    setCreativeTab,
    storylinesSubTab,
    setStorylinesSubTab,
  }), [ratingFormat, moduleDrawerOpen, workerRoster, rosterTab, creativeTab, storylinesSubTab])

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
