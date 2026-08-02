import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../../../context/AppContext'
import { api, ArcItem, ShowRef, UpcomingShow, PastShow } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { LinkedSegmentSummary } from '../../../components/LinkedSegmentSummary'
import { ArcItemModal } from '../arc/ArcItemModal'
import { useArcsData, newArcItem, ARC_LIST_FIELDS, type ArcListField } from '../arc/arcData'
import { fmtDateOrdinal, groupByLabel, monthLabel } from '../../../lib/dates'

function ShowRefRow({ label, ref, onPick, onUnlink, upcomingShows, pastShows, navigate, img }: {
  label: string
  ref: ShowRef | null | undefined
  onPick: (ref: ShowRef) => void
  onUnlink: () => void
  upcomingShows: UpcomingShow[]
  pastShows: PastShow[]
  navigate: (ref: ShowRef) => void
  img: (path: string) => string
}) {
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')

  if (ref) {
    return (
      <div>
        <div className="section-label mb-1">{label}</div>
        <div className="flex items-center gap-2" style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '6px 8px' }}>
          <span className="flex-1" style={{ fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => navigate(ref)}>
            {ref.show_name} — {ref.show_date}
          </span>
          <button className="manage-view-btn" style={{ fontSize: 11 }} onClick={onUnlink}>Unlink</button>
        </div>
      </div>
    )
  }

  const q = search.trim().toLowerCase()
  const filteredUpcoming = upcomingShows.filter(s => !q || s.name.toLowerCase().includes(q))
  const filteredPast = pastShows.filter(s => !q || s.name.toLowerCase().includes(q))
  const upcomingGroups = groupByLabel(filteredUpcoming, s => monthLabel(s.date))
  const pastGroups = groupByLabel(filteredPast, s => monthLabel(s.date))

  const renderRow = (key: string, name: string, date: string, logo: string | undefined, folder: string, onClick: () => void) => (
    <div key={key} className="si-picker-row" style={{ gap: 8 }} onClick={onClick}>
      {logo ? (
        <img src={img(folder + logo)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
          onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
      ) : <div className="si-avatar" />}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDateOrdinal(date)}</span>
      </div>
    </div>
  )

  return (
    <div>
      <div className="section-label mb-1">{label}</div>
      <button className="manage-view-btn" onClick={() => setPicking(p => !p)}>{picking ? 'Cancel' : '+ Pick a show'}</button>
      {picking && (
        <div style={{ marginTop: 6, border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 260, overflowY: 'auto' }}>
          <input className="search-input" placeholder="Search shows…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 4, width: '100%' }} autoFocus />
          {upcomingGroups.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '6px 0 2px' }}>Upcoming</div>}
          {upcomingGroups.map(g => (
            <div key={g.label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, marginBottom: 2 }}>{g.label}</div>
              {g.items.map(s => renderRow(`u-${s.type}-${s.tvUid ?? s.cardUid}-${s.date}`, s.name, s.date, s.logo, s.type === 'tv' ? 'TV/' : 'Events/',
                () => { onPick({ kind: 'upcoming', ref_uid: s.tvUid ?? s.cardUid ?? 0, show_type: s.type, show_date: s.date, show_name: s.name }); setPicking(false); setSearch('') }))}
            </div>
          ))}
          {pastGroups.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '6px 0 2px' }}>Past</div>}
          {pastGroups.map(g => (
            <div key={g.label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, marginBottom: 2 }}>{g.label}</div>
              {g.items.map(s => renderRow(`p-${s.uid}`, s.name, s.date, s.logo, s.is_tv ? 'TV/' : 'Events/',
                () => { onPick({ kind: 'past', ref_uid: s.uid, show_type: s.is_tv ? 'tv' : 'event', show_date: s.date, show_name: s.name }); setPicking(false); setSearch('') }))}
            </div>
          ))}
          {upcomingGroups.length === 0 && pastGroups.length === 0 && <div className="si-empty">No shows match "{search}"</div>}
        </div>
      )}
    </div>
  )
}

/** Full entity page for a PlannedStoryline — mirrors StorylineProfile's
 *  layout for the user-authored/planning counterpart of that page. Manages
 *  linking/unlinking arcs and workers from the storyline's own side (the
 *  same underlying relationship ArcItemModal manages from the arc's side),
 *  start/end dates picked from a real show rather than typed freehand, and
 *  rename/archive/delete. */
export function PlannedStorylineProfile({ storylineId }: { storylineId: string }) {
  const { img, navigateToEntity, setCurrentPage, focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  const { data: storyline, setData: setStoryline } = useSWR('planned-storyline-' + storylineId, () => api.plannedStorylines.get(storylineId))
  const { data: links } = useSWR('planned-storyline-links-' + storylineId, () => api.plannedStorylines.links(storylineId))
  const { data: rosterData } = useSWR('all-workers', () => api.roster.all(1, 99999))
  const workers: any[] = useMemo(() => rosterData?.workers ?? [], [rosterData])
  const workerByUid = (uid: number) => workers.find(w => w.uid === uid)
  // "Your promotion" == the player's own fed, not whichever fed is currently
  // being viewed elsewhere in the app — a storyline's roster options should
  // stay fixed regardless of what the booker happens to be looking at.
  // TODO(shortlist): once tblShortlist (the player's scouting watchlist) is
  // surfaced by the backend, union it into this list rather than replacing it.
  const signedWorkers = useMemo(() => workers.filter(w => w.contract?.fed_uid === playerFed?.uid), [workers, playerFed])

  const { arcs, getArc, setArc } = useArcsData()
  const { data: scheduleData } = useSWR(fedUid != null ? 'schedule-' + fedUid : null, () => api.schedule.list(fedUid!))
  const { data: historyData } = useSWR(fedUid != null ? 'past-shows-' + fedUid : null, () => api.show_history.list(fedUid!, 100))
  const upcomingShows = scheduleData?.upcoming ?? []
  const pastShows = historyData?.shows ?? []

  const [workerSearch, setWorkerSearch] = useState('')
  const [showWorkerPicker, setShowWorkerPicker] = useState(false)
  const [arcSearch, setArcSearch] = useState('')
  const [showArcPicker, setShowArcPicker] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [viewingArc, setViewingArc] = useState<{ worker_uid: number; field: ArcListField; item: ArcItem } | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  useEffect(() => { if (storyline) setNameDraft(storyline.name) }, [storyline])

  const navigateToShow = (ref: ShowRef) => {
    if (ref.kind === 'past') navigateToEntity('pastshow', ref.ref_uid)
    else navigateToEntity(ref.show_type === 'tv' ? 'tvepisode' : 'event', ref.show_type === 'tv' ? `${ref.ref_uid}@${ref.show_date}` : ref.ref_uid)
  }

  const toggleWorker = (uid: number) => {
    if (!storyline) return
    const next = storyline.workers.includes(uid) ? storyline.workers.filter(u => u !== uid) : [...storyline.workers, uid]
    setStoryline({ ...storyline, workers: next })
    api.plannedStorylines.update(storylineId, { workers: next }).catch(() => {})
  }

  const setShowField = (field: 'start_show' | 'end_show', ref: ShowRef | null) => {
    if (!storyline) return
    setStoryline({ ...storyline, [field]: ref })
    api.plannedStorylines.update(storylineId, { [field]: ref }).catch(() => {})
  }

  const toggleArchived = () => {
    if (!storyline) return
    const next = !storyline.archived
    setStoryline({ ...storyline, archived: next })
    api.plannedStorylines.update(storylineId, { archived: next }).catch(() => {})
  }

  const handleDelete = () => {
    api.plannedStorylines.delete(storylineId).then(() => setCurrentPage('booking')).catch(() => {})
  }

  const commitName = () => {
    setEditingName(false)
    const trimmed = nameDraft.trim()
    if (!storyline || !trimmed || trimmed === storyline.name) { if (storyline) setNameDraft(storyline.name); return }
    setStoryline({ ...storyline, name: trimmed })
    api.plannedStorylines.update(storylineId, { name: trimmed }).catch(() => {})
  }

  // Every arc item belonging to a worker signed to the player's own
  // promotion, flattened for search.
  const allArcItems = useMemo(() => {
    const list: { worker_uid: number; worker_name: string; field: ArcListField; item: ArcItem }[] = []
    for (const w of signedWorkers) {
      const arc = arcs[String(w.uid)]
      if (!arc) continue
      for (const field of ARC_LIST_FIELDS) {
        for (const item of arc[field] || []) list.push({ worker_uid: w.uid, worker_name: w.name, field, item })
      }
    }
    return list
  }, [arcs, signedWorkers])

  const linkedArcItems = allArcItems.filter(a => a.item.linked_planned_storyline_id === storylineId)

  const toggleArcLink = (worker_uid: number, field: ArcListField, item: ArcItem) => {
    const current = getArc(worker_uid)[field] || []
    const isLinked = item.linked_planned_storyline_id === storylineId
    const next = current.map(i => (i.id === item.id ? { ...i, linked_planned_storyline_id: isLinked ? null : storylineId } : i))
    setArc(worker_uid, { ...getArc(worker_uid), [field]: next })
    api.arcs.update(worker_uid, { [field]: next }).catch(() => {})
  }

  const addSuggestedArc = (workerUid: number, field: ArcListField, text: string, linkedWorkerUid: number) => {
    const item = { ...newArcItem(text), linked_worker_uids: [linkedWorkerUid] }
    const current = getArc(workerUid)[field] || []
    const next = [...current, item]
    setArc(workerUid, { ...getArc(workerUid), [field]: next })
    api.arcs.update(workerUid, { [field]: next }).catch(() => {})
  }

  if (!storyline) return <div className="loading" style={{ padding: 24 }}>Loading…</div>

  if (viewingArc) {
    const owner = workerByUid(viewingArc.worker_uid)
    const liveItem = getArc(viewingArc.worker_uid)[viewingArc.field]?.find(i => i.id === viewingArc.item.id) || viewingArc.item
    return owner && fedUid != null ? (
      <ArcItemModal
        ownerWorker={owner}
        fedUid={fedUid}
        item={liveItem}
        isNew={false}
        onSave={updated => {
          const current = getArc(viewingArc.worker_uid)[viewingArc.field] || []
          const next = current.map(i => (i.id === updated.id ? updated : i))
          setArc(viewingArc.worker_uid, { ...getArc(viewingArc.worker_uid), [viewingArc.field]: next })
          api.arcs.update(viewingArc.worker_uid, { [viewingArc.field]: next }).catch(() => {})
          setViewingArc(null)
        }}
        onAddSuggestedArc={(text, linkedWorkerUid) => addSuggestedArc(viewingArc.worker_uid, viewingArc.field, text, linkedWorkerUid)}
        onCancel={() => setViewingArc(null)}
      />
    ) : null
  }

  const linkedWorkers = storyline.workers.map(workerByUid).filter(Boolean)
  const arcSearchQ = arcSearch.trim().toLowerCase()
  const arcPickerList = allArcItems.filter(a =>
    a.item.linked_planned_storyline_id !== storylineId &&
    (!arcSearchQ || a.worker_name.toLowerCase().includes(arcSearchQ) || a.item.text.toLowerCase().includes(arcSearchQ)))
  const workerPickerList = signedWorkers.filter(w => !workerSearch.trim() || w.name.toLowerCase().includes(workerSearch.trim().toLowerCase()))

  return (
    <div style={{ padding: 20, overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <input
              className="search-input" style={{ width: '100%', fontSize: 22, fontWeight: 700 }}
              value={nameDraft} onChange={e => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => { if (e.key === 'Enter') commitName(); else if (e.key === 'Escape') { setNameDraft(storyline.name); setEditingName(false) } }}
              autoFocus
            />
          ) : (
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', cursor: 'pointer' }} onClick={() => setEditingName(true)} title="Click to rename">
              {storyline.name}{storyline.archived ? ' (Archived)' : ''}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {storyline.notes && (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{storyline.notes}</div>
          </div>
        )}

        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <ShowRefRow label="Start Date" ref={storyline.start_show} onPick={r => setShowField('start_show', r)} onUnlink={() => setShowField('start_show', null)}
              upcomingShows={upcomingShows} pastShows={pastShows} navigate={navigateToShow} img={img} />
          </div>
          <div style={{ flex: 1 }}>
            <ShowRefRow label="End Date" ref={storyline.end_show} onPick={r => setShowField('end_show', r)} onUnlink={() => setShowField('end_show', null)}
              upcomingShows={upcomingShows} pastShows={pastShows} navigate={navigateToShow} img={img} />
          </div>
        </div>

        {/* Workers */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Workers</div>
          {linkedWorkers.length > 0 && (
            <div className="flex flex-wrap gap-1" style={{ marginBottom: 6 }}>
              {linkedWorkers.map(w => (
                <span key={w.uid} className="flex items-center gap-1" style={{ background: 'var(--bg-tertiary)', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: 'var(--text-primary)', cursor: 'pointer' }}
                  onClick={() => navigateToEntity('worker', w.uid)}>
                  {w.name}
                  <span onClick={e => { e.stopPropagation(); toggleWorker(w.uid) }} style={{ color: 'var(--text-muted)' }}>×</span>
                </span>
              ))}
            </div>
          )}
          <button className="manage-view-btn" onClick={() => setShowWorkerPicker(p => !p)}>{showWorkerPicker ? 'Cancel' : '+ Link a worker'}</button>
          {showWorkerPicker && (
            <div style={{ marginTop: 6, border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 220, overflowY: 'auto' }}>
              <input className="search-input" placeholder="Search your roster…" value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} style={{ marginBottom: 4, width: '100%' }} autoFocus />
              {workerPickerList.slice(0, 50).map(w => (
                <div key={w.uid} className="si-picker-row" onClick={() => toggleWorker(w.uid)}>
                  {w.picture ? <img className="si-avatar" src={img('People/' + w.picture)} alt="" /> : <div className="si-avatar" />}
                  <span>{w.name}</span>
                  {storyline.workers.includes(w.uid) && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
                </div>
              ))}
              {workerPickerList.length === 0 && <div className="si-empty">No signed workers match "{workerSearch}"</div>}
            </div>
          )}
        </div>

        {/* Linked Arcs */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Linked Arcs</div>
          {linkedArcItems.length > 0 ? linkedArcItems.map((a, i) => {
            const w = workerByUid(a.worker_uid)
            return (
              <div key={i} className="si-idea-row">
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }} onClick={() => setViewingArc({ worker_uid: a.worker_uid, field: a.field, item: a.item })}>
                  {w?.picture ? <img className="si-avatar" src={img('People/' + w.picture)} alt="" /> : <div className="si-avatar" />}
                  <div className="si-idea-main">
                    <div className="si-idea-name">{a.worker_name}</div>
                    <div className="si-chips"><span className="si-chip">{a.item.text}</span></div>
                  </div>
                </div>
                <button className="manage-view-btn" style={{ fontSize: 10, flexShrink: 0 }} onClick={() => toggleArcLink(a.worker_uid, a.field, a.item)}>Unlink</button>
              </div>
            )
          }) : <div className="si-empty">No arcs linked yet.</div>}
          <button className="manage-view-btn" style={{ marginTop: 6 }} onClick={() => setShowArcPicker(p => !p)}>{showArcPicker ? 'Cancel' : '+ Link an arc'}</button>
          {showArcPicker && (
            <div style={{ marginTop: 6, border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, maxHeight: 220, overflowY: 'auto' }}>
              <input className="search-input" placeholder="Search your roster's arcs…" value={arcSearch} onChange={e => setArcSearch(e.target.value)} style={{ marginBottom: 4, width: '100%' }} autoFocus />
              {arcPickerList.slice(0, 50).map((a, i) => (
                <div key={i} className="si-picker-row" onClick={() => toggleArcLink(a.worker_uid, a.field, a.item)}>
                  <div className="si-idea-main">
                    <div className="si-idea-name">{a.worker_name}</div>
                    <div className="si-chips"><span className="si-chip">{a.item.text}</span></div>
                  </div>
                </div>
              ))}
              {arcPickerList.length === 0 && <div className="si-empty">No arcs match "{arcSearch}"</div>}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Linked Segments</div>
          {links && links.segments.length > 0
            ? links.segments.map((seg, i) => <LinkedSegmentSummary key={i} link={seg} />)
            : <div className="si-empty">No segments linked yet.</div>}
        </div>

        <div className="flex justify-between gap-2" style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
          <div className="flex gap-2">
            {confirmingDelete ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>Delete this storyline?</span>
                <button className="manage-view-btn" onClick={() => setConfirmingDelete(false)}>Cancel</button>
                <button className="btn" style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }} onClick={handleDelete}>Confirm Delete</button>
              </>
            ) : (
              <button className="manage-view-btn" style={{ color: '#ef4444' }} onClick={() => setConfirmingDelete(true)}>Delete</button>
            )}
          </div>
          <button className="manage-view-btn" onClick={toggleArchived}>{storyline.archived ? 'Unarchive' : 'Archive'}</button>
        </div>
      </div>
    </div>
  )
}
