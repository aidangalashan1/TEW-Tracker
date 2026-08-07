import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../../context/AppContext'
import { api, type UpcomingShow, type PastShow, type ShowCard, type CardSegment, type PlannedStoryline, type StorylineCol } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { CardEditor } from '../../../components/CardEditor'
import { fmtDateOrdinal as fmtDate } from '../../../lib/dates'

function cardKey(showType: string, showUid: number, showDate: string) {
  return `${showType}-${showUid}-${showDate}`
}

type Column =
  | { kind: 'real'; key: string; uid: number; name: string; workers: number[] }
  | { kind: 'planned'; key: string; id: string; name: string; workers: number[] }

type Row =
  | { kind: 'past'; date: string; show: PastShow }
  | { kind: 'upcoming'; date: string; show: UpcomingShow }

/** Cross-table of every storyline — both real (save-file, game-tracked) and
 *  user-authored planned ones — as columns against shows as rows. A "beat"
 *  is a segment added from a cell, auto-linked to both the storyline and the
 *  show (it's a real segment on that show's card) without leaving this
 *  table to set either up by hand. */
export function BeatsPlannerTab() {
  const { focusedFed, playerFed, navigateToEntity, img } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  const [showPast, setShowPast] = useState(false)

  const { data: scheduleData, isLoading: scheduleLoading } = useSWR(fedUid != null ? 'schedule-' + fedUid : null, () => api.schedule.list(fedUid!))
  const { data: historyData, isLoading: historyLoading } = useSWR(fedUid != null ? 'past-shows-' + fedUid : null, () => api.show_history.list(fedUid!, 100))
  const { data: crossData, isLoading: crossLoading } = useSWR(fedUid != null ? 'storylines-cross-' + fedUid : null, () => api.storylines.cross(fedUid!))
  const { data: plannedData, isLoading: plannedLoading, mutate: mutatePlanned } = useSWR('planned-storylines', () => api.plannedStorylines.list())
  const { data: cardsList } = useSWR(fedUid != null ? 'cards-list-' + fedUid : null, () => api.cards.list(fedUid!))
  const { data: rosterData } = useSWR(fedUid != null ? 'roster-' + fedUid : null, () => api.roster.list(fedUid!))

  const workers: any[] = rosterData?.workers ?? []
  const workerById = (uid: number) => workers.find(w => w.uid === uid)

  const upcomingShows: UpcomingShow[] = useMemo(() => scheduleData?.upcoming ?? [], [scheduleData])
  const pastShows: PastShow[] = useMemo(() => historyData?.shows ?? [], [historyData])

  // The list endpoint already embeds each past show's matches, but the
  // per-show detail endpoint (what PastShowProfile itself reads) is the
  // proven-correct source — fetched here too and preferred once it resolves,
  // same fix as SegmentsTab's identical list-vs-detail discrepancy.
  const [pastDetails, setPastDetails] = useState<Record<number, PastShow>>({})
  useEffect(() => {
    if (!showPast) return
    for (const show of pastShows) {
      if (!pastDetails[show.uid]) {
        api.show_history.detail(show.uid).then(full => setPastDetails(prev => ({ ...prev, [show.uid]: full }))).catch(() => {})
      }
    }
    // pastDetails read only as a fetch-once cache guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPast, pastShows])
  const matchesFor = (show: PastShow) => pastDetails[show.uid]?.matches ?? show.matches ?? []

  // Real storylines: only the currently-active ones (same "Active Storylines"
  // definition StorylinesTab's own list uses) — a dead storyline has nothing
  // left to plan beats for. Planned storylines: every non-archived one.
  const columns: Column[] = useMemo(() => {
    const real: Column[] = ((crossData?.storylines ?? []) as StorylineCol[])
      .filter(sl => sl.furthered || sl.heat >= 1)
      .map(sl => ({ kind: 'real', key: 'real-' + sl.uid, uid: sl.uid, name: sl.name, workers: sl.workers.map(w => w.uid) }))
    const planned: Column[] = ((plannedData?.storylines ?? []) as PlannedStoryline[])
      .filter(sl => !sl.archived)
      .map(sl => ({ kind: 'planned', key: 'planned-' + sl.id, id: sl.id, name: sl.name, workers: sl.workers }))
    return [...real, ...planned]
  }, [crossData, plannedData])

  // Past matches for the currently-displayed (ongoing) storylines only —
  // clamped to start at the earliest such match rather than dragging in the
  // fed's entire show history, most of which predates every current column.
  const pastRows: Row[] = useMemo(() => {
    if (!showPast || columns.length === 0) return []
    let earliest: string | null = null
    for (const show of pastShows) {
      for (const match of matchesFor(show)) {
        if (!columns.some(col => match.competitors.some(c => col.workers.includes(c.worker_uid)))) continue
        if (earliest === null || show.date < earliest) earliest = show.date
      }
    }
    if (earliest === null) return []
    return pastShows.filter(s => s.date >= earliest!).map(show => ({ kind: 'past' as const, date: show.date, show }))
    // matchesFor reads pastDetails (a state fetch-once cache guard, same
    // pattern as SegmentsTab) — re-deriving on every pastDetails update is
    // the point, so a match that resolves after the initial render still
    // gets picked up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPast, columns, pastShows, pastDetails])

  const rows: Row[] = useMemo(() => {
    const upcoming: Row[] = upcomingShows.map(show => ({ kind: 'upcoming', date: show.date, show }))
    return [...pastRows, ...upcoming].sort((a, b) => a.date.localeCompare(b.date))
  }, [pastRows, upcomingShows])

  const [cardsByKey, setCardsByKey] = useState<Record<string, ShowCard>>({})
  useEffect(() => {
    if (!cardsList?.cards) return
    for (const card of cardsList.cards) {
      const key = cardKey(card.showType, card.showUid, card.showDate)
      if (card.segmentCount > 0 && !cardsByKey[key]) {
        api.cards.get(card.id).then(full => setCardsByKey(prev => ({ ...prev, [key]: full }))).catch(() => {})
      }
    }
    // cardsByKey read only as a fetch-once cache guard — same pattern as
    // StorylineProfile/SegmentsTab's identical effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsList])

  const segmentText = (seg: CardSegment) => {
    if (seg.type === 'match' && seg.sides?.length) {
      return seg.sides.map(side => side.map(uid => workerById(uid)?.name || `#${uid}`).join(' & ')).join(' vs. ')
    }
    if (seg.type === 'battle-royal' && seg.workers?.length) {
      return `Battle Royal: ${seg.workers.map(uid => workerById(uid)?.name || `#${uid}`).join(', ')}`
    }
    return seg.description || 'Angle'
  }

  // A real storyline has no numeric-id segment field (CardEditor's own
  // picker only ever set the free-text `storyline` name for these) — matched
  // by that same name, excluding anything a planned storyline already claimed
  // via linked_planned_storyline_id so the two column kinds can never
  // double-count a segment that happens to share a display name.
  const segmentsForColumn = (card: ShowCard | undefined, col: Column): CardSegment[] => {
    if (!card) return []
    if (col.kind === 'planned') return card.segments.filter(seg => seg.linked_planned_storyline_id === col.id)
    return card.segments.filter(seg => seg.storyline === col.name && !seg.linked_planned_storyline_id)
  }

  // "+ Add Beat" opens the real segment editor (pre-filled with the
  // storyline's workers and pre-linked to it) instead of silently creating
  // a blank "Angle" segment behind the scenes — the booker still chooses the
  // segment type, description, and everything else themselves.
  const [editorCell, setEditorCell] = useState<{ show: UpcomingShow; col: Column } | null>(null)

  const refreshCardAfterEdit = (show: UpcomingShow) => {
    const isTV = show.type === 'tv'
    const showUid = (isTV ? show.tvUid : show.cardUid) ?? 0
    const key = cardKey(show.type, showUid, show.date)
    api.cards.getByShow(show.type, showUid, show.date).then(card => {
      if (card) setCardsByKey(prev => ({ ...prev, [key]: card }))
    }).catch(() => {})
  }

  if (scheduleLoading || crossLoading || plannedLoading || (showPast && historyLoading)) return <div className="loading" style={{ padding: 24 }}>Loading beats planner...</div>

  if (columns.length === 0) return <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active or planned storylines yet — start one to plan beats for it.</div>

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <label className="flex items-center gap-2 cursor-pointer mb-2" style={{ fontSize: 12, userSelect: 'none', flexShrink: 0 }}
        onClick={() => setShowPast(p => !p)}>
        <div className={`toggle-track ${showPast ? 'active' : ''}`}><div className="toggle-thumb" /></div>
        <span>Show past shows</span>
      </label>
      {showPast && pastRows.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>No past shows found featuring any of the storylines above.</div>
      )}
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming shows scheduled.</div>
      ) : (
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 6 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, top: 0, background: 'var(--bg-primary)', zIndex: 2, minWidth: 150 }} />
                {columns.map(col => (
                  <th key={col.key}
                    style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1, fontSize: 12, fontWeight: 700, color: '#fff', textAlign: 'left', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', minWidth: 220, maxWidth: 220 }}
                    onClick={() => navigateToEntity(col.kind === 'real' ? 'storyline' : 'plannedstoryline', col.kind === 'real' ? col.uid : col.id)} title={col.name}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const isPast = row.kind === 'past'
                const show = row.show
                const isTV = isPast ? (show as PastShow).is_tv : (show as UpcomingShow).type === 'tv'
                const showUid = isPast ? (show as PastShow).uid : ((isTV ? (show as UpcomingShow).tvUid : (show as UpcomingShow).cardUid) ?? 0)
                const key = isPast ? '' : cardKey((show as UpcomingShow).type, showUid, row.date)
                const card = isPast ? undefined : cardsByKey[key]
                const showEntityType = isPast ? 'pastshow' : (isTV ? 'tvepisode' : 'event')
                const showEntityId = isPast ? showUid : (isTV ? `${showUid}@${row.date}` : showUid)
                const logo = show.logo
                const folder = isTV ? 'TV/' : 'Events/'
                return (
                  <tr key={`${row.kind}-${showUid}-${ri}`}>
                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1, verticalAlign: 'top', padding: '6px 10px' }}>
                      <div className="flex items-center gap-2 cursor-pointer" style={{ whiteSpace: 'nowrap' }}
                        onClick={() => navigateToEntity(showEntityType, showEntityId)}>
                        {logo ? <img src={img(folder + logo)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
                          onError={(e) => ((e.target as HTMLElement).style.display = 'none')} /> : <div className="si-avatar" />}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{show.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(row.date)}</div>
                        </div>
                      </div>
                    </td>
                    {columns.map(col => {
                      const segs = isPast
                        ? matchesFor(show as PastShow).filter(m => m.competitors.some(c => col.workers.includes(c.worker_uid)))
                        : segmentsForColumn(card, col)
                      return (
                        <td key={col.key} style={{ verticalAlign: 'top', background: 'var(--bg-secondary)', borderRadius: 6, padding: 6, minWidth: 220, maxWidth: 220 }}>
                          {isPast
                            ? (segs as { uid: number; log_entry: string }[]).map(m => (
                              <div key={m.uid} style={{ fontSize: 11, color: '#fff', background: 'var(--bg-tertiary)', borderRadius: 4, padding: '3px 6px', marginBottom: 3, cursor: 'pointer' }}
                                onClick={() => navigateToEntity(showEntityType, showEntityId)}>
                                {m.log_entry || 'No description'}
                              </div>
                            ))
                            : (segs as CardSegment[]).map((seg, si) => (
                              <div key={si} style={{ fontSize: 11, color: '#fff', background: 'var(--bg-tertiary)', borderRadius: 4, padding: '3px 6px', marginBottom: 3, cursor: 'pointer' }}
                                onClick={() => navigateToEntity(showEntityType, showEntityId)}>
                                {segmentText(seg)}
                              </div>
                            ))}
                          {!isPast && (
                            <button className="manage-view-btn" style={{ fontSize: 10, padding: '2px 6px' }}
                              onClick={() => setEditorCell({ show: show as UpcomingShow, col })}>
                              + Add Beat
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {editorCell && fedUid != null && createPortal(
        <CardEditor
          show={editorCell.show} fedUid={fedUid}
          initialWorkers={editorCell.col.workers}
          initialStorylineLink={{ name: editorCell.col.name, plannedStorylineId: editorCell.col.kind === 'planned' ? editorCell.col.id : null }}
          onClose={() => {
            refreshCardAfterEdit(editorCell.show)
            if (editorCell.col.kind === 'planned') mutatePlanned()
            setEditorCell(null)
          }}
        />,
        document.body,
      )}
    </div>
  )
}
