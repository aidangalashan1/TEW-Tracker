import { useApp } from '../context/AppContext'
import { api, LinkedSegment } from '../api'
import useSWR from '../hooks/useApi'

/** Compact, clickable summary of a single linked segment — shared by
 *  ArcItemModal (arc's view of the segments it produced) and
 *  PlannedStorylineProfile (storyline's view of the segments developing it).
 *  Fetches its own card (deduped against anything else already showing that
 *  card via the shared data cache) and resolves worker names off that
 *  card's own fed roster. */
export function LinkedSegmentSummary({ link, onUnlink }: { link: LinkedSegment; onUnlink?: () => void }) {
  const { navigateToEntity } = useApp()
  const { data: card } = useSWR('card-' + link.card_id, () => api.cards.get(link.card_id))
  const { data: rosterData } = useSWR(card ? 'roster-' + card.fedUid : null, () => api.roster.list(card!.fedUid))

  if (!card) return <div className="si-empty">Loading…</div>

  const seg = card.segments.find(s => s.id === link.segment_id)
  if (!seg) return <div className="si-empty">Segment no longer exists</div>

  const workerName = (uid: number) => rosterData?.workers.find((w: any) => w.uid === uid)?.name || `#${uid}`
  const summary = seg.type === 'match'
    ? seg.sides.map(side => side.map(workerName).join(' & ') || '???').join(' vs. ')
    : seg.type === 'battle-royal'
      ? `Battle Royal: ${seg.workers.map(workerName).join(', ')}`
      : (seg.description || 'Angle')

  const navigate = () => {
    if (card.showType === 'tv') navigateToEntity('tvepisode', `${card.showUid}@${card.showDate}`)
    else navigateToEntity('event', card.showUid)
  }

  return (
    <div className="si-idea-row">
      <div className="si-idea-main" style={{ cursor: 'pointer' }} onClick={navigate}>
        <div className="si-idea-name">{card.showName} — {card.showDate}</div>
        <div className="si-chips"><span className="si-chip">{summary}</span></div>
      </div>
      {onUnlink && (
        <button className="manage-view-btn" style={{ fontSize: 10, flexShrink: 0 }} onClick={e => { e.stopPropagation(); onUnlink() }}>
          Unlink
        </button>
      )}
    </div>
  )
}
