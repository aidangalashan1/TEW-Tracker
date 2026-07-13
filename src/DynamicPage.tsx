import { useState, useCallback, useEffect } from 'react'
import { useApp } from './context/AppContext'
import { LayoutEngine } from './layout/LayoutEngine'
import { loadLayout, saveLayout } from './layout/storage'
import type { LayoutItemData } from './layout/types'
import { getModule } from './modules/registry'

const _fedCache = new Map<string, Map<string, any>>()

export function DynamicPage({ pageId }: { pageId: string }) {
  const { focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const [layout, setLayout] = useState<LayoutItemData[]>(() => loadLayout(pageId).items)
  const [moduleData, setModuleData] = useState<Record<string, any>>({})
  useEffect(() => { setLayout(loadLayout(pageId).items) }, [pageId])
  const handleLayoutChange = useCallback((items: LayoutItemData[]) => {
    setLayout(items)
    saveLayout(pageId, { page: pageId, items })
  }, [pageId])

  const moduleSetKey = Array.from(new Set(layout.map(item => item.moduleId))).sort().join(",")

  useEffect(() => {
    if (!fed) return
    const fedKey = `fed_${fed.uid}`
    // Invalidate cache on fed change
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
        const data = await def.fetchData(fed.uid).catch(() => null)
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
  }, [fed?.uid, moduleSetKey])

  return <LayoutEngine layout={layout} data={moduleData} onLayoutChange={handleLayoutChange} />
}
