import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ModuleRenderProps } from '../types'
import type { FreeAgentsResponse, FreeAgent } from '../../api'
import { api } from '../../api'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../components/Toast'
import { PersonImg } from '../../components/PersonImg'
import { ratingColor } from '../../lib/colors'
import starIcon from '../../assets/UI icons/star.png'

type ViewMode = 'all' | 'shortlisted'

function useShortlist() {
  const [uids, setUids] = useState<Set<number>>(new Set())
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    api.shortlist.list()
      .then(r => setUids(new Set(r.entries.map(e => e.worker_uid))))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => { load() }, [load])
  return { uids, loaded, refresh: load }
}

/** Always stops propagation itself — callers never need to remember to, so a
 *  star sitting inside a clickable card/row can't also trigger navigation. */
function ShortlistStar({ shortlisted, onClick, size = 16 }: { shortlisted: boolean; onClick: (e: React.MouseEvent) => void; size?: number }) {
  return (
    <img
      src={starIcon} alt="" onClick={e => { e.stopPropagation(); onClick(e) }}
      className={`cursor-pointer ${shortlisted ? 'filter-star-gold' : 'filter-icon-gray'}`}
      style={{ width: size, height: size, flexShrink: 0 }}
      data-tooltip={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
    />
  )
}

function FreeAgentCard({ w, shortlisted, onToggle, onClick }: { w: FreeAgent; shortlisted: boolean; onToggle: (e: React.MouseEvent) => void; onClick: () => void }) {
  const pct = w.pop?.pct ?? 0
  return (
    <div className="flex-col bg-secondary rounded-lg border-default overflow-hidden cursor-pointer" onClick={onClick}>
      <div className="relative">
        <PersonImg picture={w.picture} size={160} />
        <div className="absolute top-0 right-0 p-1" style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '0 0 0 8px' }}>
          <ShortlistStar shortlisted={shortlisted} onClick={onToggle} size={18} />
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2">
        <div className="text-sm text-bold text-primary truncate">{w.name}</div>
        <div className="text-xs text-secondary truncate">{w.positions[0] || 'Unassigned'}{w.age ? ` · ${w.age}y` : ''}</div>
        <div className="items-center gap-2 mt-1">
          <span className="text-xs text-secondary">Pop</span>
          <span className="text-xs text-bold text-mono" style={{ color: ratingColor(pct) }}>{pct}%</span>
          {w.form_summary && (
            <span className="text-xs text-mono ml-auto" style={{ color: ratingColor(w.form_summary.avg_rating) }} data-tooltip={`Avg form: ${w.form_summary.avg_rating}% across ${w.form_summary.total_segments} segments`}>
              {w.form_summary.avg_rating}% form
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function FreeAgentRow({ w, shortlisted, onToggle, onClick, size }: { w: FreeAgent; shortlisted: boolean; onToggle: (e: React.MouseEvent) => void; onClick: () => void; size: number }) {
  const pct = w.pop?.pct ?? 0
  return (
    <div className="items-center gap-2 p-1 bg-secondary rounded border-default cursor-pointer" onClick={onClick}>
      <PersonImg picture={w.picture} size={size} />
      <span className="text-xs text-primary flex-1 truncate">{w.name}</span>
      <span className="text-xs text-bold text-mono" style={{ color: ratingColor(pct) }}>{pct}%</span>
      <ShortlistStar shortlisted={shortlisted} onClick={onToggle} />
    </div>
  )
}

export function FreeAgentsModule({ data, tier }: ModuleRenderProps<FreeAgentsResponse>) {
  const { navigateToEntity } = useApp()
  const { showToast } = useToast()
  const { uids: shortlistUids, refresh: refreshShortlist } = useShortlist()
  const [view, setView] = useState<ViewMode>('all')
  const [wrestlersOnly, setWrestlersOnly] = useState(true)
  const [search, setSearch] = useState('')

  const workers = useMemo(() => data?.workers || [], [data])

  const toggleShortlist = useCallback(async (uid: number, name: string) => {
    try {
      if (shortlistUids.has(uid)) {
        await api.shortlist.remove(uid)
        showToast(`Removed ${name} from shortlist`, 'info')
      } else {
        await api.shortlist.add(uid)
        showToast(`Added ${name} to shortlist`, 'success')
      }
      refreshShortlist()
    } catch {
      showToast('Failed to update shortlist', 'error')
    }
  }, [shortlistUids, refreshShortlist, showToast])

  const filtered = useMemo(() => {
    let list = workers
    if (view === 'shortlisted') list = list.filter(w => shortlistUids.has(w.uid))
    if (wrestlersOnly) list = list.filter(w => !w.non_wrestler)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w => w.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => (b.pop?.pct ?? 0) - (a.pop?.pct ?? 0))
  }, [workers, view, wrestlersOnly, search, shortlistUids])

  if (workers.length === 0) return <div className="loading p-5 text-center text-muted">No free agents found</div>

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full p-2 justify-center gap-1">
        <div className="text-xs text-semibold text-muted text-uppercase">Free Agents</div>
        <div className="text-xl text-bold text-primary">{workers.length}</div>
        <div className="text-xs text-muted">{shortlistUids.size} shortlisted</div>
      </div>
    )
  }

  if (tier === 'small') {
    const shortlisted = workers.filter(w => shortlistUids.has(w.uid))
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1px">
        <div className="text-xxs text-bold text-muted text-uppercase px-1 mb-1">Shortlist ({shortlisted.length})</div>
        {shortlisted.length === 0 ? (
          <div className="text-xs text-muted p-1">Star a free agent to shortlist them.</div>
        ) : (
          shortlisted.map(w => (
            <FreeAgentRow key={w.uid} w={w} size={22} shortlisted onToggle={() => toggleShortlist(w.uid, w.name)} onClick={() => navigateToEntity('worker', w.uid)} />
          ))
        )}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1px">
        <div className="items-center gap-1 px-1 mb-1">
          <div className="text-xxs text-bold text-muted text-uppercase">Free Agents ({filtered.length})</div>
          <div onClick={() => setView(view === 'all' ? 'shortlisted' : 'all')} className={`ml-auto text-xxs px-1 py-0 rounded-xs cursor-pointer text-bold ${view === 'shortlisted' ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
            {view === 'shortlisted' ? 'Shortlisted' : 'All'}
          </div>
        </div>
        {filtered.slice(0, 40).map(w => (
          <FreeAgentRow key={w.uid} w={w} size={26} shortlisted={shortlistUids.has(w.uid)} onToggle={() => toggleShortlist(w.uid, w.name)} onClick={() => navigateToEntity('worker', w.uid)} />
        ))}
        {filtered.length === 0 && <div className="text-xs text-muted p-2">No matches.</div>}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-3">
      <div className="items-center gap-2 flex-wrap">
        {(['all', 'shortlisted'] as ViewMode[]).map(v => (
          <div key={v} onClick={() => setView(v)} className={`px-2 py-1 rounded-md text-xs text-semibold cursor-pointer ${view === v ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
            {v === 'all' ? `All (${workers.length})` : `Shortlisted (${shortlistUids.size})`}
          </div>
        ))}
        <label className="items-center gap-1 text-xs cursor-pointer user-select-none">
          <span className={`toggle-track${wrestlersOnly ? ' active' : ''}`} onClick={() => setWrestlersOnly(p => !p)}><span className="toggle-thumb" /></span>
          Wrestlers Only
        </label>
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="search-input ml-auto" style={{ width: 180, height: 26, fontSize: 11, padding: '0 8px' }} />
        <span className="text-xs text-secondary">{filtered.length} shown</span>
      </div>

      {filtered.length === 0 ? (
        <div className="p-5 text-center text-muted text-sm">
          {view === 'shortlisted' ? 'No one shortlisted yet — star a free agent to add them.' : 'No free agents match these filters.'}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {filtered.map(w => (
            <FreeAgentCard key={w.uid} w={w} shortlisted={shortlistUids.has(w.uid)} onToggle={() => toggleShortlist(w.uid, w.name)} onClick={() => navigateToEntity('worker', w.uid)} />
          ))}
        </div>
      )}
    </div>
  )
}
