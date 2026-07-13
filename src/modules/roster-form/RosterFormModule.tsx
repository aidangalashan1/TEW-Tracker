import { useState, useMemo } from 'react'
import type { ModuleRenderProps } from '../types'
import type { RosterForm, RosterFormEntry } from '../../api'
import { useApp } from '../../context/AppContext'
import { ratingColor } from '../../lib/colors'
import { PersonImg } from '../../components/PersonImg'

type SortKey = 'avg' | 'best' | 'recent' | 'name'

function sortWorkers(workers: RosterFormEntry[], key: SortKey): RosterFormEntry[] {
  const list = [...workers]
  if (key === 'name') return list.sort((a, b) => a.name.localeCompare(b.name))
  if (key === 'best') return list.sort((a, b) => b.summary.best_rating - a.summary.best_rating)
  if (key === 'recent') return list.sort((a, b) => (b.recent_ratings[0] ?? 0) - (a.recent_ratings[0] ?? 0))
  return list.sort((a, b) => b.summary.avg_rating - a.summary.avg_rating)
}

function FormMiniStrip({ ratings, max = 8 }: { ratings: number[]; max?: number }) {
  const shown = ratings.slice(0, max)
  if (shown.length === 0) return <span className="text-xxs text-muted">No history</span>
  return (
    <span className="items-center gap-1px">
      {shown.map((r, i) => (
        <span key={i} className="flex-shrink-0 rounded-xs" style={{ width: 8, height: 8, background: ratingColor(r) }} data-tooltip={`${r}%`} />
      ))}
    </span>
  )
}

function WorkerDot({ w, navigateToEntity }: { w: RosterFormEntry; navigateToEntity: (t: string, id: number) => void }) {
  const rating = w.summary.avg_rating
  return (
    <div className="flex-col items-center cursor-pointer min-w-0" style={{ flex: '0 0 44px' }} onClick={() => navigateToEntity('worker', w.uid)}>
      <div className="relative">
        <PersonImg picture={w.picture} size={28} />
        {w.summary.total_segments > 0 && (
          <span className="rounded-full" style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, background: ratingColor(rating), border: '1px solid var(--bg-primary)' }} data-tooltip={`Avg form: ${rating}%`} />
        )}
      </div>
      <span className="text-xxs text-primary text-center truncate w-full mt-1">{w.name}</span>
    </div>
  )
}

export function RosterFormModule({ data, tier }: ModuleRenderProps<RosterForm>) {
  const { navigateToEntity } = useApp()
  const [sortKey, setSortKey] = useState<SortKey>('avg')
  const [search, setSearch] = useState('')

  const workers = useMemo(() => data?.workers || [], [data])
  const withHistory = useMemo(() => workers.filter(w => w.summary.total_segments > 0), [workers])

  const filtered = useMemo(() => {
    const list = search.trim() ? workers.filter(w => w.name.toLowerCase().includes(search.toLowerCase())) : workers
    return sortWorkers(list, sortKey)
  }, [workers, search, sortKey])

  if (workers.length === 0) return <div className="loading p-5 text-center text-muted">No roster data</div>

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full overflow-auto p-1 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase px-1">Form ({withHistory.length}/{workers.length})</div>
        <div className="flex flex-row flex-wrap gap-1">
          {sortWorkers(workers, 'avg').map(w => <WorkerDot key={w.uid} w={w} navigateToEntity={navigateToEntity} />)}
        </div>
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1px">
        <div className="text-xxs text-bold text-muted text-uppercase px-1 mb-1">Form Guide</div>
        {sortWorkers(workers, 'avg').map(w => (
          <div key={w.uid} className="items-center gap-2 p-1 bg-secondary rounded border-default cursor-pointer" onClick={() => navigateToEntity('worker', w.uid)}>
            <PersonImg picture={w.picture} size={22} />
            <span className="text-xs text-primary flex-1 truncate">{w.name}</span>
            <span className="text-xs text-bold text-mono" style={{ color: ratingColor(w.summary.avg_rating) }}>{w.summary.total_segments > 0 ? `${w.summary.avg_rating}%` : '—'}</span>
          </div>
        ))}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1px">
        <div className="text-xs text-bold text-muted text-uppercase px-1 mb-1">Form Guide ({workers.length})</div>
        {sortWorkers(workers, 'avg').map(w => (
          <div key={w.uid} className="items-center gap-2 p-1 bg-secondary rounded border-default cursor-pointer" onClick={() => navigateToEntity('worker', w.uid)}>
            <PersonImg picture={w.picture} size={28} />
            <span className="text-xs text-primary flex-1 truncate">{w.name}</span>
            <FormMiniStrip ratings={w.recent_ratings} max={5} />
            <span className="text-xs text-secondary w-60 text-right">{w.summary.total_matches ? `${w.summary.wins}W-${w.summary.losses}L` : ''}</span>
            <span className="text-xs text-bold text-mono w-40 text-right" style={{ color: ratingColor(w.summary.avg_rating) }}>{w.summary.total_segments > 0 ? `${w.summary.avg_rating}%` : '—'}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-2">
      <div className="items-center gap-2">
        <span className="text-xs text-bold text-muted text-uppercase">Form Guide</span>
        <div className="items-center gap-1 ml-2">
          {([['avg', 'Avg'], ['best', 'Best'], ['recent', 'Latest'], ['name', 'Name']] as [SortKey, string][]).map(([k, label]) => (
            <div key={k} onClick={() => setSortKey(k)} className={`px-2 py-1 rounded-md text-xs text-semibold cursor-pointer ${sortKey === k ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>{label}</div>
          ))}
        </div>
        <input type="text" placeholder="Search roster..." value={search} onChange={e => setSearch(e.target.value)}
          className="search-input ml-auto" style={{ width: 180, height: 26, fontSize: 11, padding: '0 8px' }} />
        <span className="text-xs text-secondary">{filtered.length} of {workers.length}</span>
      </div>

      <div className="flex flex-col border-default rounded-lg overflow-hidden flex-shrink-0">
        <div className="flex bg-secondary border-default-bottom">
          <div className="data-table-cell data-header-cell" style={{ flex: 1 }}>Worker</div>
          <div className="data-table-cell data-header-cell" style={{ width: 170 }}>Recent Form</div>
          <div className="data-table-cell data-header-cell" style={{ width: 70 }}>Segments</div>
          <div className="data-table-cell data-header-cell" style={{ width: 70 }}>W-L</div>
          <div className="data-table-cell data-header-cell" style={{ width: 60 }}>Best</div>
          <div className="data-table-cell data-header-cell" style={{ width: 60 }}>Avg</div>
        </div>
        {filtered.map(w => (
          <div key={w.uid} className="flex items-center border-default-bottom cursor-pointer" style={{ padding: '5px 0' }} onClick={() => navigateToEntity('worker', w.uid)}>
            <div className="data-table-cell items-center gap-2" style={{ flex: 1 }}>
              <PersonImg picture={w.picture} size={28} />
              <span className="text-xs text-primary truncate">{w.name}</span>
            </div>
            <div className="data-table-cell" style={{ width: 170 }}><FormMiniStrip ratings={w.recent_ratings} max={10} /></div>
            <div className="data-table-cell text-xs text-secondary" style={{ width: 70 }}>{w.summary.total_segments}</div>
            <div className="data-table-cell text-xs text-mono" style={{ width: 70 }}>
              {w.summary.total_matches > 0 ? <><span className="text-green">{w.summary.wins}W</span>-<span className="text-red">{w.summary.losses}L</span></> : <span className="text-muted">—</span>}
            </div>
            <div className="data-table-cell text-xs text-bold text-mono" style={{ width: 60, color: ratingColor(w.summary.best_rating) }}>{w.summary.total_segments > 0 ? `${w.summary.best_rating}%` : '—'}</div>
            <div className="data-table-cell text-xs text-bold text-mono" style={{ width: 60, color: ratingColor(w.summary.avg_rating) }}>{w.summary.total_segments > 0 ? `${w.summary.avg_rating}%` : '—'}</div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-5 text-center text-muted text-sm">No workers match this search.</div>}
      </div>
    </div>
  )
}
