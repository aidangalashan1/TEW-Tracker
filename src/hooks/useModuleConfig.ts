import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '../api'

/** Loads a module's saved layout config from the workspace file on mount,
 *  and persists patches back to whichever workspace page/layout item first
 *  references this moduleId — shared by WorkerListPage (fixed moduleId
 *  'worker-list') and ModulePage (dynamic per-module). */
export function useModuleConfig(moduleId: string) {
  const [config, setConfig] = useState<Record<string, any>>({})
  const workspaceRef = useRef<{ pages: any[]; layouts: Record<string, any> } | null>(null)

  useEffect(() => {
    api.workspace.get().then(ws => {
      workspaceRef.current = ws
      for (const pageId of Object.keys(ws.layouts)) {
        const page = ws.layouts[pageId]
        const item = (page.items || []).find((it: any) => it.moduleId === moduleId)
        if (item?.config) {
          setConfig(item.config)
          return
        }
      }
    }).catch(() => {})
  }, [moduleId])

  const handleConfigChange = useCallback((cfg: Record<string, any>) => {
    setConfig(prev => {
      const next = { ...prev, ...cfg }
      const ws = workspaceRef.current
      if (ws) {
        for (const pageId of Object.keys(ws.layouts)) {
          const page = ws.layouts[pageId]
          const item = (page.items || []).find((it: any) => it.moduleId === moduleId)
          if (item) {
            item.config = { ...(item.config || {}), ...cfg }
            break
          }
        }
        api.workspace.save(ws.pages, ws.layouts).catch(() => {})
      }
      return next
    })
  }, [moduleId])

  return { config, handleConfigChange }
}
