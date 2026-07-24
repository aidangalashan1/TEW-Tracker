import { useState } from 'react'
import { useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { api } from '../../api'
import { ratingColor } from '../../lib/colors'

function fmtDate(d: string): string {
  if (!d) return '?'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d.split(' ')[0] || '?'
  const day = dt.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const suffix = day >= 11 && day <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]
  return `${day}${suffix} ${months[dt.getMonth()]} ${dt.getFullYear()}`
}

export function PastShowProfile({ pastCardUid }: { pastCardUid: number }) {
  const { img } = useApp()
  const { data: show, error } = useSWR('past-show-' + pastCardUid, () => api.show_history.detail(pastCardUid))
  const { data: fedBelts } = useSWR(show?.fed_uid ? 'fed-belts-' + show.fed_uid : null, () => api.fed.belts(show!.fed_uid))
  const { data: beltHistory } = useSWR(show?.fed_uid ? 'belt-history-' + show.fed_uid : null, () => api.fed.beltHistory(show!.fed_uid))
  const beltMap = useMemo(() => {
    const m = new Map<number, { name: string; picture: string }>()
    if (fedBelts?.belts) {
      for (const b of fedBelts.belts) m.set(b.uid, { name: b.name, picture: b.picture })
    }
    return m
  }, [fedBelts])
  const titleChangeSet = useMemo(() => {
    const s = new Set<number>()
    if (beltHistory?.history && show?.date) {
      const showDate = show.date.substring(0, 10)
      for (const group of beltHistory.history) {
        if (!group.entries) continue
        for (const entry of group.entries) {
          const cap = entry.captured || ''
          const m = cap.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
          if (m) {
            const norm = `${m[3]}-${m[2]}-${m[1]}`
            if (norm === showDate) s.add(group.belt_uid)
          }
        }
      }
    }
    return s
  }, [beltHistory, show?.date])

  const [compact, setCompact] = useState(false)
  const [expandedSegs, setExpandedSegs] = useState<Set<number>>(new Set())

  if (error) return <div className="loading" style={{ color: 'var(--accent)' }}>Error loading show</div>
  if (!show) return <div className="loading">Loading...</div>

  return (
    <div style={{ padding: 20, overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px' }}>
        {show.logo && <img src={img((show.is_tv ? 'TV/' : 'Events/') + show.logo)} alt="" style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLElement).style.display = 'none' }} />}
        <div style={{ flex: 1, alignSelf: 'flex-start' }}>
          <div style={{ fontSize: 15, color: '#fff', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700 }}>{fmtDate(show.date)}</div>
            <div>{show.is_tv ? 'TV' : 'Event'}</div>
            {show.attendance > 0 && <div>{show.attendance.toLocaleString()} attendance</div>}
            {show.viewers > 0 && <div>Viewers: {show.viewers.toLocaleString()}</div>}
          </div>
        </div>
        {show.overall_rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: ratingColor(show.overall_rating), color: '#fff', borderRadius: 6, width: 150, height: 150, flexShrink: 0 }}>
            <span style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-family)' }}>{show.overall_rating}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end mb-2">
        <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, userSelect: 'none' }}
          onClick={() => setCompact(p => !p)}>
          <div className={`toggle-track ${compact ? 'active' : ''}`}>
            <div className="toggle-thumb" />
          </div>
          <span>Compact mode</span>
        </label>
      </div>

      {show.matches && show.matches.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Segments ({show.matches.length})
          </div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {[...show.matches].reverse().map((m: any, i: number) => (
              <div key={m.uid} style={{ fontSize: 12, padding: compact ? '0' : '8px 4px', borderRadius: 4, color: '#fff', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 6, marginBottom: 6, border: '1px solid var(--border-color)', textAlign: compact ? 'left' : 'center' }}>
                  {compact && (
                    <span style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, fontWeight: 700, userSelect: 'none', marginRight: 6 }}
                      onClick={() => setExpandedSegs(prev => { const n = new Set(prev); if (n.has(m.uid)) n.delete(m.uid); else n.add(m.uid); return n })}>
                      {expandedSegs.has(m.uid) ? '−' : '+'}
                    </span>
                  )}
                  <span style={{ flex: 1 }}>{m.log_entry || 'No description'}</span>
                  <span style={{ background: ratingColor(m.rating), color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 10, lineHeight: '16px', flexShrink: 0 }}>{m.rating}</span>
                </div>
                {(m.title1 > 0 || m.title2 > 0) && (() => {
                  const beltId = m.title1 || m.title2
                  const beltInfo = beltMap.get(beltId)
                  return (
                    <div style={{ textAlign: compact ? 'right' : 'center', marginBottom: 6, fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>
                      {beltInfo?.picture && <img src={img('Belts/' + beltInfo.picture)} alt="" style={{ width: 20, height: 16, objectFit: 'contain', verticalAlign: 'middle', marginRight: 4 }}
                        onError={(e) => (e.target as HTMLElement).style.display = 'none'} />}
                      {beltInfo?.name || 'Title Match'}
                      {(titleChangeSet.has(m.title1) || titleChangeSet.has(m.title2)) && (
                        <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginLeft: 6 }}>TITLE CHANGE</span>
                      )}
                    </div>
                  )
                })()}
                {m.competitors && m.competitors.length > 0 && (() => {
                  if (compact && !expandedSegs.has(m.uid)) {
                    return null
                  }
                  const sides = new Map<number, any[]>()
                  for (const comp of m.competitors) {
                    const arr = sides.get(comp.side) || []
                    arr.push(comp)
                    sides.set(comp.side, arr)
                  }
                  const sideGroups = [...sides.entries()].sort((a, b) => a[0] - b[0])
                  const showVs = m.match_type !== 0 && sideGroups.length > 1
                  return (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                      {sideGroups.map(([side, comps], si) => (
                        <span key={side} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {si > 0 && showVs && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', margin: '0 4px' }}>vs.</span>}
                          {comps.map((comp: any) => (
                            <span key={comp.worker_uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 11, color: '#fff' }}>
                              {comp.picture && <img src={img('People/' + comp.picture)} alt="" style={{ width: 75, height: 75, objectFit: 'cover', borderRadius: 6 }}
                                onError={(e) => (e.target as HTMLElement).style.display = 'none'} />}
                              {!comp.picture && <div style={{ width: 75, height: 75, background: 'var(--bg-tertiary)', borderRadius: 6 }} />}
                              <span>{comp.name}</span>
                              {comp.performance > 0 && <span style={{ background: ratingColor(comp.performance), color: '#fff', borderRadius: 3, padding: '0 4px', fontWeight: 700, fontSize: 10, lineHeight: '16px' }}>{comp.performance}</span>}
                            </span>
                          ))}
                        </span>
                      ))}
                    </div>
                  )
                })()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
