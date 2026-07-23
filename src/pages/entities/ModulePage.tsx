import { useState, useEffect, useCallback, useRef } from 'react'
import { getModule } from '../../modules/registry'
import { api } from '../../api'
import { useApp } from '../../context/AppContext'

export function ModulePage({ moduleId }: { moduleId: string }) {
  const { focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const def = getModule(moduleId)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

  const fedUid = fed?.uid
  useEffect(() => {
    if (fedUid == null || !def?.fetchData) { setLoading(false); return }
    setLoading(true)
    def.fetchData(fedUid).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [def, fedUid])

  if (!def) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: 'var(--accent)' }}>Module not found: {moduleId}</div>
      </div>
    )
  }

  if (loading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  return (
    <div className="module-full" style={{ padding: 8 }}>
      {def.render({
        data,
        width: 16,
        height: 16,
        tier: 'large',
        config,
        onConfigChange: handleConfigChange,
      })}
    </div>
  )
}
