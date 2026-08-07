import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../../context/AppContext'
import { api, ArcItem, ArcStatus, PlannedStoryline, UpcomingShow } from '../../../api'
import type { Worker, Belt } from '../../../api-types'
import useSWR from '../../../hooks/useApi'
import plusIcon from '../../../assets/UI icons/plus.png'
import { ARC_STATUS_LABELS, ARC_STATUS_COLORS } from './arcData'
import { CardEditor } from '../../../components/CardEditor'
import { LinkedSegmentSummary } from '../../../components/LinkedSegmentSummary'
import { useShortlist } from '../../../hooks/useShortlist'
import { mergeShortlistWorkers } from '../../../lib/shortlist'

const STATUSES: ArcStatus[] = ['planned', 'in_progress', 'done', 'shelved']

interface ArcItemModalProps {
  ownerWorker: Worker
  fedUid: number
  item: ArcItem
  /** True while this item was just created via "+ Add" and hasn't been
   *  confirmed yet — cancelling discards it entirely instead of just
   *  closing, so an abandoned add never leaves a blank saved item behind. */
  isNew: boolean
  onSave: (item: ArcItem) => void
  onAddSuggestedArc: (text: string, linkedWorkerUid: number) => void
  onCancel: () => void
}

export function ArcItemModal({ ownerWorker, fedUid, item, isNew, onSave, onAddSuggestedArc, onCancel }: ArcItemModalProps) {
  const { img, navigateToEntity } = useApp()
  // Every field edit stages into this local draft — nothing is persisted
  // (via onSave) until Confirm is clicked. Cancelling (the × or an
  // outside click) discards whatever's staged here.
  const [draft, setDraft] = useState<ArcItem>(item)
  const patch = (p: Partial<ArcItem>) => setDraft(d => ({ ...d, ...p }))

  const [beltSearch, setBeltSearch] = useState('')
  const [workerSearch, setWorkerSearch] = useState('')
  const [showBeltPicker, setShowBeltPicker] = useState(false)
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [showPlannedStorylinePicker, setShowPlannedStorylinePicker] = useState(false)
  const [showActiveStorylinePicker, setShowActiveStorylinePicker] = useState(false)
  const [showShowPicker, setShowShowPicker] = useState(false)
  const [editorShow, setEditorShow] = useState<UpcomingShow | null>(null)
  const [newStorylineName, setNewStorylineName] = useState('')

  const { data: beltsData } = useSWR('fed-belts-' + fedUid, () => api.fed.belts(fedUid))
  const belts: Belt[] = beltsData?.belts ?? []
  const { data: rosterData } = useSWR('roster-' + fedUid, () => api.roster.list(fedUid))
  const { data: allWorkersData } = useSWR('all-workers', () => api.roster.all(1, 99999))
  const { uids: shortlistUids } = useShortlist()
  const workers: Worker[] = useMemo(
    () => mergeShortlistWorkers(rosterData?.workers ?? [], allWorkersData?.workers ?? [], shortlistUids),
    [rosterData, allWorkersData, shortlistUids]
  )
  const { data: plannedData, mutate: mutatePlanned } = useSWR('planned-storylines', () => api.plannedStorylines.list())
  const planned: PlannedStoryline[] = useMemo(() => plannedData?.storylines ?? [], [plannedData])
  const { data: storylinesData } = useSWR('storylines-cross-' + fedUid, () => api.storylines.cross(fedUid))
  // Same "Active Storylines" definition StorylinesTab's own list and the
  // Beats Planner use — a dead storyline has nothing left to link an arc to.
  const activeStorylines = useMemo(() => (storylinesData?.storylines ?? []).filter(s => s.furthered || s.heat >= 1), [storylinesData])
  const { data: scheduleData } = useSWR('schedule-' + fedUid, () => api.schedule.list(fedUid))
  const upcomingShows = scheduleData?.upcoming ?? []
  const { data: ideasData } = useSWR('storyline-ideas-' + fedUid + '-' + ownerWorker.uid, () => api.storylines.ideas(fedUid, ownerWorker.uid))

  const linkedBelt = belts.find(b => b.uid === draft.linked_belt_uid)
  const linkedWorkers = useMemo(() => workers.filter(w => draft.linked_worker_uids.includes(w.uid)), [workers, draft.linked_worker_uids])
  // An arc can span more than one storyline (e.g. a "Bloodline" arc covering
  // several separate feuds), so both link sets are lists.
  const linkedStorylines = useMemo(() => planned.filter(s => draft.linked_planned_storyline_ids.includes(s.id)), [planned, draft.linked_planned_storyline_ids])
  const linkedActiveStorylines = useMemo(() => activeStorylines.filter(s => draft.linked_storyline_uids.includes(s.uid)), [activeStorylines, draft.linked_storyline_uids])

  const filteredBelts = beltSearch ? belts.filter(b => b.name.toLowerCase().includes(beltSearch.toLowerCase())) : belts
  const filteredWorkers = workerSearch
    ? workers.filter(w => w.uid !== ownerWorker.uid && w.name.toLowerCase().includes(workerSearch.toLowerCase()))
    : workers.filter(w => w.uid !== ownerWorker.uid)

  const toggleLinkedWorker = (uid: number) => {
    const next = draft.linked_worker_uids.includes(uid)
      ? draft.linked_worker_uids.filter(u => u !== uid)
      : [...draft.linked_worker_uids, uid]
    patch({ linked_worker_uids: next })
  }

  const toggleLinkedStoryline = (id: string) => {
    const next = draft.linked_planned_storyline_ids.includes(id)
      ? draft.linked_planned_storyline_ids.filter(i => i !== id)
      : [...draft.linked_planned_storyline_ids, id]
    patch({ linked_planned_storyline_ids: next })
  }

  const toggleLinkedActiveStoryline = (uid: number) => {
    const next = draft.linked_storyline_uids.includes(uid)
      ? draft.linked_storyline_uids.filter(u => u !== uid)
      : [...draft.linked_storyline_uids, uid]
    patch({ linked_storyline_uids: next })
  }

  const createPlannedStoryline = () => {
    const name = newStorylineName.trim() || draft.text.trim() || `${ownerWorker.name}'s Storyline`
    api.plannedStorylines.create(name).then(r => {
      api.plannedStorylines.update(r.storyline.id, { workers: draft.linked_worker_uids.length > 0 ? draft.linked_worker_uids : [ownerWorker.uid] }).finally(() => {
        mutatePlanned()
        patch({ linked_planned_storyline_ids: [...draft.linked_planned_storyline_ids, r.storyline.id] })
        setNewStorylineName('')
      })
    })
  }

  const canConfirm = !!draft.text.trim()
  const handleConfirm = () => { if (canConfirm) onSave(draft) }

  // ArcItemModal can be opened nested inside PlannedStorylineProfile's own
  // JSX (a "click a linked arc" action there) even though it portals to
  // document.body itself — React bubbles synthetic events along the
  // component tree, not the DOM tree, so an un-stopped backdrop click here
  // would also reach a parent modal's own overlay handler if one exists.
  const cancelSelf = (e: React.MouseEvent) => { e.stopPropagation(); onCancel() }

  if (editorShow) {
    return createPortal(
      <CardEditor
        show={editorShow} fedUid={fedUid} initialWorkerUid={ownerWorker.uid}
        onSegmentLinked={(cardId, segmentId) => setDraft(d => ({ ...d, linked_segments: [...d.linked_segments, { card_id: cardId, segment_id: segmentId }] }))}
        onClose={() => { setEditorShow(null); onSave(draft) }}
      />,
      document.body,
    )
  }

  return createPortal(
    <div className="modal-overlay" onClick={cancelSelf}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'New Arc / Goal' : (draft.text || 'Arc / Goal')}</span>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body" style={{ padding: 14, maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name & description */}
          <div>
            <div className="section-label mb-1">Name</div>
            <input
              className="search-input" style={{ width: '100%' }}
              value={draft.text} onChange={e => patch({ text: e.target.value })}
              autoFocus={isNew}
            />
          </div>
          <div>
            <div className="section-label mb-1">Description</div>
            <textarea
              className="search-input" style={{ width: '100%', minHeight: 64, resize: 'vertical', fontFamily: 'inherit', padding: '6px 8px' }}
              value={draft.description || ''} onChange={e => patch({ description: e.target.value })}
            />
          </div>

          {/* Status */}
          <div>
            <div className="section-label mb-1">Status</div>
            <div className="flex gap-1">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => patch({ status: s })}
                  className="flex-1"
                  style={{
                    padding: '5px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    border: `1px solid ${draft.status === s ? ARC_STATUS_COLORS[s] : 'var(--border-color)'}`,
                    background: draft.status === s ? ARC_STATUS_COLORS[s] : 'transparent',
                    color: draft.status === s ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {ARC_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Linked belt */}
          <div>
            <div className="section-label mb-1">Linked Belt</div>
            {linkedBelt ? (
              <div className="flex items-center gap-2" style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '6px 8px' }}>
                {linkedBelt.picture && <img src={img('Belts/' + linkedBelt.picture)} alt="" style={{ width: 40, height: 32, objectFit: 'contain' }} />}
                <span className="flex-1" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{linkedBelt.name}</span>
                <button className="manage-view-btn" style={{ fontSize: 11 }} onClick={() => patch({ linked_belt_uid: null })}>Unlink</button>
              </div>
            ) : (
              <button className="manage-view-btn" onClick={() => setShowBeltPicker(p => !p)}>{showBeltPicker ? 'Cancel' : '+ Link a belt'}</button>
            )}
            {showBeltPicker && (
              <div style={{ marginTop: 6, border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 180, overflowY: 'auto' }}>
                <input className="search-input" placeholder="Search belts…" value={beltSearch} onChange={e => setBeltSearch(e.target.value)} style={{ marginBottom: 4, width: '100%' }} autoFocus />
                {filteredBelts.map(b => (
                  <div key={b.uid} className="si-picker-row" onClick={() => { patch({ linked_belt_uid: b.uid }); setShowBeltPicker(false); setBeltSearch('') }}>
                    {b.picture ? <img className="si-avatar" src={img('Belts/' + b.picture)} alt="" /> : <div className="si-avatar" />}
                    <span>{b.name}</span>
                  </div>
                ))}
                {filteredBelts.length === 0 && <div className="si-empty">No belts match "{beltSearch}"</div>}
              </div>
            )}
          </div>

          {/* Linked workers */}
          <div>
            <div className="section-label mb-1">Linked Workers</div>
            {linkedWorkers.length > 0 && (
              <div className="flex flex-wrap gap-1" style={{ marginBottom: 6 }}>
                {linkedWorkers.map(w => (
                  <span key={w.uid} className="flex items-center gap-1" style={{ background: 'var(--bg-secondary)', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: 'var(--text-primary)', cursor: 'pointer' }}
                    onClick={() => navigateToEntity('worker', w.uid)}>
                    {w.name}
                    {(w as any).is_shortlisted && <span className="shortlist-badge">SL</span>}
                    <span onClick={e => { e.stopPropagation(); toggleLinkedWorker(w.uid) }} style={{ color: 'var(--text-muted)' }}>×</span>
                  </span>
                ))}
              </div>
            )}
            <button className="manage-view-btn" onClick={() => setShowWorkerPicker(p => !p)}>{showWorkerPicker ? 'Cancel' : '+ Link a worker'}</button>
            {showWorkerPicker && (
              <div style={{ marginTop: 6, border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 180, overflowY: 'auto' }}>
                <input className="search-input" placeholder="Search workers (incl. shortlist)…" value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} style={{ marginBottom: 4, width: '100%' }} autoFocus />
                {filteredWorkers.slice(0, 50).map(w => (
                  <div key={w.uid} className="si-picker-row" onClick={() => toggleLinkedWorker(w.uid)}>
                    {w.picture ? <img className="si-avatar" src={img('People/' + w.picture)} alt="" /> : <div className="si-avatar" />}
                    <span>{w.name}</span>
                    {(w as any).is_shortlisted && <span className="shortlist-badge" style={{ marginLeft: 'auto' }}>Shortlist</span>}
                    {draft.linked_worker_uids.includes(w.uid) && <span style={{ marginLeft: (w as any).is_shortlisted ? 6 : 'auto', color: 'var(--accent)' }}>✓</span>}
                  </div>
                ))}
                {filteredWorkers.length === 0 && <div className="si-empty">No workers match "{workerSearch}"</div>}
              </div>
            )}
          </div>

          {/* Linked planned storylines — an arc can span more than one, e.g.
              "The Bloodline Story" arc covering several separate feuds. */}
          <div>
            <div className="section-label mb-1">Planned Storylines</div>
            {linkedStorylines.length > 0 && (
              <div className="flex flex-wrap gap-1" style={{ marginBottom: 6 }}>
                {linkedStorylines.map(s => (
                  <span key={s.id} className="flex items-center gap-1" style={{ background: 'var(--bg-secondary)', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: 'var(--text-primary)', cursor: 'pointer' }}
                    onClick={() => { navigateToEntity('plannedstoryline', s.id); onCancel() }}>
                    {s.name}
                    <span onClick={e => { e.stopPropagation(); toggleLinkedStoryline(s.id) }} style={{ color: 'var(--text-muted)' }}>×</span>
                  </span>
                ))}
              </div>
            )}
            <button className="manage-view-btn" onClick={() => setShowPlannedStorylinePicker(p => !p)}>{showPlannedStorylinePicker ? 'Cancel' : '+ Link a planned storyline'}</button>
            {showPlannedStorylinePicker && (
              <div style={{ marginTop: 6, border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 180, overflowY: 'auto' }}>
                {planned.map(s => (
                  <div key={s.id} className="si-picker-row" onClick={() => toggleLinkedStoryline(s.id)}>
                    <span>{s.name}</span>
                    {draft.linked_planned_storyline_ids.includes(s.id) && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
                  </div>
                ))}
                {planned.length === 0 && <div className="si-empty">No planned storylines yet.</div>}
                <div className="flex gap-1" style={{ marginTop: 6 }}>
                  <input className="search-input flex-1" placeholder={`New storyline name (default: "${draft.text || ownerWorker.name + "'s Storyline"}")`} value={newStorylineName} onChange={e => setNewStorylineName(e.target.value)} />
                  <button className="manage-view-btn" onClick={createPlannedStoryline}>+ Create</button>
                </div>
              </div>
            )}
          </div>

          {/* Linked active (in-game) storylines — same span-multiple idea as
              planned storylines above. */}
          <div>
            <div className="section-label mb-1">In-Game Storylines</div>
            {linkedActiveStorylines.length > 0 && (
              <div className="flex flex-wrap gap-1" style={{ marginBottom: 6 }}>
                {linkedActiveStorylines.map(s => (
                  <span key={s.uid} className="flex items-center gap-1" style={{ background: 'var(--bg-secondary)', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: 'var(--text-primary)', cursor: 'pointer' }}
                    onClick={() => { navigateToEntity('storyline', s.uid); onCancel() }}>
                    {s.name}
                    <span onClick={e => { e.stopPropagation(); toggleLinkedActiveStoryline(s.uid) }} style={{ color: 'var(--text-muted)' }}>×</span>
                  </span>
                ))}
              </div>
            )}
            <button className="manage-view-btn" onClick={() => setShowActiveStorylinePicker(p => !p)}>{showActiveStorylinePicker ? 'Cancel' : '+ Link an active storyline'}</button>
            {showActiveStorylinePicker && (
              <div style={{ marginTop: 6, border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 180, overflowY: 'auto' }}>
                {activeStorylines.map(s => (
                  <div key={s.uid} className="si-picker-row" onClick={() => toggleLinkedActiveStoryline(s.uid)}>
                    <span>{s.name}</span>
                    {draft.linked_storyline_uids.includes(s.uid) && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
                  </div>
                ))}
                {activeStorylines.length === 0 && <div className="si-empty">No active storylines right now.</div>}
              </div>
            )}
          </div>

          {/* Storyline Ideas */}
          <div>
            <div className="section-label mb-1">Storyline Ideas for {ownerWorker.name}</div>
            {(['feuds', 'alliances'] as const).map(kind => {
              const list = ideasData?.[kind] ?? []
              if (list.length === 0) return null
              return (
                <div key={kind} className={`si-section ${kind === 'feuds' ? 'feud' : 'ally'}`}>
                  <div className="si-section-head">{kind === 'feuds' ? 'Feuds' : 'Alliances'}<span className="si-section-count">{list.length}</span></div>
                  {list.slice(0, 3).map((idea, i) => (
                    <div key={i} className="si-idea-row">
                      {idea.picture ? <img className="si-avatar" src={img('People/' + idea.picture)} alt="" /> : <div className="si-avatar" />}
                      <div className="si-idea-main">
                        <div className="si-idea-name">{idea.name}</div>
                        <div className="si-chips">{idea.reasons.slice(0, 2).map((r, ri) => <span key={ri} className="si-chip">{r}</span>)}</div>
                      </div>
                      <button className="manage-view-btn" style={{ fontSize: 10, flexShrink: 0 }}
                        onClick={() => onAddSuggestedArc(idea.reasons[0] || `${kind === 'feuds' ? 'Feud' : 'Alliance'} with ${idea.name}`, idea.worker_uid)}>
                        <img src={plusIcon} alt="" style={{ width: 9, height: 9 }} /> Use
                      </button>
                    </div>
                  ))}
                </div>
              )
            })}
            {(!ideasData || (ideasData.feuds.length === 0 && ideasData.alliances.length === 0)) && (
              <div className="si-empty">No suggestions available for {ownerWorker.name} right now.</div>
            )}
          </div>

          {/* Linked segments */}
          {draft.linked_segments.length > 0 && (
            <div>
              <div className="section-label mb-1">Linked Segments</div>
              {draft.linked_segments.map((link, i) => (
                <LinkedSegmentSummary
                  key={i} link={link}
                  onUnlink={() => setDraft(d => ({ ...d, linked_segments: d.linked_segments.filter((_, li) => li !== i) }))}
                />
              ))}
            </div>
          )}

          {/* Convert to segment */}
          <div>
            <div className="section-label mb-1">Booking</div>
            <button className="manage-view-btn" onClick={() => setShowShowPicker(p => !p)}>{showShowPicker ? 'Cancel' : 'Convert to Segment →'}</button>
            {showShowPicker && (
              <div style={{ marginTop: 6, border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 200, overflowY: 'auto' }}>
                {upcomingShows.length === 0 && <div className="si-empty">No upcoming shows scheduled.</div>}
                {upcomingShows.map((show: any, i: number) => (
                  <div key={i} className="si-picker-row" onClick={() => setEditorShow(show)}>
                    {show.logo ? <img className="si-avatar" src={img((show.type === 'tv' ? 'TV/' : 'Events/') + show.logo)} alt="" /> : <div className="si-avatar" />}
                    <span>{show.name} — {show.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2" style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)' }}>
          <button className="manage-view-btn" onClick={onCancel}>Cancel</button>
          <button className="btn primary" disabled={!canConfirm} onClick={handleConfirm} title={canConfirm ? '' : 'Enter a name first'}>Confirm</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
