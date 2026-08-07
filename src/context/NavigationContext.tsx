import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

export type RatingFormat = 'pct' | 'grade'

interface NavigationState {
  currentPage: string
  setCurrentPage: (page: string) => void
  navigateToEntity: (type: string, id: number | string) => void
  closeEntity: () => void
  goBack: () => void
  goForward: () => void
  canGoBack: boolean
  canGoForward: boolean
  previousPage: string
}

const NavigationContext = createContext<NavigationState | null>(null)

export function NavigationProvider({ children, initialPage }: { children: React.ReactNode; initialPage?: string }) {
  const [currentPage, _setCurrentPage] = useState(initialPage || 'roster')
  const [previousPage, setPreviousPage] = useState(initialPage || 'roster')
  const [pageHistory, setPageHistory] = useState<string[]>([])
  const [forwardStack, setForwardStack] = useState<string[]>([])

  const setCurrentPage = useCallback((page: string) => {
    setPreviousPage(prev => {
      if (page !== prev) {
        setPageHistory(h => [...h, prev])
        setForwardStack([])
      }
      return page
    })
    _setCurrentPage(page)
  }, [])

  const goBack = useCallback(() => {
    if (pageHistory.length === 0) return
    setPageHistory(h => {
      const prev = h[h.length - 1]
      setForwardStack(f => [...f, currentPage])
      _setCurrentPage(prev)
      return h.slice(0, -1)
    })
  }, [pageHistory, currentPage])

  const goForward = useCallback(() => {
    if (forwardStack.length === 0) return
    setForwardStack(f => {
      const next = f[f.length - 1]
      setPageHistory(h => [...h, currentPage])
      _setCurrentPage(next)
      return f.slice(0, -1)
    })
  }, [forwardStack, currentPage])

  const navigateToEntity = useCallback((type: string, id: number | string) => {
    setCurrentPage(`entity-${type}-${id}`)
  }, [setCurrentPage])

  const closeEntity = useCallback(() => {
    goBack()
  }, [goBack])

  const value: NavigationState = useMemo(() => ({
    currentPage,
    setCurrentPage,
    navigateToEntity,
    closeEntity,
    goBack,
    goForward,
    canGoBack: pageHistory.length > 0,
    canGoForward: forwardStack.length > 0,
    previousPage,
  }), [currentPage, setCurrentPage, navigateToEntity, closeEntity, goBack, goForward, pageHistory.length, forwardStack.length, previousPage])

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const ctx = useContext(NavigationContext)
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider')
  return ctx
}
