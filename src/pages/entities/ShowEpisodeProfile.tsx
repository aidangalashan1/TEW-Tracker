import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../context/AppContext'
import { api } from '../../api'
import useSWR from '../../hooks/useApi'
import { CardEditor } from '../../components/CardEditor'
import plusIcon from '../../assets/UI icons/plus.png'
import closeIcon from '../../assets/UI icons/close.png'

function fmtDate(d: string): string {
  if (!d) return '?'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d.split(' ')[0] || '?'
  const day = dt.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const suffix = day >= 11 && day <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]
  return `${day}${suffix} ${months[dt.getMonth()]} ${dt.getFullYear()}`
}

export function ShowEpisodeProfile({ entityId }: { entityId: string }) {
  const { img, navigateToEntity, focusedFed, playerFed } = useApp()
  const workerById = (uid: number) => workers.find(w => w.uid === uid)
  const fed = focusedFed || playerFed
  const [tvUid, showDate] = (entityId || '').split('@')
  const [tvShow, setTvShow] = useState<any>(null)
  const [card, setCard] = useState<any>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [compact, setCompact] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [workers, setWorkers] = useState<any[]>([])
  useEffect(() => {
    if (fed) api.roster.list(fed.uid).then(r => setWorkers(r.workers || [])).catch(() => {})
  }, [fed?.uid])

  useEffect(() => {
    if (tvUid) {
      api.schedule.tvDetail(parseInt(tvUid, 10)).then(setTvShow).catch(() => {})
    }
  }, [tvUid])

  useEffect(() => {
    if (tvUid && showDate) {
      api.cards.getByShow('tv', parseInt(tvUid, 10), showDate).then(setCard).catch(() => {})
    }
  }, [tvUid, showDate])

  const { data: showHistory } = useSWR(fed?.uid ? 'past-shows-' + fed.uid : null, () => api.show_history.list(fed!.uid, 100))
  const pastEpisodes = useMemo(() => {
    if (!showHistory?.shows || !tvShow?.name) return []
    const matched = showHistory.shows
      .filter((s: any) => s.name === tvShow.name && s.date < (showDate || ''))
      .sort((a: any, b: any) => b.date.localeCompare(a.date))
    return matched.slice(0, 3)
  }, [showHistory, tvShow?.name, showDate])

  if (!tvShow) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  const logoUrl = tvShow.logo ? img('TV/' + tvShow.logo) : ''

  return (
    <div style={{ padding: 20, overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px' }}>
        {logoUrl && <img src={logoUrl} alt="" style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLElement).style.display = 'none' }} />}
        <div style={{ flex: 1, alignSelf: 'flex-start' }}>
          <div style={{ fontSize: 15, color: '#fff', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700 }}>{fmtDate(showDate)}</div>
            <div>{tvShow.lengthMin}min{tvShow.bShow ? ' · B-Show' : ''}</div>
          </div>
        </div>
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

      <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Planned Segments</div>
          <button className="manage-view-btn" style={{ fontSize: 11, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }} onClick={() => setShowEditor(true)}>
            <img src={plusIcon} alt="" style={{ width: 10, height: 10 }} /> Add Segment
          </button>
        </div>
        {card?.segments && card.segments.length > 0 ? (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {card.segments.map((seg: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 4, marginBottom: 2 }}>
                <div draggable
                  onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move' }}
                  onDragEnd={() => setDragIdx(null)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragIdx == null || dragIdx === i) return
                    const next = [...card.segments]
                    const [moved] = next.splice(dragIdx, 1)
                    next.splice(i, 0, moved)
                    const updated = next.map((s: any, idx: number) => ({ ...s, order: idx }))
                    api.cards.update(card.id, { segments: updated }).then(() => setCard({ ...card, segments: updated })).catch(() => {})
                    setDragIdx(null)
                  }}
                  style={{ width: 16, cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12, userSelect: 'none', flexShrink: 0, opacity: dragIdx === i ? 0.4 : undefined }}
                  title="Drag to reorder">⠿</div>
                <div style={{ flex: 1, fontSize: 12, padding: compact ? '0' : '8px 4px', borderRadius: 4, color: '#fff', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined, cursor: 'pointer' }} onClick={() => setShowEditor(true)}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 6, marginBottom: 6, border: '1px solid var(--border-color)', textAlign: compact ? 'left' : 'center' }}>
                  <span style={{ flex: 1 }}>
                    {seg.type === 'match' && seg.sides ? (() => {
                      const parts = seg.sides.map((side: number[]) => side.map((uid: number) => workerById(uid)?.name || `#${uid}`).join(' & '))
                      return parts.join(' vs. ')
                    })() : seg.type === 'battle-royal' ? (() => {
                      const names = seg.workers.map((uid: number) => workerById(uid)?.name || `#${uid}`)
                      return `Battle Royal: ${names.join(', ')}`
                    })() : seg.description || 'Angle'}
                  </span>
                  {seg.notes && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{seg.notes}</span>}
                  <span style={{ cursor: 'pointer', flexShrink: 0, marginLeft: 6, display: 'flex', alignItems: 'center', width: 14, height: 14, backgroundColor: '#fff', mask: `url(${closeIcon}) center/contain no-repeat`, WebkitMask: `url(${closeIcon}) center/contain no-repeat`, userSelect: 'none' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(i) }} ></span>
                </div>
                {!compact && seg.sides && seg.sides.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                    {seg.sides.map((side: number[], si: number) => (
                      <span key={si} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {si > 0 && seg.type !== 'angle' && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>vs.</span>}
                        {side.map((uid: number) => {
                          const w = workerById(uid)
                          const pic = w ? (w.contract?.picture || w.picture) : ''
                          const url = pic ? img('People/' + pic) : ''
                          return (
                            <span key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 11, color: '#fff' }}>
                              {url ? <img src={url} alt="" style={{ width: 75, height: 75, objectFit: 'cover', borderRadius: 6 }}
                                onError={(e) => (e.target as HTMLElement).style.display = 'none'} /> : <div style={{ width: 75, height: 75, background: 'var(--bg-tertiary)', borderRadius: 6 }} />}
                              <span>{w?.name || `#${uid}`}</span>
                            </span>
                          )
                        })}
                      </span>
                    ))}
                  </div>
                )}
                {!compact && seg.type === 'angle' && seg.workers && seg.workers.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', fontSize: 11, color: '#fff', marginTop: 4 }}>
                    {seg.workers.map((uid: number) => {
                      const w = workerById(uid)
                      const pic = w ? (w.contract?.picture || w.picture) : ''
                      const url = pic ? img('People/' + pic) : ''
                      return (
                        <span key={uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          {url ? <img src={url} alt="" style={{ width: 75, height: 75, objectFit: 'cover', borderRadius: 6 }}
                            onError={(e) => (e.target as HTMLElement).style.display = 'none'} /> : <div style={{ width: 75, height: 75, background: 'var(--bg-tertiary)', borderRadius: 6 }} />}
                          <span>{w?.name || `#${uid}`}</span>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No segments planned yet</div>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Previous Episodes</div>
        {pastEpisodes.length > 0 ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {pastEpisodes.map((ep: any) => (
              <div key={ep.uid} style={{ flex: 1, background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                  {fmtDate(ep.date)}
                  {ep.overall_rating > 0 && <span style={{ background: ep.overall_rating > 79 ? '#60a5fa' : ep.overall_rating > 69 ? '#22c55e' : ep.overall_rating > 59 ? '#f59e0b' : ep.overall_rating > 39 ? '#f97316' : ep.overall_rating > 19 ? '#ef4444' : '#6b7280', color: '#fff', borderRadius: 3, padding: '0 4px', fontWeight: 700, fontSize: 10, lineHeight: '16px', marginLeft: 6, display: 'inline-block' }}>{ep.overall_rating}</span>}
                </div>
                {ep.matches && [...ep.matches].reverse().map((m: any) => (
                  <div key={m.uid} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ flex: 1, fontSize: 10, fontWeight: 400 }}>{m.log_entry || m.label || 'No description'}</span>
                    {m.rating > 0 && <span style={{ background: m.rating > 79 ? '#60a5fa' : m.rating > 69 ? '#22c55e' : m.rating > 59 ? '#f59e0b' : m.rating > 39 ? '#f97316' : m.rating > 19 ? '#ef4444' : '#6b7280', color: '#fff', borderRadius: 3, padding: '0 4px', fontWeight: 700, fontSize: 10, lineHeight: '16px', flexShrink: 0 }}>{m.rating}</span>}
                  </div>
                ))}
                {(!ep.matches || ep.matches.length === 0) && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No segments</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No previous episodes</div>
        )}
      </div>
      </div>
      {showEditor && fed && createPortal(
        <CardEditor
          show={{ type: 'tv' as const, tvUid: parseInt(tvUid, 10), date: showDate, name: tvShow.name, length: tvShow.length, lengthMin: tvShow.lengthMin, logo: tvShow.logo || '' }}
          fedUid={fed.uid}
          onClose={() => { setShowEditor(false); api.cards.getByShow('tv', parseInt(tvUid, 10), showDate).then(setCard).catch(() => {}) }}
        />,
        document.body
      )}
      {confirmDelete != null && createPortal(
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Remove Segment</span>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>
                <img src={closeIcon} alt="" className="w-14 h-14 filter-icon-gray" />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
              Are you sure you want to remove this segment?
            </div>
            <div className="flex-between border-default-top p-3" style={{ padding: '8px 12px' }}>
              <button className="manage-view-btn text-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={() => {
                const idx = confirmDelete!
                const updated = card.segments.filter((_: any, i2: number) => i2 !== idx).map((s: any, i2: number) => ({ ...s, order: i2 }))
                api.cards.update(card.id, { segments: updated }).then(() => setCard({ ...card, segments: updated })).catch(() => {})
                setConfirmDelete(null)
              }}>Remove</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
