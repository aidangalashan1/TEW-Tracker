import { useState, useCallback, useEffect } from 'react'
import { useApp } from './context/AppContext'
import { api } from './api'
import { LayoutEngine } from './layout/LayoutEngine'
import { loadLayout, saveLayout, getActiveViewId } from './layout/storage'
import type { LayoutItemData } from './layout/types'
import { getModule } from './modules/registry'

const _fedCache = new Map<string, Map<string, any>>()

export function DynamicPage({ pageId }: { pageId: string }) {
  const { focusedFed, playerFed, storeVersion } = useApp()
  const fed = focusedFed || playerFed
  const [layout, setLayout] = useState<LayoutItemData[]>(() => {
    const loaded = loadLayout(pageId).items
    return loaded.filter(it => getModule(it.moduleId))
  })
  const [moduleData, setModuleData] = useState<Record<string, any>>({})
  useEffect(() => {
    const loaded = loadLayout(pageId).items
    setLayout(loaded.filter(it => getModule(it.moduleId)))
  }, [pageId])

  // If a view has been pinned (Manage View's "Confirm"), its snapshot for
  // this page overrides the ambient layout above — falls back to that
  // ambient/default behavior untouched when no view is pinned or this page
  // isn't part of the pinned view.
  useEffect(() => {
    const activeViewId = getActiveViewId()
    if (!activeViewId) return
    let cancelled = false
    api.views.get(activeViewId).then(full => {
      if (cancelled) return
      const snapshot = full.pages.find(p => p.id === pageId)
      if (!snapshot) return
      const items = snapshot.layout.filter(it => getModule(it.moduleId))
      setLayout(items)
      saveLayout(pageId, { page: pageId, items })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [pageId])
  const handleLayoutChange = useCallback((items: LayoutItemData[]) => {
    const filtered = items.filter(it => getModule(it.moduleId))
    setLayout(filtered)
    saveLayout(pageId, { page: pageId, items: filtered })
  }, [pageId])

  const moduleSetKey = Array.from(new Set(layout.map(item => item.moduleId))).sort().join(",")

  const fedUid = fed?.uid
  useEffect(() => {
    if (fedUid == null) return
    // Keyed on fed AND store version — a game-save reload must invalidate
    // this cache too, or a module (e.g. Finance) can keep showing pre-save
    // data indefinitely after navigating away and back. See storeVersion in
    // AppContext / the same fix applied to WorkerSearchPage.
    const fedKey = `fed_${fedUid}_v${storeVersion}`
    if (!_fedCache.has(fedKey)) {
      _fedCache.clear()
      _fedCache.set(fedKey, new Map())
    }
    const cache = _fedCache.get(fedKey)!

    const unique = moduleSetKey ? moduleSetKey.split(",") : []
    const fetchers = unique.map(async (moduleId) => {
      const cached = cache.get(moduleId)
      if (cached) return { moduleId, data: cached }
      const def = getModule(moduleId)
      if (def?.fetchData) {
        const data = await def.fetchData(fedUid).catch(() => null)
        if (data) cache.set(moduleId, data)
        return { moduleId, data }
      }
      return null
    })
    Promise.all(fetchers).then(results => {
      const next: Record<string, any> = {}
      results.forEach(r => { if (r) next[r.moduleId] = r.data })
      setModuleData(next)
    })
  }, [fedUid, moduleSetKey, storeVersion])

  return <LayoutEngine layout={layout} data={moduleData} onLayoutChange={handleLayoutChange} />
}
