import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PastShow } from '../../api'
import { useApp } from '../../context/AppContext'
import type { ModuleRenderProps } from '../types'
import closeIcon from '../../assets/UI icons/close.png'
import { ratingClass } from '../../lib/colors'
import { fmtDate, fmtShortDate, fmtNum, fmtRating, getMonthLabel } from '../../lib/dates'

function ShowDetailModal({ show, onClose }: { show: PastShow; onClose: () => void }) {
  const { img, navigateToEntity } = useApp()
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const showLogoUrl = show.logo ? img((show.is_tv ? 'TV' : 'Events') + '/' + show.logo) : ''
  const workerPortrait = (picture: string) => picture ? img('People/' + picture) : ''

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    setTimeout(() => { document.addEventListener('mousedown', handler); document.addEventListener('keydown', keyHandler) }, 0)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [onClose])

  const matches = show.matches || []
  const preShow = matches.filter(m => m.pre_show)
  const mainShow = matches.filter(m => !m.pre_show && !m.post_show)
  const postShow = matches.filter(m => m.post_show)

  return createPortal(
    <div className="fixed inset-0 z-1000 flex-center bg-overlay">
      <div ref={ref} className="bg-primary rounded-lg w-760 max-w-92vw max-h-88vh flex flex-col border-default">
        <div className="items-center gap-3 px-5 py-4 border-default-bottom flex-shrink-0">
          {showLogoUrl ? <img src={showLogoUrl} alt="" className="w-40 h-40 object-contain rounded-sm" onError={e => (e.target as HTMLElement).style.display = 'none'} /> : <div className="w-40 h-40 rounded-sm bg-darker flex-shrink-0" />}
          <div className="flex-1">
            <div className="text-xl text-bold text-primary">{show.name}</div>
            <div className="text-xs text-secondary">{fmtDate(show.date)} · {show.is_tv ? 'TV' : 'Event'}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className={`text-2xl text-bold ${ratingClass(show.overall_rating)}`}>{fmtRating(show.overall_rating)}</div>
          </div>
          <div onClick={onClose} className="w-30 h-30 rounded-full bg-dark-muted flex-center cursor-pointer flex-shrink-0 ml-2">
            <img src={closeIcon} alt="Close" className="w-14 h-14 filter-icon-gray" />
          </div>
        </div>
        <div className="px-5 py-2 flex flex-wrap gap-5 border-default-bottom text-xs text-secondary flex-shrink-0">
          {show.attendance > 0 && <span>Attendance: <b className="text-primary">{fmtNum(show.attendance)}</b></span>}
          {show.ppv_rating > 0 && <span>PPV Buy Rate: <b className={ratingClass(show.ppv_rating)}>{fmtRating(show.ppv_rating)}</b></span>}
          {show.tv_rating > 0 && <span>TV Rating: <b className={ratingClass(show.tv_rating)}>{fmtRating(show.tv_rating)}</b></span>}
          {show.viewers > 0 && <span>Viewers: <b className="text-primary">{fmtNum(show.viewers)}</b></span>}
          {show.sell_out && <span className="text-green text-semibold">SOLD OUT</span>}
        </div>
        <div className="flex-1 overflow-auto px-5 py-3 pb-5">
          {preShow.map(m => (
            <div key={m.uid} className="items-center gap-2 px-3 py-2 rounded-md text-xs opacity-55 bg-blue-alpha-3 mb-1">
              <div className={`w-4px h-22 rounded-xs flex-shrink-0 ${m.match_type > 0 ? 'bg-danger' : 'bg-warning'}`} />
              <span className={`w-40 text-right text-bold text-mono flex-shrink-0 ${ratingClass(m.rating)}`}>{fmtRating(m.rating)}</span>
              <span className="text-light flex-1">{m.log_entry}</span>
            </div>
          ))}
          {mainShow.map((m, mi) => (
            <div key={m.uid} className="mb-1">
              <div onClick={() => setExpandedMatch(expandedMatch === m.uid ? null : m.uid)}
                className={`items-center gap-2 px-3 py-2 rounded-md cursor-pointer ${expandedMatch === m.uid ? 'bg-blue-alpha-2' : mi % 2 === 0 ? 'bg-blue-alpha-3' : ''}`}>
                <div className={`w-4px h-28 rounded-xs flex-shrink-0 ${m.match_type > 0 ? 'bg-danger' : 'bg-warning'}`} />
                <span className={`w-40 text-right text-bold text-mono flex-shrink-0 ${ratingClass(m.rating)}`}>{fmtRating(m.rating)}</span>
                <span className="text-primary flex-1 text-sm">{m.log_entry}</span>
                {m.title1 > 0 && <span className="text-xs px-1 py-0 rounded-xs bg-warning text-dark-333 text-bold flex-shrink-0">Title</span>}
                {m.victor > 0 && (() => {
                  const vic = m.competitors.find(c => c.worker_uid === m.victor)
                  return vic ? <span className="text-xs text-green text-semibold flex-shrink-0 ml-1">W: {vic.name}</span> : null
                })()}
              </div>
              {expandedMatch === m.uid && m.competitors.length > 0 && (
                <div className="px-3 py-2 pb-1 pl-62 flex gap-3 justify-center flex-wrap bg-darker rounded-b-md">
                  {m.competitors.map(mc => {
                    const portraitUrl = workerPortrait(mc.picture)
                    return (
                    <div key={mc.worker_uid} onClick={() => navigateToEntity('worker', mc.worker_uid)} className="flex-col items-center gap-1 cursor-pointer min-w-60">
                      {portraitUrl ? <img src={portraitUrl} alt="" className="w-52 h-52 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div className="w-52 h-52 rounded-lg bg-darker" />}
                      <span className="text-xs text-light text-center lh-1-2">{mc.name}</span>
                      {mc.performance > 0 && <span className={`text-xs text-bold text-mono ${ratingClass(mc.performance)}`}>{mc.performance}</span>}
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {postShow.map(m => (
            <div key={m.uid} className="items-center gap-2 px-3 py-2 rounded-md text-xs opacity-55 bg-blue-alpha-3 mb-1">
              <div className={`w-4px h-22 rounded-xs flex-shrink-0 ${m.match_type > 0 ? 'bg-danger' : 'bg-warning'}`} />
              <span className={`w-40 text-right text-bold text-mono flex-shrink-0 ${ratingClass(m.rating)}`}>{fmtRating(m.rating)}</span>
              <span className="text-light flex-1">{m.log_entry}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function ShowHistoryModule({ data, tier }: ModuleRenderProps<{shows: PastShow[]; count: number}>) {
  const { img } = useApp()
  const [showType, setShowType] = useState<'all' | 'tv' | 'event'>('all')
  const [selectedShow, setSelectedShow] = useState<PastShow | null>(null)
  const [workerSearch, setWorkerSearch] = useState('')

  const shows = useMemo(() => data?.shows || [], [data])

  const filtered = useMemo(() => {
    let list = shows
    if (showType === 'tv') list = list.filter(s => s.is_tv)
    else if (showType === 'event') list = list.filter(s => !s.is_tv)
    if (workerSearch.trim()) {
      const q = workerSearch.toLowerCase()
      list = list.filter(s => s.matches?.some(m => m.competitors?.some(c => c.name.toLowerCase().includes(q))))
    }
    return list
  }, [shows, showType, workerSearch])

  const grouped = useMemo(() => {
    const groups: { label: string; shows: PastShow[] }[] = []
    let current: { label: string; shows: PastShow[] } | null = null
    for (const s of filtered) {
      const label = getMonthLabel(s.date)
      if (!current || current.label !== label) {
        current = { label, shows: [] }
        groups.push(current)
      }
      current.shows.push(s)
    }
    return groups
  }, [filtered])

  if (tier === 'card' && shows.length > 0) {
    const s = shows[0]
    return (
      <div className="flex flex-col h-full p-3 justify-center cursor-pointer" onClick={() => setSelectedShow(s)}>
        <div className="text-xxs text-bold text-muted text-uppercase mb-2">Latest Show</div>
        <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border-default">
          <div className={`w-4px h-32 rounded-xs flex-shrink-0 ${s.is_tv ? 'bg-blue-400' : 'bg-purple-500'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-semibold text-primary truncate">{s.name}</div>
            <div className="text-xs text-secondary mt-1">{fmtShortDate(s.date)} · {s.is_tv ? 'TV' : 'Event'}</div>
          </div>
          <span className={`text-lg text-bold text-mono flex-shrink-0 ${ratingClass(s.overall_rating)}`}>{s.overall_rating}</span>
        </div>
        {selectedShow && <ShowDetailModal show={selectedShow} onClose={() => setSelectedShow(null)} />}
      </div>
    )
  }

  if (tier === 'small' && shows.length > 0) {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-2">
        {shows.map(s => (
          <div key={s.uid} onClick={() => setSelectedShow(s)} className="flex items-center gap-3 p-2 bg-secondary rounded-lg border-default cursor-pointer">
            <div className={`w-4px h-28 rounded-xs flex-shrink-0 ${s.is_tv ? 'bg-blue-400' : 'bg-purple-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-semibold text-primary truncate">{s.name}</div>
              <div className="text-xxs text-secondary mt-1">{fmtShortDate(s.date)} · {s.matches.length} seg</div>
            </div>
            <span className={`text-xs text-bold text-mono flex-shrink-0 ${ratingClass(s.overall_rating)}`}>{s.overall_rating}</span>
          </div>
        ))}
        {selectedShow && <ShowDetailModal show={selectedShow} onClose={() => setSelectedShow(null)} />}
      </div>
    )
  }

  if (tier === 'medium') {
    if (shows.length === 0) return <div className="loading p-3">No past shows found</div>
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-3">
        <div className="flex items-center gap-1 flex-shrink-0">
          {(['all', 'tv', 'event'] as const).map(t => (
            <div key={t} onClick={() => setShowType(t)}
              className={`px-2 py-0 rounded-md text-xs text-semibold cursor-pointer ${showType === t ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
              {t === 'all' ? 'All' : t === 'tv' ? 'TV' : 'Events'}
            </div>
          ))}
          <input type="text" placeholder="Search wrestler..." value={workerSearch}
            onChange={e => setWorkerSearch(e.target.value)}
            className="search-input ml-auto" style={{ width: 120, height: 22, fontSize: 11, padding: '0 6px' }} />
          <span className="text-xs text-secondary ml-1">{filtered.length} show{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        {grouped.map(g => (
          <div key={g.label} className="flex flex-col gap-1">
            <div className="text-xs text-bold text-secondary text-uppercase px-1">{g.label}</div>
            {g.shows.map(s => {
              const logoUrl = s.logo ? (s.is_tv ? 'TV' : 'Events') + '/' + s.logo : ''
              return (
                <div key={s.uid} onClick={() => setSelectedShow(s)} className="flex items-center gap-3 p-2 bg-secondary rounded-lg border-default cursor-pointer">
                  <div className={`w-4px h-32 rounded-xs flex-shrink-0 ${s.is_tv ? 'bg-blue-400' : 'bg-purple-500'}`} />
                  {logoUrl ? <img src={img(logoUrl)} alt="" className="w-28 h-28 object-contain rounded-sm flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div className="w-28 h-28 bg-darker rounded-sm flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-semibold text-primary">{s.name}</div>
                    <div className="text-xxs text-secondary mt-1">{fmtShortDate(s.date)} · {s.matches.length} seg</div>
                  </div>
                  <span className={`text-sm text-bold text-mono flex-shrink-0 ${ratingClass(s.overall_rating)}`}>{fmtRating(s.overall_rating)}</span>
                  <span className={`text-xxs text-bold px-1 py-0 rounded-sm text-white ${s.is_tv ? 'bg-tv' : s.highlights ? 'bg-event' : 'bg-event-light'}`}>{s.is_tv ? 'TV' : 'Event'}</span>
                </div>
              )
            })}
          </div>
        ))}
        {selectedShow && <ShowDetailModal show={selectedShow} onClose={() => setSelectedShow(null)} />}
      </div>
    )
  }

  if (shows.length === 0) return <div className="loading p-3">No past shows found</div>

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-3">
      <div className="flex items-center gap-1 flex-shrink-0">
        {(['all', 'tv', 'event'] as const).map(t => (
          <div key={t} onClick={() => setShowType(t)}
            className={`px-2 py-0 rounded-md text-xs text-semibold cursor-pointer ${showType === t ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
            {t === 'all' ? 'All' : t === 'tv' ? 'TV' : 'Events'}
          </div>
        ))}
        <input type="text" placeholder="Search wrestler..." value={workerSearch}
          onChange={e => setWorkerSearch(e.target.value)}
          className="search-input ml-auto" style={{ width: 150, height: 22, fontSize: 11, padding: '0 6px' }} />
        <span className="text-xs text-secondary ml-1">{filtered.length} show{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {grouped.map(g => (
        <div key={g.label} className="flex flex-col gap-2">
          <div className="text-xs text-bold text-secondary text-uppercase px-1">{g.label}</div>
          {g.shows.map(s => {
            const logoUrl = s.logo ? (s.is_tv ? 'TV' : 'Events') + '/' + s.logo : ''
            return (
              <div key={s.uid} onClick={() => setSelectedShow(s)} className="flex items-center gap-3 p-3 bg-secondary rounded-lg border-default cursor-pointer">
                <div className={`w-4px h-36 rounded-xs flex-shrink-0 ${s.is_tv ? 'bg-blue-400' : 'bg-purple-500'}`} />
                {logoUrl ? (
                  <img src={img(logoUrl)} alt="" className="w-36 h-36 object-contain rounded-sm flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div className="w-36 h-36 bg-darker rounded-sm flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-base text-semibold text-primary">{s.name}</div>
                  <div className="text-xs text-secondary mt-1">
                    {fmtShortDate(s.date)} · {s.matches.length} segment{s.matches.length !== 1 ? 's' : ''}{s.attendance > 0 ? ` · ${fmtNum(s.attendance)} att.` : ''}
                  </div>
                </div>
                <span className={`text-lg text-bold text-mono flex-shrink-0 ${ratingClass(s.overall_rating)}`}>{fmtRating(s.overall_rating)}</span>
                <span className={`text-xs text-bold px-2 py-0 rounded-sm text-white ${s.is_tv ? 'bg-tv' : s.highlights ? 'bg-event' : 'bg-event-light'}`}>
                  {s.is_tv ? 'TV' : 'Event'}
                </span>
              </div>
            )
          })}
        </div>
      ))}

      {selectedShow && <ShowDetailModal show={selectedShow} onClose={() => setSelectedShow(null)} />}
    </div>
  )
}
