import { useMemo } from 'react'
import { useApp } from '../../../context/AppContext'
import { api, type PastShow } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { fmtDateOrdinal as fmtDate } from '../../../lib/dates'
import { ratingColor } from '../../../lib/colors'

export function ShowHistoryTab() {
  const { focusedFed, playerFed, navigateToEntity, img } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  // Same key as ShowEpisodeProfile.tsx's identical api.show_history.list call
  // — shares one cache entry instead of two.
  const { data, isLoading } = useSWR(fedUid != null ? 'past-shows-' + fedUid : null, () => api.show_history.list(fedUid!, 100))

  const grouped = useMemo(() => {
    const shows: PastShow[] = data?.shows ?? []
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
  }, [data])

  if (isLoading) return <div className="loading" style={{ padding: 24 }}>Loading show history...</div>

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
                {show.overall_rating > 0 && <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-family)', background: ratingColor(show.overall_rating), color: '#fff', borderRadius: 4, padding: '2px 8px' }}>{Math.round(show.overall_rating)}</span>}

              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
