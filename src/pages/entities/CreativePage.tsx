import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../context/AppContext'
import { api, type PastShow } from '../../api'
import plusIcon from '../../assets/UI icons/plus.png'
import { CardEditor } from '../../components/CardEditor'

function fmtDate(d: string): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  const day = dt.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const suffix = day >= 11 && day <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]
  return `${day}${suffix} ${months[dt.getMonth()]} ${dt.getFullYear()}`
}

function ScheduleTab() {
  const { focusedFed, playerFed, navigateToEntity, img } = useApp()
  const fed = focusedFed || playerFed
  const [data, setData] = useState<any>(null)
  const [planShow, setPlanShow] = useState<any>(null)

  const fedUid = fed?.uid
  useEffect(() => {
    if (fedUid == null) return
    api.schedule.list(fedUid).then(setData).catch(() => {})
  }, [fedUid])

  const grouped = useMemo(() => {
    if (!data?.upcoming) return []
    const groups: { month: string; items: any[] }[] = []
    let currentMonth = ''
    for (const show of data.upcoming) {
      const dt = new Date(show.date)
      const monthKey = isNaN(dt.getTime()) ? show.date.substring(0, 7) : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      if (monthKey !== currentMonth) {
        currentMonth = monthKey
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const label = isNaN(dt.getTime()) ? monthKey : `${months[dt.getMonth()]} ${dt.getFullYear()}`
        groups.push({ month: label, items: [] })
      }
      groups[groups.length - 1].items.push(show)
    }
    return groups
  }, [data?.upcoming])

  if (!data) return <div className="loading" style={{ padding: 24 }}>Loading schedule...</div>

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      {grouped.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming shows scheduled</div>}
      {grouped.map(group => (
        <div key={group.month} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>{group.month}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.items.map((show, i) => {
              const isTV = show.type === 'tv'
              return (
                <div key={`${show.type}-${show.tvUid || show.cardUid}-${i}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: 'var(--bg-secondary)' }}>
                  <div style={{ fontSize: 12, color: '#fff', minWidth: 90 }}>{fmtDate(show.date)}</div>
                  <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigateToEntity(isTV ? 'tvepisode' : 'event', isTV ? `${show.tvUid}@${show.date}` : show.cardUid)}>
                    {show.logo && (() => {
                      const folder = isTV ? 'TV/' : 'Events/'
                      return <img src={img(folder + show.logo)} alt="" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 6, flexShrink: 0, cursor: 'pointer' }}
                        onClick={() => navigateToEntity(isTV ? 'tvepisode' : 'event', isTV ? `${show.tvUid}@${show.date}` : show.cardUid)}
                        onError={(e) => {
                          const t = e.target as HTMLImageElement
                          if (t.src.includes(folder)) { t.src = img('Logos/' + show.logo) }
                          else { t.style.display = 'none' }
                        }} />
                    })()}
                    {show.name}
                  </div>
                  <button className="manage-view-btn" style={{ fontSize: 11, padding: '2px 6px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }} onClick={(e) => { e.stopPropagation(); setPlanShow(show) }}>
                    <img src={plusIcon} alt="" style={{ width: 10, height: 10 }} /> Add Segment
                  </button>
                  {isTV && show.bShow && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>B</span>}

                </div>
              )
            })}
          </div>
        </div>
      ))}
      {grouped.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming shows scheduled</div>}
      {planShow && fed && createPortal(
        <CardEditor show={planShow} fedUid={fed.uid} onClose={() => setPlanShow(null)} />,
        document.body
      )}
    </div>
  )
}

function ShowHistoryTab() {
  const { focusedFed, playerFed, navigateToEntity, img } = useApp()
  const fed = focusedFed || playerFed
  const [shows, setShows] = useState<PastShow[]>([])

  const fedUid = fed?.uid
  useEffect(() => {
    if (fedUid == null) return
    api.show_history.list(fedUid, 100).then(r => setShows(r.shows)).catch(() => {})
  }, [fedUid])

  const grouped = useMemo(() => {
    const groups: { month: string; items: PastShow[] }[] = []
    let currentMonth = ''
    for (const show of shows) {
      const dt = new Date(show.date)
      const monthKey = isNaN(dt.getTime()) ? show.date.substring(0, 7) : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      if (monthKey !== currentMonth) {
        currentMonth = monthKey
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const label = isNaN(dt.getTime()) ? monthKey : `${months[dt.getMonth()]} ${dt.getFullYear()}`
        groups.push({ month: label, items: [] })
      }
      groups[groups.length - 1].items.push(show)
    }
    return groups
  }, [shows])

  if (shows.length === 0) return <div className="loading" style={{ padding: 24 }}>Loading show history...</div>

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      {grouped.map(group => (
        <div key={group.month} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>{group.month}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.items.map((show) => (
              <div key={show.uid}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: 12, color: '#fff', minWidth: 90 }}>{fmtDate(show.date)}</div>
                <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => navigateToEntity('pastshow', show.uid)}>
                  {show.logo && (() => {
                    const folder = show.is_tv ? 'TV/' : 'Events/'
                    return <img src={img(folder + show.logo)} alt="" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 6, flexShrink: 0, cursor: 'pointer' }}
                      onClick={() => navigateToEntity('pastshow', show.uid)}
                      onError={(e) => {
                        const t = e.target as HTMLImageElement
                        if (t.src.includes(folder)) { t.src = img('Logos/' + show.logo) }
                        else { t.style.display = 'none' }
                      }} />
                  })()}
                  {show.name}
                </div>
                {show.overall_rating > 0 && <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', background: show.overall_rating > 79 ? '#60a5fa' : show.overall_rating > 69 ? '#22c55e' : show.overall_rating > 59 ? '#f59e0b' : show.overall_rating > 39 ? '#f97316' : show.overall_rating > 19 ? '#ef4444' : '#6b7280', color: '#fff', borderRadius: 4, padding: '2px 8px' }}>{Math.round(show.overall_rating)}</span>}

              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StorylinesTab() {
  const { focusedFed, playerFed, img, navigateToEntity } = useApp()
  const fed = focusedFed || playerFed
  const [data, setData] = useState<any>(null)
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [ideas, setIdeas] = useState<{ feuds: any[]; alliances: any[] }>({ feuds: [], alliances: [] })
  const [roster, setRoster] = useState<any[]>([])
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null)

  const fedUid = fed?.uid
  useEffect(() => {
    if (fedUid == null) return
    api.storylines.cross(fedUid).then(setData).catch(() => {})
    api.roster.list(fedUid).then(r => setRoster(r.workers || [])).catch(() => {})
  }, [fedUid])

  const openIdeas = () => {
    setSelectedWorker(null)
    setIdeas({ feuds: [], alliances: [] })
    setIdeasOpen(true)
  }

  const fetchIdeas = (uid: number) => {
    setSelectedWorker(uid)
    if (!fed) return
    api.storylines.ideas(fed.uid, uid).then(r => setIdeas({ feuds: r.feuds || [], alliances: r.alliances || [] })).catch(() => {})
  }

  const sortedRoster = useMemo(() => {
    return [...roster].filter((w: any) => w.contract?.fed_uid === fed?.uid).sort((a: any, b: any) => {
      const pa = (a.contract as any)?.Perception ?? 99
      const pb = (b.contract as any)?.Perception ?? 99
      return pa - pb
    })
  }, [roster, fed?.uid])

  if (!data) return <div className="loading" style={{ padding: 24 }}>Loading storylines...</div>

  const renderCard = (sl: any) => (
    <div key={sl.uid} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }}
      onClick={() => navigateToEntity('storyline', sl.uid)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{sl.name}</div>
        {sl.furthered && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>FURTHERED</span>}
        {sl.heat > 0 && (
          <span style={{ background: sl.heat > 79 ? '#60a5fa' : sl.heat > 69 ? '#22c55e' : sl.heat > 59 ? '#f59e0b' : sl.heat > 39 ? '#f97316' : sl.heat > 19 ? '#ef4444' : '#6b7280', color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 11, lineHeight: '18px' }}>{sl.heat}</span>
        )}
      </div>
      {sl.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{sl.description}</div>}
      {sl.workers && sl.workers.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sl.workers.map((w: any) => (
            <span key={w.uid} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', background: w.major ? 'rgba(255,255,255,0.08)' : 'transparent', padding: '2px 6px', borderRadius: 4 }}>
              {w.picture && <img src={img('People/' + w.picture)} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }}
                onError={(e) => (e.target as HTMLElement).style.display = 'none'} />}
              {w.name}
                  {w.alignment === 0 && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>Heel</span>}
                  {w.alignment === 1 && <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 600 }}>Face</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  const active = (data.storylines || []).filter((sl: any) => sl.furthered || sl.heat >= 1)
  const past = (data.storylines || []).filter((sl: any) => !sl.furthered && sl.heat < 1)

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      <div className="flex justify-end mb-2">
        <button className="manage-view-btn" onClick={openIdeas}>Storyline Ideas</button>
      </div>
      {active.length > 0 && (
        <>
          <div className="mb-2" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6 }}>Active Storylines</div>
          {active.map(renderCard)}
        </>
      )}
      {past.length > 0 && (
        <>
          <div className="mb-2" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6, marginTop: 16 }}>Past Storylines</div>
          {past.map(renderCard)}
        </>
      )}
      {data.storylines && data.storylines.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No storylines found</div>}

      {ideasOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIdeasOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Storyline Ideas</span>
              <button className="modal-close" onClick={() => setIdeasOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: 12, maxHeight: 400, overflowY: 'auto' }}>
              {!selectedWorker ? (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Select a worker to find potential feud partners:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sortedRoster.map((w: any) => (
                      <div key={w.uid} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', color: '#fff', fontSize: 13 }}
                        onClick={() => fetchIdeas(w.uid)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        {w.picture && <img src={img('People/' + w.picture)} alt="" style={{ width: 30, height: 30, objectFit: 'cover', borderRadius: 4 }} onError={(e) => (e.target as HTMLElement).style.display = 'none'} />}
                        {w.name}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => setSelectedWorker(null)}>← Back</span> / Story ideas
                  </div>
                  {([['feud', 'Feud ideas', ideas.feuds], ['alliance', 'Alliance / tag ideas', ideas.alliances]] as const).map(([kind, label, list]) => (
                    <div key={kind} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', margin: '4px 0 6px' }}>{label}</div>
                      {list.length > 0 ? list.map((idea: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 8px', borderRadius: 4, color: '#fff', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
                          {idea.picture && <img src={img('People/' + idea.picture)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} onError={(e) => (e.target as HTMLElement).style.display = 'none'} />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{idea.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{idea.reasons?.join(', ') || (kind === 'feud' ? 'Potential rivalry' : 'Potential ally')}</div>
                          </div>
                        </div>
                      )) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No {kind} ideas for this worker.</div>}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export function CreativePage() {
  const { creativeTab } = useApp()

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {creativeTab === 'schedule' && <ScheduleTab />}
      {creativeTab === 'history' && <ShowHistoryTab />}
      {creativeTab === 'storylines' && <StorylinesTab />}
    </div>
  )
}
