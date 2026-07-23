import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../api'
import { useApp } from '../../context/AppContext'
import { WorkerListColumnTable } from '../../modules/worker-list/WorkerListTable'
import { TeamsStablesTab } from './worker-list/TeamsStablesTab'
import { ChampionsTab } from './worker-list/ChampionsTab'

export function WorkerListPage() {
  const { focusedFed, playerFed, rosterTab: tab } = useApp()
  const fed = focusedFed || playerFed
  const [data, setData] = useState<any>(null)
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const workspaceRef = useRef<{ pages: any[]; layouts: Record<string, any> } | null>(null)

  useEffect(() => {
    api.workspace.get().then(ws => {
      workspaceRef.current = ws
      for (const pageId of Object.keys(ws.layouts)) {
        const page = ws.layouts[pageId]
        const item = (page.items || []).find((it: any) => it.moduleId === 'worker-list')
        if (item?.config) {
          setConfig(item.config)
          return
        }
      }
    }).catch(() => {})
  }, [])

  const handleConfigChange = useCallback((cfg: Record<string, any>) => {
    setConfig(prev => {
      const next = { ...prev, ...cfg }
      const ws = workspaceRef.current
      if (ws) {
        for (const pageId of Object.keys(ws.layouts)) {
          const page = ws.layouts[pageId]
          const item = (page.items || []).find((it: any) => it.moduleId === 'worker-list')
          if (item) {
            item.config = { ...(item.config || {}), ...cfg }
            break
          }
        }
        api.workspace.save(ws.pages, ws.layouts).catch(() => {})
      }
      return next
    })
  }, [])

  const fedUid = fed?.uid
  useEffect(() => {
    if (fedUid == null) { setLoading(false); return }
    setLoading(true)
    api.roster.list(fedUid).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [fedUid])

  if (loading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>
  if (!data?.workers) return <div className="text-muted" style={{ padding: 24 }}>No workers</div>

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {tab === 'workers' && <WorkerListColumnTable workers={data.workers} config={config} onConfigChange={handleConfigChange} />}
      {tab === 'teams' && fed && <TeamsStablesTab fedUid={fed.uid} workers={data.workers} config={config} onConfigChange={handleConfigChange} />}
      {tab === 'champions' && fed && <ChampionsTab fedUid={fed.uid} workers={data.workers} />}
    </div>
  )
}
