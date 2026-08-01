import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'
import plusIcon from '../../../assets/UI icons/plus.png'
import { CardEditor } from '../../../components/CardEditor'
import { fmtDateOrdinal as fmtDate } from '../../../lib/dates'

export function ScheduleTab() {
  const { focusedFed, playerFed, navigateToEntity, img } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  const { data } = useSWR(fedUid != null ? 'schedule-' + fedUid : null, () => api.schedule.list(fedUid!))
  const [planShow, setPlanShow] = useState<any>(null)

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
