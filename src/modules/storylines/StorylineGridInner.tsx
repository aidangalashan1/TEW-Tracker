import { useState, useMemo, useEffect, useRef } from 'react'
import { StorylinesCrossData, UpcomingShow, PlannedStoryline } from '../../api'
import { useApp } from '../../context/AppContext'
import { ratingClass, heatClass } from '../../lib/colors'
import { fmtDate } from '../../lib/dates'
import { CardEditor } from '../../components/CardEditor'
import { api } from '../../api'

const colW = 180
const showColW = 250

function ShowCell({ s }: { s: StorylinesCrossData['shows'][0]; i: number }) {
  const { img } = useApp()
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

export function StorylineGridInner({ planned }: {
  planned: PlannedStoryline[];
}) {
  const { img, navigateToEntity, focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const [crossData, setCrossData] = useState<StorylinesCrossData | null>(null)
  const [showFilter, setShowFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [editingShow, setEditingShow] = useState<UpcomingShow | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fed) return
    api.storylines.cross(fed.uid).then(setCrossData).catch(() => {})
  }, [fed])

  const storylines = useMemo(() => {
    const game = (crossData?.storylines || []).map(sl => ({ ...sl, is_planned: false }))
    const plannedCols = planned.map(p => ({
      uid: `planned-${p.id}` as any,
      name: p.name,
      heat: 0,
      description: p.notes || '',
      furthered: false,
      workers: (p.workers || []).map((wuid: number) => ({
        uid: wuid, name: '', picture: '', major: false, alignment: 0,
      })),
      is_planned: true,
    }))
    return [...game, ...plannedCols]
  }, [crossData, planned])
  const shows = useMemo(() => crossData?.shows || [], [crossData])

  const filteredShows = useMemo(() => {
    if (showFilter === 'upcoming') return shows.filter(s => s.is_upcoming)
    if (showFilter === 'past') return shows.filter(s => !s.is_upcoming)
    return shows
  }, [shows, showFilter])

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.style.minWidth = `${showColW + storylines.length * colW}px`
    }
  }, [storylines.length])

  if (!crossData) return <div className="loading p-3">Loading...</div>
  if (storylines.length === 0) return <div className="loading p-3">No active storylines</div>

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
        <div ref={gridRef} className="min-w-0">
          {/* Header row */}
          <div className="flex border-default-bottom bg-darker sticky top-0 z-2">
            <div className="w-250 flex-shrink-0 px-3 py-2 text-xs text-bold text-secondary text-uppercase">Shows</div>
            {storylines.map(sl => (
              <div key={sl.uid} className="w-180 flex-shrink-0 px-2 py-2 border-default-left">
                <div className="items-center gap-1 mb-1">
                  <div className={`w-6 h-6 rounded-full ${heatClass(sl.heat)} flex-shrink-0`} />
                  <span className="text-xs text-semibold text-primary truncate">{sl.name}</span>
                  {(sl as any).is_planned && <span className="text-xs text-bold px-0 py-0 rounded-xs bg-purple text-white flex-shrink-0">Planned</span>}
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

          {/* Data rows */}
          {filteredShows.map((s, i) => (
            <div key={s.uid} className={`flex border-bottom-row ${i % 2 === 0 ? 'bg-blue-alpha-4' : ''}`}>
              <ShowCell s={s} i={i} />
              {storylines.map(sl => {
                const segs = s.segments?.filter(seg => seg.storyline_uids.includes(sl.uid)) || []
                const upcomingShow: UpcomingShow | null = s.is_upcoming ? {
                  type: s.type as 'tv' | 'event',
                  name: s.name, date: s.date,
                  length: 0, lengthMin: 0,
                  tvUid: s.type === 'tv' ? s.show_uid : undefined,
                  cardUid: s.type === 'event' ? s.show_uid : undefined,
                  logo: s.logo,
                } : null
                return (
                  <div key={sl.uid} className={`w-180 flex-shrink-0 px-2 py-1 border-box ${upcomingShow ? 'cursor-pointer' : ''}`}
                    onClick={() => { if (upcomingShow) setEditingShow(upcomingShow) }}>
                    {segs.length > 0 ? segs.map(seg => (
                      <div key={seg.uid} className={`text-xs text-light mb-1 px-1 py-0 rounded-sm ${seg.match_type > 0 ? 'bg-match border-left-3-danger' : 'bg-angle border-left-3-warning'}`}>
                        <div className="flex-between">
                          <span className="flex-1 truncate text-xs">{seg.log_entry}</span>
                          {seg.rating > 0 && <span className={`text-bold text-mono ml-1 text-xs flex-shrink-0 ${ratingClass(seg.rating)}`}>{seg.rating}</span>}
                        </div>
                      </div>
                    )) : upcomingShow ? (
                      <div className="flex-center h-full min-h-32 text-dark-333 text-lg opacity-50">+</div>
                    ) : null}
                  </div>
                )
              })}
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
