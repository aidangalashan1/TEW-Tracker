import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../api'
import { WorkerListColumnTable } from '../../modules/worker-list/WorkerListTable'

const PAGE_SIZE = 200

export function WorkerSearchPage() {
  const [data, setData] = useState<any>(null)
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
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

  useEffect(() => {
    setLoading(true)
    api.roster.all(page, PAGE_SIZE).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [page])

  if (loading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>
  if (!data?.workers) return <div className="text-muted" style={{ padding: 24 }}>No workers found</div>

  const totalPages = Math.ceil((data.total || 0) / PAGE_SIZE)

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {data.total} workers · Page {page} of {totalPages}
        </span>
        <button className="manage-view-btn text-xs px-2 py-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <button className="manage-view-btn text-xs px-2 py-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        <span className="flex items-center gap-1" style={{ fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Jump to:</span>
          <input type="number" min={1} max={totalPages} defaultValue={page}
            onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt((e.target as HTMLInputElement).value); if (v >= 1 && v <= totalPages) setPage(v) } }}
            style={{ width: 50, padding: '1px 4px', fontSize: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 3, color: '#fff' }} />
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <WorkerListColumnTable workers={data.workers} config={config} onConfigChange={handleConfigChange} key={page} />
      </div>
    </div>
  )
}
