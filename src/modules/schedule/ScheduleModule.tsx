import { useState, useMemo } from 'react'
import { UpcomingShow, ScheduleData } from '../../api'
import { useApp } from '../../context/AppContext'
import type { ModuleRenderProps } from '../types'
import { CardEditor } from '../../components/CardEditor'
import { fmtShortDate, isToday, isThisWeek } from '../../lib/dates'

const SHOW_INTENT_LABELS: Record<number, string> = {
  1: 'Normal', 2: 'Lesser', 3: 'Tour', 4: 'Throwaway',
}

function ShowCard({ s, img, onClick }: { s: UpcomingShow; img: (p: string) => string; onClick: () => void }) {
  const logoUrl = s.logo ? img(`${s.type === 'tv' ? 'TV' : 'Events'}/${s.logo}`) : ''
  const booked = s.cardUid != null && s.cardUid > 0
  return (
    <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border-default cursor-pointer" onClick={onClick}>
      <div className={`w-4px h-36 rounded-xs flex-shrink-0 ${s.type === 'event' ? (s.finale ? 'bg-warning' : `bg-${s.showIntent === 1 ? 'blue-400' : s.showIntent === 2 ? 'green' : s.showIntent === 3 ? 'purple-500' : 'text-muted'}`) : 'bg-text-muted'}`} />
      {logoUrl ? (
        <img src={logoUrl} alt="" className="w-36 h-36 object-contain rounded-sm flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      ) : (
        <div className="w-36 h-36 bg-darker rounded-sm flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-base text-semibold text-primary truncate">{s.name}</div>
        <div className="text-xs text-secondary mt-1">
          {fmtShortDate(s.date)}{s.dayLabel ? ` · ${s.dayLabel}` : ''} · {s.lengthMin} min
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`w-8 h-8 rounded-full ${booked ? 'bg-green' : 'bg-dark-muted'}`} title={booked ? 'Booked' : 'No card'} />
        {s.type === 'event' && (
          <span className={`text-xs text-bold px-2 py-0 rounded-sm ${s.finale ? 'bg-warning text-dark-333' : 'bg-dark-muted text-secondary'}`}>
            {s.finale ? 'Finale' : SHOW_INTENT_LABELS[s.showIntent || 1]}
          </span>
        )}
        {s.type === 'tv' && (
          <span className="text-xs text-bold px-2 py-0 rounded-sm bg-dark-muted text-secondary">TV</span>
        )}
      </div>
    </div>
  )
}

export function ScheduleModule({ data, tier }: ModuleRenderProps<ScheduleData>) {
  const { focusedFed, playerFed, img } = useApp()
  const fed = focusedFed || playerFed
  const [editingShow, setEditingShow] = useState<UpcomingShow | null>(null)

  const upcoming = useMemo(() => {
    if (!data?.currentDate || !data?.upcoming) return []
    return data.upcoming.filter(s => s.date >= data.currentDate)
  }, [data])

  const todayStr = upcoming.length > 0 ? upcoming[0].date : ''

  if (tier === 'card' && upcoming.length > 0) {
    const s = upcoming[0]
    return (
      <div className="flex flex-col h-full p-3 justify-center" onClick={() => setEditingShow(s)}>
        <div className="text-xxs text-bold text-muted text-uppercase mb-2">Next Show</div>
        <ShowCard s={s} img={img} onClick={() => {}} />
        {editingShow && fed && <CardEditor show={editingShow} fedUid={fed.uid} onClose={() => setEditingShow(null)} />}
      </div>
    )
  }

  if (tier === 'small' && upcoming.length > 0) {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-2">
        {upcoming.map(s => (
          <ShowCard key={s.date + s.name} s={s} img={img} onClick={() => setEditingShow(s)} />
        ))}
        {editingShow && fed && <CardEditor show={editingShow} fedUid={fed.uid} onClose={() => setEditingShow(null)} />}
      </div>
    )
  }

  if (tier === 'medium') {
    if (!data || upcoming.length === 0) return <div className="text-muted p-3">No upcoming shows</div>
    const grouped: { label: string; shows: UpcomingShow[] }[] = []
    let currentGroup: { label: string; shows: UpcomingShow[] } | null = null
    for (const s of upcoming) {
      let label: string
      if (isToday(s.date, todayStr)) label = 'Today'
      else if (isThisWeek(s.date, todayStr)) label = 'This Week'
      else {
        const dt = new Date(s.date + 'T00:00:00')
        label = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, shows: [] }
        grouped.push(currentGroup)
      }
      currentGroup.shows.push(s)
    }
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-3">
        {grouped.map(g => (
          <div key={g.label} className="flex flex-col gap-1">
            <div className="text-xs text-bold text-secondary text-uppercase px-1">{g.label}</div>
            {g.shows.map(s => (
              <ShowCard key={s.date + s.name} s={s} img={img} onClick={() => setEditingShow(s)} />
            ))}
          </div>
        ))}
        {editingShow && fed && <CardEditor show={editingShow} fedUid={fed.uid} onClose={() => setEditingShow(null)} />}
      </div>
    )
  }

  if (!data || upcoming.length === 0) return <div className="text-muted p-3">No upcoming shows</div>

  const grouped: { label: string; shows: UpcomingShow[] }[] = []
  let currentGroup: { label: string; shows: UpcomingShow[] } | null = null
  for (const s of upcoming) {
    let label: string
    if (isToday(s.date, todayStr)) label = 'Today'
    else if (isThisWeek(s.date, todayStr)) label = 'This Week'
    else {
      const dt = new Date(s.date + 'T00:00:00')
      label = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, shows: [] }
      grouped.push(currentGroup)
    }
    currentGroup.shows.push(s)
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-3">
      {grouped.map(g => (
        <div key={g.label} className="flex flex-col gap-2">
          <div className="text-xs text-bold text-secondary text-uppercase px-1">{g.label}</div>
          {g.shows.map(s => (
            <ShowCard key={s.date + s.name} s={s} img={img} onClick={() => setEditingShow(s)} />
          ))}
        </div>
      ))}
      {editingShow && fed && <CardEditor show={editingShow} fedUid={fed.uid} onClose={() => setEditingShow(null)} />}
    </div>
  )
}
