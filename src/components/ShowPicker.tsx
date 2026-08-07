import { useState } from 'react'
import type { UpcomingShow } from '../api'
import { fmtDateOrdinal, groupByLabel, monthLabel } from '../lib/dates'

/** Compact, searchable, month-grouped upcoming-show picker with logos —
 *  shared by every "pick a show to add a segment to" flow (Arcs' Convert to
 *  Segment, Planned Storylines' Add Segment, real Storylines' Add to Show)
 *  instead of each screen keeping its own flat, logo-less show list. */
export function UpcomingShowPicker({ shows, onPick, img }: {
  shows: UpcomingShow[]
  onPick: (s: UpcomingShow) => void
  img: (path: string) => string
}) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = shows.filter(s => !q || s.name.toLowerCase().includes(q))
  const groups = groupByLabel(filtered, s => monthLabel(s.date))

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 260, overflowY: 'auto' }}>
      <input className="search-input" placeholder="Search shows…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 4, width: '100%' }} autoFocus />
      {groups.map(g => (
        <div key={g.label}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, marginBottom: 2 }}>{g.label}</div>
          {g.items.map(s => (
            <div key={`${s.type}-${s.tvUid ?? s.cardUid}-${s.date}`} className="si-picker-row" style={{ gap: 8 }} onClick={() => onPick(s)}>
              {s.logo ? (
                <img src={img((s.type === 'tv' ? 'TV/' : 'Events/') + s.logo)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
                  onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
              ) : <div className="si-avatar" />}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDateOrdinal(s.date)}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
      {groups.length === 0 && <div className="si-empty">No shows match "{search}"</div>}
    </div>
  )
}
