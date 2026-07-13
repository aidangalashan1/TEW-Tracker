import { useState, useMemo } from 'react'
import useSWR from '../../../hooks/useApi'
import { api } from '../../../api'
import type { FormSegment } from '../../../api'
import { useApp } from '../../../context/AppContext'
import { ratingColor } from '../../../lib/colors'
import { fmtShortDate } from '../../../lib/dates'
import { PersonImg } from '../../../components/PersonImg'
import { RatingBadge } from './RatingBadge'
import { SectionCard } from './SectionCard'

type FilterType = 'all' | 'matches' | 'angles'
type SortKey = 'date' | 'rating'

function FormDot({ seg }: { seg: FormSegment }) {
  const co = [...seg.allies, ...seg.opponents].map(p => p.name).join(seg.allies.length ? ' & ' : ', ')
  const tip = `${fmtShortDate(seg.date)} · ${seg.label} · ${seg.rating}%${co ? ' · ' + co : ''}${seg.is_angle ? '' : seg.won ? ' · Win' : seg.lost ? ' · Loss' : ''}`
  return <div className="flex-shrink-0 rounded-xs" style={{ width: 20, height: 20, background: ratingColor(seg.rating) }} data-tooltip={tip} />
}

function StatTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary rounded-lg border-default p-3 flex-1 min-w-130 flex flex-col gap-1">
      <div className="section-label">{label}</div>
      {children}
    </div>
  )
}

export function FormTab({ workerUid }: { workerUid: number }) {
  const { navigateToEntity } = useApp()
  const { data, error, isLoading } = useSWR('worker-form-' + workerUid, () => api.roster.form(workerUid))
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [fedFilter, setFedFilter] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const segments = useMemo(() => data?.segments || [], [data])
  const summary = data?.summary

  const feds = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of segments) map.set(s.fed_uid, s.fed_name)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [segments])

  const filtered = useMemo(() => {
    let list = segments
    if (filterType === 'matches') list = list.filter(s => !s.is_angle)
    else if (filterType === 'angles') list = list.filter(s => s.is_angle)
    if (fedFilter !== 'all') list = list.filter(s => s.fed_uid === fedFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => [...s.allies, ...s.opponents].some(p => p.name.toLowerCase().includes(q)))
    }
    const sorted = [...list].sort((a, b) => {
      const av = sortKey === 'date' ? a.date : a.rating
      const bv = sortKey === 'date' ? b.date : b.rating
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [segments, filterType, fedFilter, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }
  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

  if (isLoading && !data) return <div className="loading p-5 text-center">Loading...</div>
  if (error) return <div className="p-5 text-center text-muted">Failed to load performance history</div>

  return (
    <div className="flex-1 overflow-auto flex flex-col px-5 pb-5 gap-3">
      <div className="flex gap-3 flex-wrap pt-3">
        <StatTile label="Overall">
          <div className="items-center gap-2">
            <RatingBadge val={summary?.avg_rating ?? 0} />
            <span className="text-xs text-secondary">avg across {summary?.total_segments ?? 0} segments</span>
          </div>
        </StatTile>
        <StatTile label="Matches">
          <div className="items-center gap-2">
            <RatingBadge val={summary?.avg_match_rating ?? 0} />
            <span className="text-xs text-secondary">{summary?.total_matches ?? 0} total</span>
            {summary && (summary.wins > 0 || summary.losses > 0) && (
              <span className="text-xs text-mono ml-auto"><span className="text-green">{summary.wins}W</span>-<span className="text-red">{summary.losses}L</span></span>
            )}
          </div>
        </StatTile>
        <StatTile label="Angles">
          <div className="items-center gap-2">
            <RatingBadge val={summary?.avg_angle_rating ?? 0} />
            <span className="text-xs text-secondary">{summary?.total_angles ?? 0} total</span>
          </div>
        </StatTile>
        <StatTile label="Best / Worst">
          <div className="items-center gap-2">
            <span className="text-sm text-bold text-mono" style={{ color: ratingColor(summary?.best_rating ?? 0) }}>{summary?.best_rating ?? 0}%</span>
            <span className="text-xs text-muted">/</span>
            <span className="text-sm text-bold text-mono" style={{ color: ratingColor(summary?.worst_rating ?? 0) }}>{summary?.worst_rating ?? 0}%</span>
          </div>
        </StatTile>
        {!!summary?.title_matches && (
          <StatTile label="Title Matches">
            <div className="text-lg text-bold text-primary">{summary.title_matches}</div>
          </StatTile>
        )}
      </div>

      <SectionCard header="Recent Form">
        {segments.length === 0 ? (
          <div className="text-sm text-muted">No match or angle history recorded yet.</div>
        ) : (
          <div className="flex gap-1 flex-wrap">
            {segments.slice(0, 30).map(s => <FormDot key={s.match_log_uid} seg={s} />)}
          </div>
        )}
      </SectionCard>

      {segments.length > 0 && (
        <>
          <div className="items-center gap-2">
            {(['all', 'matches', 'angles'] as FilterType[]).map(t => (
              <div key={t} onClick={() => setFilterType(t)}
                className={`px-2 py-1 rounded-md text-xs text-semibold cursor-pointer ${filterType === t ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
                {t === 'all' ? 'All' : t === 'matches' ? 'Matches' : 'Angles'}
              </div>
            ))}
            {feds.length > 1 && (
              <select value={fedFilter} onChange={e => setFedFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="filter-select" style={{ width: 170 }}>
                <option value="all">All Promotions</option>
                {feds.map(([uid, name]) => <option key={uid} value={uid}>{name}</option>)}
              </select>
            )}
            <input type="text" placeholder="Search opponent..." value={search} onChange={e => setSearch(e.target.value)}
              className="search-input ml-auto" style={{ width: 160, height: 26, fontSize: 11, padding: '0 8px' }} />
            <span className="text-xs text-secondary">{filtered.length} of {segments.length}</span>
          </div>

          <div className="flex flex-col border-default rounded-lg overflow-hidden flex-shrink-0">
            <div className="flex bg-secondary border-default-bottom">
              <div className="data-table-cell data-header-cell cursor-pointer" style={{ width: 90 }} onClick={() => toggleSort('date')}>Date{sortArrow('date')}</div>
              <div className="data-table-cell data-header-cell" style={{ width: 150 }}>Promotion</div>
              <div className="data-table-cell data-header-cell" style={{ width: 90 }}>Type</div>
              <div className="data-table-cell data-header-cell" style={{ flex: 1 }}>Opponent(s)</div>
              <div className="data-table-cell data-header-cell cursor-pointer" style={{ width: 70 }} onClick={() => toggleSort('rating')}>Rating{sortArrow('rating')}</div>
              <div className="data-table-cell data-header-cell" style={{ width: 44 }}>W/L</div>
            </div>
            {filtered.map(s => (
              <div key={s.match_log_uid} className="flex items-center border-default-bottom" style={{ padding: '5px 0' }} data-tooltip={s.log_entry || undefined}>
                <div className="data-table-cell text-xs text-secondary" style={{ width: 90 }}>{fmtShortDate(s.date)}</div>
                <div className="data-table-cell text-xs text-secondary truncate" style={{ width: 150 }}>{s.fed_name}</div>
                <div className="data-table-cell items-center gap-1" style={{ width: 90 }}>
                  <span className="text-xs">{s.label}</span>
                  {s.is_title_match && <span className="text-xxs text-bold px-1 py-0 rounded-xs bg-warning text-dark-333">Title</span>}
                </div>
                <div className="data-table-cell items-center gap-2 flex-wrap" style={{ flex: 1 }}>
                  {s.allies.map(p => (
                    <span key={p.uid} className="items-center gap-1 cursor-pointer" onClick={() => navigateToEntity('worker', p.uid)} data-tooltip="Ally">
                      <PersonImg picture={p.picture} size={20} /><span className="text-xs text-secondary">{p.name}</span>
                    </span>
                  ))}
                  {s.opponents.map(p => (
                    <span key={p.uid} className="items-center gap-1 cursor-pointer" onClick={() => navigateToEntity('worker', p.uid)}>
                      <PersonImg picture={p.picture} size={20} /><span className="text-xs text-secondary">{p.name}</span>
                    </span>
                  ))}
                  {s.allies.length === 0 && s.opponents.length === 0 && <span className="text-xs text-muted">—</span>}
                </div>
                <div className="data-table-cell text-xs text-bold text-mono" style={{ width: 70, color: ratingColor(s.rating) }}>{s.rating}%</div>
                <div className="data-table-cell text-xs text-bold" style={{ width: 44 }}>
                  {s.is_angle ? <span className="text-muted">—</span> : s.won ? <span className="text-green">W</span> : s.lost ? <span className="text-red">L</span> : <span className="text-muted">—</span>}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div className="p-5 text-center text-muted text-sm">No segments match these filters.</div>}
          </div>
        </>
      )}
    </div>
  )
}
