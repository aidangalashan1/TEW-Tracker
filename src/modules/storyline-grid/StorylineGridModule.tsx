import { useState, useMemo } from 'react'
import { StorylinesCrossData, UpcomingShow } from '../../api'
import { useApp } from '../../context/AppContext'
import type { ModuleRenderProps } from '../types'
import { CardEditor } from '../../components/CardEditor'
import { ratingColor, heatColor } from '../../lib/colors'
import { fmtDate } from '../../lib/dates'

const colW = 180
const showColW = 250

function SlCell({ s, sl, onEditShow }: { s: StorylinesCrossData['shows'][0]; sl: StorylinesCrossData['storylines'][0]; i: number; onEditShow: (s: UpcomingShow | null) => void }) {
  const segs = s.segments?.filter(seg => seg.storyline_uids.includes(sl.uid)) || []
  const upcomingShow: UpcomingShow | null = s.is_upcoming ? {
    type: s.type as 'tv' | 'event',
    name: s.name,
    date: s.date,
    length: 0, lengthMin: 0,
    tvUid: s.type === 'tv' ? s.show_uid : undefined,
    cardUid: s.type === 'event' ? s.show_uid : undefined,
    logo: s.logo,
  } : null
  return (
    <div className={`w-180 flex-shrink-0 px-2 py-1 border-box ${upcomingShow ? 'cursor-pointer' : ''}`}
      onClick={() => { if (upcomingShow) onEditShow(upcomingShow) }}>
      {segs.length > 0 ? segs.map(seg => (
        <div key={seg.uid} className="text-xs text-light mb-1 px-1 py-0 rounded-sm" style={{ background: seg.match_type > 0 ? 'rgba(224,64,64,0.1)' : 'rgba(234,179,8,0.1)', borderLeft: `3px solid ${seg.match_type > 0 ? '#e04040' : '#eab308'}` }}>
          <div className="flex-between">
            <span className="flex-1 truncate text-xs">{seg.log_entry}</span>
            {seg.rating > 0 && <span className="text-bold text-mono ml-1 text-xs flex-shrink-0" style={{ color: ratingColor(seg.rating) }}>{seg.rating}</span>}
          </div>
        </div>
      )) : upcomingShow ? (
        <div className="flex-center h-full min-h-32 text-dark-333 text-lg opacity-50">+</div>
      ) : null}
    </div>
  )
}

function ShowCell({ s, img }: { s: StorylinesCrossData['shows'][0]; i: number; img: (p: string) => string }) {
  const logoUrl = s.logo ? img((s.type === 'tv' || s.is_tv) ? 'TV/' + s.logo : 'Events/' + s.logo) : ''
  return (
    <div className="items-center gap-2 px-2 py-2 w-250 flex-shrink-0 border-box">
      {logoUrl ? <img src={logoUrl} alt="" className="w-24 h-24 object-contain rounded-xs flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} /> : <div className="w-24 h-24 rounded-xs bg-dark-muted flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-semibold text-primary truncate">{s.name}</div>
        <div className="text-xs text-secondary">{fmtDate(s.date)}{!s.is_upcoming && s.overall_rating ? ` · ${s.overall_rating}` : ''}</div>
      </div>
      {s.is_upcoming && <div className="w-6 h-6 rounded-full bg-green flex-shrink-0" />}
    </div>
  )
}

export function StorylineGridModule({ data, tier }: ModuleRenderProps<StorylinesCrossData>) {
  const { img, navigateToEntity, focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const storylines = data?.storylines || []
  const shows = useMemo(() => data?.shows || [], [data])
  const [showFilter, setShowFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [editingShow, setEditingShow] = useState<UpcomingShow | null>(null)

  const filteredShows = useMemo(() => {
    if (showFilter === 'upcoming') return shows.filter(s => s.is_upcoming)
    if (showFilter === 'past') return shows.filter(s => !s.is_upcoming)
    return shows
  }, [shows, showFilter])

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full p-2 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase mb-1">Storyline Grid</div>
        <div className="text-xs text-primary font-bold">{storylines.length} storylines</div>
        <div className="text-xs text-secondary">{shows.length} shows</div>
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase mb-1">Storylines</div>
        {storylines.map(sl => (
          <div key={sl.uid} className="flex items-center gap-2 p-1 bg-secondary rounded border-default text-xs text-primary">
            <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: sl.heat >= 80 ? '#60a5fa' : sl.heat >= 60 ? '#a855f7' : sl.heat >= 40 ? '#22c55e' : '#f59e0b' }} />
            <span className="flex-1 truncate">{sl.name}</span>
            <span className="text-xxs text-muted">{shows.filter(s => s.segments?.some(seg => seg.storyline_uids.includes(sl.uid))).length} shows</span>
          </div>
        ))}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-2">
        <div className="text-xs text-bold text-muted text-uppercase mb-1">Storylines × Shows</div>
        {storylines.map(sl => (
          <div key={sl.uid} className="bg-secondary rounded-lg border-default p-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: sl.heat >= 80 ? '#60a5fa' : sl.heat >= 60 ? '#a855f7' : sl.heat >= 40 ? '#22c55e' : '#f59e0b' }} />
              <span className="text-sm text-bold text-primary truncate">{sl.name}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {shows.filter(s => s.segments?.some(seg => seg.storyline_uids.includes(sl.uid))).slice(0, 8).map(s => (
                <span key={s.uid} className="text-xxs px-1 py-0 rounded-xs bg-dark-muted text-secondary truncate" style={{ maxWidth: 100 }}>{s.name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!data) return <div className="loading p-5 text-center text-muted">Loading...</div>
  if (storylines.length === 0) return <div className="loading p-5 text-center text-muted">No active storylines</div>

  return (
    <div className="flex flex-col h-full">
      <div className="items-center gap-1 px-3 py-1 flex-shrink-0 border-default-bottom">
        {(['all', 'upcoming', 'past'] as const).map(t => (
          <div key={t} onClick={() => setShowFilter(t)}
            className={`px-2 py-0 rounded-md text-xs text-semibold cursor-pointer ${showFilter === t ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
            {t === 'all' ? 'All' : t === 'upcoming' ? 'Upcoming' : 'Past'}
          </div>
        ))}
        <span className="text-xs text-secondary ml-auto">{storylines.length} storylines · {filteredShows.length} shows</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: showColW + storylines.length * colW }}>
          <div className="flex border-default-bottom bg-darker sticky top-0 z-2">
            <div className="w-250 flex-shrink-0 px-3 py-2 text-xs text-bold text-secondary text-uppercase">Shows</div>
            {storylines.map(sl => (
              <div key={sl.uid} className="w-180 flex-shrink-0 px-2 py-2 border-default-left">
                <div className="items-center gap-1 mb-1">
                  <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: heatColor(sl.heat) }} />
                  <span className="text-xs text-semibold text-primary truncate">{sl.name}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {sl.workers.slice(0, 5).map(w => {
                    const portrait = w.picture ? img('People/' + w.picture) : ''
                    return (
                      <div key={w.uid} onClick={(e) => { e.stopPropagation(); navigateToEntity('worker', w.uid) }} className="cursor-pointer relative" title={w.name}>
                        {portrait ? <img src={portrait} alt="" className="w-20 h-20 object-cover rounded-full" onError={e => (e.target as HTMLImageElement).style.display = 'none'} /> : <div className="w-20 h-20 rounded-full bg-dark-muted" />}
                        {w.major && <div className="absolute top-neg-2 right-neg-2 w-6 h-6 rounded-full bg-warning" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {filteredShows.map((s, i) => (
            <div key={s.uid} className={`flex border-bottom-row ${i % 2 === 0 ? 'bg-blue-alpha-3' : ''}`}>
              <ShowCell s={s} i={i} img={img} />
              {storylines.map(sl => (
                <SlCell key={sl.uid} s={s} sl={sl} i={i} onEditShow={setEditingShow} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {editingShow && fed && (
        <CardEditor show={editingShow} fedUid={fed.uid} onClose={() => setEditingShow(null)} />
      )}
    </div>
  )
}
