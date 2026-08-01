import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { api } from '../../api'
import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { WorkerListColumnTable } from '../../modules/worker-list/WorkerListTable'
import filterIcon from '../../assets/UI icons/filter.png'

function loadFilters(): { excludeCompany: boolean; excludeUnavailable: boolean } {
  try {
    const raw = localStorage.getItem('tew-search-filters')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { excludeCompany: false, excludeUnavailable: false }
}

function saveFilters(f: { excludeCompany: boolean; excludeUnavailable: boolean }) {
  localStorage.setItem('tew-search-filters', JSON.stringify(f))
}

export function WorkerSearchPage() {
  const { playerFed } = useApp()
  // Cached across remounts (e.g. navigating away and back) via the shared
  // dataCache, so re-opening the page is instant. The backend itself
  // pre-warms this exact request in the background on every connect/reload
  // (see domains/worker/roster.py's warm_cache), so by the time this fetch
  // actually runs it's normally an instant cache hit rather than a fresh
  // multi-second build.
  const { data, isLoading: loading } = useSWR('all-workers', () => api.roster.all(1, 99999))
  const [config, setConfig] = useState<Record<string, any>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [excludeCompany, setExcludeCompany] = useState(() => loadFilters().excludeCompany)
  const [excludeUnavailable, setExcludeUnavailable] = useState(() => loadFilters().excludeUnavailable)
  const filterRef = useRef<HTMLDivElement>(null)
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
    const onClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false)
    }
    if (showFilters) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [showFilters])

  useEffect(() => { saveFilters({ excludeCompany, excludeUnavailable }) }, [excludeCompany, excludeUnavailable])

  const playerFedUid = playerFed?.uid ?? 0

  const filtered = useMemo(() => {
    const workers = data?.workers ?? []
    let list = workers
    if (excludeCompany && playerFedUid) list = list.filter((w: any) => w.player_fed_uid !== playerFedUid)
    if (excludeUnavailable) list = list.filter((w: any) =>
      w.contract_status !== 'exclusive_written' || (w.contract_expiry_days > 0 && w.contract_expiry_days <= 30)
    )
    return list
  }, [data, excludeCompany, excludeUnavailable, playerFedUid])

  const hasActiveFilters = excludeCompany || excludeUnavailable

  if (loading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>
  if (!data?.workers) return <div className="text-muted" style={{ padding: 24 }}>No workers found</div>

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} workers</span>
        <div className="relative" ref={filterRef}>
          <button className="manage-view-btn text-xs flex items-center gap-1" onClick={() => setShowFilters(p => !p)} style={hasActiveFilters ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}>
            <img src={filterIcon} alt="" style={{ width: 12, height: 12 }} /> Filters{hasActiveFilters ? ' (1)' : ''}
          </button>
          {showFilters && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 8, zIndex: 50, minWidth: 260, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              <label className="flex items-center gap-2 cursor-pointer" style={{ padding: '4px 0', fontSize: 12, userSelect: 'none' }}
                onClick={() => setExcludeCompany(p => !p)}>
                <div className={`toggle-track ${excludeCompany ? 'active' : ''}`}><div className="toggle-thumb" /></div>
                Exclude {playerFed?.name || 'your company'} workers
              </label>
              <label className="flex items-center gap-2 cursor-pointer" style={{ padding: '4px 0', fontSize: 12, userSelect: 'none' }}
                onClick={() => setExcludeUnavailable(p => !p)}>
                <div className={`toggle-track ${excludeUnavailable ? 'active' : ''}`}><div className="toggle-thumb" /></div>
                Exclude unavailable workers
              </label>
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 'calc(100% - 37px)' }}>
        <WorkerListColumnTable workers={filtered} config={config} onConfigChange={handleConfigChange} key={String(hasActiveFilters)} />
      </div>
    </div>
  )
}
