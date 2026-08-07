import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useApp } from '../../../context/AppContext'
import { api, type PastShow, type PastShowMatch, type UpcomingShow, type ShowCard } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { fmtDateOrdinal as fmtDate, groupByLabel, monthLabel } from '../../../lib/dates'
import { ratingColor } from '../../../lib/colors'
import { formatRatingPct } from '../../../lib/grade'

/** One-line segment pill matching the entity pages' segment-row visual
 *  language (dark rounded row, bold text, rating badge) — just without the
 *  big worker-photo grids underneath, since this page is meant to be a
 *  concise scan across every show rather than a single show's full detail. */
function SegmentLine({ text, rating }: { text: string; rating?: number }) {
  const { ratingFormat } = useApp()
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', marginBottom: 3 }}>
      <span style={{ flex: 1 }}>{text}</span>
      {rating != null && rating > 0 && <span style={{ background: ratingColor(rating), color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 10, lineHeight: '16px', flexShrink: 0, marginLeft: 6 }}>{formatRatingPct(rating, ratingFormat)}</span>}
    </div>
  )
}

type Item = { kind: 'past'; date: string; show: PastShow } | { kind: 'upcoming'; date: string; show: UpcomingShow }

export function SegmentsTab() {
  const { focusedFed, playerFed, navigateToEntity, img, ratingFormat } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid

  // Same cache keys as ShowHistoryTab/ScheduleTab/StorylineProfile's own
  // fetches for this fed — one request shared across every tab that needs it.
  const { data: historyData, isLoading: historyLoading } = useSWR(fedUid != null ? 'past-shows-' + fedUid : null, () => api.show_history.list(fedUid!, 100))
  const { data: scheduleData, isLoading: scheduleLoading } = useSWR(fedUid != null ? 'schedule-' + fedUid : null, () => api.schedule.list(fedUid!))
  const { data: rosterData } = useSWR(fedUid != null ? 'roster-' + fedUid : null, () => api.roster.list(fedUid!))
  const { data: cardsList } = useSWR(fedUid != null ? 'cards-list-' + fedUid : null, () => api.cards.list(fedUid!))

  const workers: any[] = rosterData?.workers ?? []
  const workerById = (uid: number) => workers.find(w => w.uid === uid)

  const pastShows: PastShow[] = useMemo(() => historyData?.shows ?? [], [historyData])
  const upcomingShows: UpcomingShow[] = useMemo(() => scheduleData?.upcoming ?? [], [scheduleData])

  // The list endpoint already embeds each past show's matches, but the
  // per-show detail endpoint (what PastShowProfile itself reads) is the
  // proven-correct source — fetched here too and preferred once it resolves,
  // so a list-vs-detail discrepancy can never show "No segments" for a show
  // that actually has some.
  const [pastDetails, setPastDetails] = useState<Record<number, PastShow>>({})
  useEffect(() => {
    for (const show of pastShows) {
      if (!pastDetails[show.uid]) {
        api.show_history.detail(show.uid).then(full => setPastDetails(prev => ({ ...prev, [show.uid]: full }))).catch(() => {})
      }
    }
    // pastDetails read only as a fetch-once cache guard — same pattern as
    // StorylineProfile's identical effect for cardDetails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastShows])
  const matchesFor = (show: PastShow): PastShowMatch[] => pastDetails[show.uid]?.matches ?? show.matches ?? []

  const [cardDetails, setCardDetails] = useState<Record<string, ShowCard>>({})
  useEffect(() => {
    if (!cardsList?.cards) return
    for (const card of cardsList.cards) {
      if (card.segmentCount > 0 && !cardDetails[card.id]) {
        api.cards.get(card.id).then(full => setCardDetails(prev => ({ ...prev, [card.id]: full }))).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsList])

  const cardByShow = useMemo(() => {
    const m = new Map<string, ShowCard>()
    for (const card of Object.values(cardDetails)) m.set(`${card.showType}-${card.showUid}-${card.showDate}`, card)
    return m
  }, [cardDetails])

  const segmentLineText = (seg: ShowCard['segments'][number]) => {
    if (seg.type === 'match' && seg.sides?.length) {
      return seg.sides.map(side => side.map(uid => workerById(uid)?.name || `#${uid}`).join(' & ')).join(' vs. ')
    }
    if (seg.type === 'battle-royal' && seg.workers?.length) {
      return `Battle Royal: ${seg.workers.map(uid => workerById(uid)?.name || `#${uid}`).join(', ')}`
    }
    return seg.description || 'Angle'
  }

  // One continuous chronological timeline — past and upcoming shows
  // interleaved by date rather than split into two separate sections.
  const items: Item[] = useMemo(() => {
    const past: Item[] = pastShows.map(show => ({ kind: 'past', date: show.date, show }))
    const upcoming: Item[] = upcomingShows.map(show => ({ kind: 'upcoming', date: show.date, show }))
    return [...past, ...upcoming].sort((a, b) => a.date.localeCompare(b.date))
  }, [pastShows, upcomingShows])
  const groups = useMemo(() => groupByLabel(items, i => monthLabel(i.date)), [items])

  if (historyLoading || scheduleLoading) return <div className="loading" style={{ padding: 24 }}>Loading segments...</div>

  const renderShowHeader = (date: string, name: string, logo: string | undefined, folder: string, onClick: () => void, rating?: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      {logo && <img src={img(folder + logo)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
        onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onClick}>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(date)}</div>
      </div>
      {rating != null && rating > 0 && <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-family)', background: ratingColor(rating), color: '#fff', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>{formatRatingPct(Math.round(rating), ratingFormat)}</span>}
    </div>
  )

  // One card per show, laid out as a grid so a month's row of cards
  // stretches to fill the page width evenly (a fixed-width flex-wrap left a
  // ragged, mostly-empty last column on anything wider than a few cards).
  // auto-fit (not auto-fill) so a month with fewer shows than fit in a row
  // collapses the empty trailing columns instead of reserving blank space
  // for them — the actual cards then stretch to fill the row themselves.
  const rowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }
  const cardStyle: CSSProperties = { background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', minWidth: 0 }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      {groups.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No shows found</div>}
      {groups.map(group => (
        <div key={group.label} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{group.label}</div>
          <div style={rowStyle}>
            {group.items.map((item, i) => {
              if (item.kind === 'past') {
                const show = item.show
                const matches = matchesFor(show)
                return (
                  <div key={`p-${show.uid}`} style={cardStyle}>
                    {renderShowHeader(show.date, show.name, show.logo, show.is_tv ? 'TV/' : 'Events/',
                      () => navigateToEntity('pastshow', show.uid), show.overall_rating)}
                    {matches.length > 0
                      ? [...matches].reverse().map(m => <SegmentLine key={m.uid} text={m.log_entry || 'No description'} rating={m.rating} />)
                      : <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>No segments</div>}
                  </div>
                )
              }
              const show = item.show
              const isTV = show.type === 'tv'
              const card = cardByShow.get(`${show.type}-${isTV ? show.tvUid : show.cardUid}-${show.date}`)
              const segments = [...(card?.segments ?? [])].sort((a, b) => a.order - b.order)
              return (
                <div key={`u-${show.type}-${show.tvUid ?? show.cardUid}-${i}`} style={cardStyle}>
                  {renderShowHeader(show.date, show.name, show.logo, isTV ? 'TV/' : 'Events/',
                    () => navigateToEntity(isTV ? 'tvepisode' : 'event', isTV ? `${show.tvUid}@${show.date}` : (show.cardUid as number)))}
                  {segments.length > 0
                    ? segments.map((seg, si) => <SegmentLine key={si} text={segmentLineText(seg)} />)
                    : <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2 }}>No segments planned yet</div>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
