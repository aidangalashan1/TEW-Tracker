import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { api } from '../../api'

function fmtDate(d: string): string {
  if (!d) return '?'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d.split(' ')[0] || '?'
  const day = dt.getDate()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const suffix = day >= 11 && day <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]
  return `${day}${suffix} ${months[dt.getMonth()]} ${dt.getFullYear()}`
}

export function ShowProfile({ showUid, showType }: { showUid: number; showType: 'tv' | 'event' }) {
  const { img } = useApp()
  const fetchFn = showType === 'tv' ? api.schedule.tvDetail : api.schedule.eventDetail
  const { data: show, error } = useSWR(`${showType}-show-${showUid}`, () => fetchFn(showUid))

  if (error) return <div className="loading" style={{ color: 'var(--accent)' }}>Error loading show</div>
  if (!show) return <div className="loading">Loading...</div>

  return (
    <div style={{ padding: 20, overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px' }}>
        {show.logo && <img src={img('TV/' + show.logo)} alt="" style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLElement).style.display = 'none' }} />}
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{show.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {show.type === 'tv' ? `${show.dayLabel} · ${show.lengthMin}min${show.bShow ? ' · B-Show' : ''}` : `Event · ${show.lengthMin}min${show.importance ? ` · ${['Open', 'Low', 'Medium', 'High', 'Major'][show.importance - 1]}` : ''}`}
          </div>
          {show.nextDate && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Next: {fmtDate(show.nextDate)}</div>}
        </div>
      </div>

      {show.pastEpisodes && show.pastEpisodes.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Past Episodes ({show.pastEpisodes.length})
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {show.pastEpisodes.slice(0, 20).map((ep: any, i: number) => (
              <div key={ep.uid} style={{ fontSize: 12, padding: '3px 4px', borderRadius: 4, color: '#fff', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
                {fmtDate(ep.date)}
                {ep.rating > 0 && <span style={{ color: 'var(--text-muted)' }}> · {Math.round(ep.rating / 10)}</span>}
                {ep.tv_rating > 0 && <span style={{ color: 'var(--text-muted)' }}> · TV: {Math.round(ep.tv_rating / 10)}</span>}
                {ep.attendance > 0 && <span style={{ color: 'var(--text-muted)' }}> · {ep.attendance} att.</span>}
                {ep.sellout && <span style={{ color: '#22c55e', fontWeight: 600 }}> SELLOUT</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {(!show.pastEpisodes || show.pastEpisodes.length === 0) && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No past episodes found</div>
      )}
    </div>
  )
}
