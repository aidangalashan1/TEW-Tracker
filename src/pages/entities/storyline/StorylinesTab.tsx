import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { ratingColor } from '../../../lib/colors'
import { BeatsPlannerTab } from './BeatsPlannerTab'

export function StorylinesTab() {
  const { focusedFed, playerFed, img, navigateToEntity, storylinesSubTab: subTab } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  const { data, isLoading } = useSWR(fedUid != null ? 'storylines-cross-' + fedUid : null, () => api.storylines.cross(fedUid!))
  // Same key as WorkerListPage's roster fetch — shares one cache entry.
  const { data: rosterData } = useSWR(fedUid != null ? 'roster-' + fedUid : null, () => api.roster.list(fedUid!))
  const roster = useMemo(() => rosterData?.workers ?? [], [rosterData])
  const [ideasOpen, setIdeasOpen] = useState(false)
  const [ideas, setIdeas] = useState<{ feuds: any[]; alliances: any[] }>({ feuds: [], alliances: [] })
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null)
  const [ideaSearch, setIdeaSearch] = useState('')

  // Same key ArcItemModal already uses — one shared cache entry, and
  // creating one here is visible from there too without a refetch.
  const { data: plannedData, mutate: mutatePlanned } = useSWR('planned-storylines', () => api.plannedStorylines.list())
  const plannedStorylines = plannedData?.storylines ?? []
  const [showArchivedStorylines, setShowArchivedStorylines] = useState(false)
  const visiblePlannedStorylines = showArchivedStorylines ? plannedStorylines : plannedStorylines.filter(sl => !sl.archived)
  const [creatingStoryline, setCreatingStoryline] = useState(false)

  // Straight to a fresh entity page (name/bio are click-to-edit there) rather
  // than a name-entry modal first — matches ArcsTab's "+ Add" pattern.
  const createStoryline = () => {
    if (creatingStoryline) return
    setCreatingStoryline(true)
    api.plannedStorylines.create('New Storyline').then(r => {
      mutatePlanned()
      navigateToEntity('plannedstoryline', r.storyline.id)
    }).finally(() => setCreatingStoryline(false))
  }

  const openIdeas = () => {
    setSelectedWorker(null)
    setIdeaSearch('')
    setIdeas({ feuds: [], alliances: [] })
    setIdeasOpen(true)
  }

  const fetchIdeas = (uid: number) => {
    setSelectedWorker(uid)
    if (!fed) return
    api.storylines.ideas(fed.uid, uid).then(r => setIdeas({ feuds: r.feuds || [], alliances: r.alliances || [] })).catch(() => {})
  }

  const sortedRoster = useMemo(() => {
    return [...roster].filter((w: any) => w.contract?.fed_uid === fed?.uid).sort((a: any, b: any) => {
      const pa = (a.contract as any)?.Perception ?? 99
      const pb = (b.contract as any)?.Perception ?? 99
      return pa - pb
    })
  }, [roster, fed?.uid])

  const pickerList = useMemo(() => {
    const q = ideaSearch.trim().toLowerCase()
    return q ? sortedRoster.filter((w: any) => w.name.toLowerCase().includes(q)) : sortedRoster
  }, [sortedRoster, ideaSearch])

  const targetWorker = roster.find((w: any) => w.uid === selectedWorker)
  const hideImg = (e: any) => { e.target.style.visibility = 'hidden' }

  const renderCard = (sl: any) => (
    <div key={sl.uid} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }}
      onClick={() => navigateToEntity('storyline', sl.uid)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{sl.name}</div>
        {sl.furthered && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>FURTHERED</span>}
        {sl.heat > 0 && (
          <span style={{ background: ratingColor(sl.heat), color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 11, lineHeight: '18px' }}>{sl.heat}</span>
        )}
      </div>
      {sl.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{sl.description}</div>}
      {sl.workers && sl.workers.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sl.workers.map((w: any) => (
            <span key={w.uid} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', background: w.major ? 'rgba(255,255,255,0.08)' : 'transparent', padding: '2px 6px', borderRadius: 4 }}>
              {w.picture && <img src={img('People/' + w.picture)} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }}
                onError={(e) => (e.target as HTMLElement).style.display = 'none'} />}
              {w.name}
                  <span style={{ fontSize: 9, color: w.face ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{w.face ? 'Face' : 'Heel'}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )

  const renderPlannedCard = (sl: any) => {
    const linkedWorkers = (sl.workers || []).map((uid: number) => roster.find((w: any) => w.uid === uid)).filter(Boolean)
    return (
      <div key={sl.id} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 8, cursor: 'pointer', opacity: sl.archived ? 0.6 : 1 }}
        onClick={() => navigateToEntity('plannedstoryline', sl.id)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{sl.name}</div>
          {sl.archived && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>ARCHIVED</span>}
        </div>
        {sl.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>{sl.notes}</div>}
        {linkedWorkers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {linkedWorkers.map((w: any) => (
              <span key={w.uid} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff', padding: '2px 6px', borderRadius: 4 }}>
                {w.picture && <img src={img('People/' + w.picture)} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }}
                  onError={(e) => (e.target as HTMLElement).style.display = 'none'} />}
                {w.name}
                <span style={{ fontSize: 9, color: w.contract?.face ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{w.contract?.face ? 'Face' : 'Heel'}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  const active = data ? (data.storylines || []).filter((sl: any) => sl.furthered || sl.heat >= 1) : []
  const past = data ? (data.storylines || []).filter((sl: any) => !sl.furthered && sl.heat < 1) : []

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      {subTab === 'list' && (
        <div className="flex justify-end gap-2 mb-2">
          <button className="manage-view-btn" onClick={createStoryline} disabled={creatingStoryline}>{creatingStoryline ? 'Creating…' : '+ New Planned Storyline'}</button>
          <button className="manage-view-btn" onClick={openIdeas}>Storyline Ideas</button>
        </div>
      )}

      {subTab === 'beats' ? <BeatsPlannerTab /> : isLoading || !data ? (
        <div className="loading" style={{ padding: 24 }}>Loading storylines...</div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <div className="mb-2" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6 }}>Active Storylines</div>
              {active.map(renderCard)}
            </>
          )}

          {plannedStorylines.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2" style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6, marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Planned Storylines</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <span className={`toggle-track ${showArchivedStorylines ? 'active' : ''}`} onClick={() => setShowArchivedStorylines(v => !v)}>
                    <span className="toggle-thumb" />
                  </span>
                  Show archived
                </label>
              </div>
              {visiblePlannedStorylines.map(renderPlannedCard)}
              {visiblePlannedStorylines.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>No planned storylines to show.</div>}
            </>
          )}

          {past.length > 0 && (
            <>
              <div className="mb-2" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6, marginTop: 16 }}>Past Storylines</div>
              {past.map(renderCard)}
            </>
          )}
          {data.storylines && data.storylines.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No storylines found</div>}
        </>
      )}

      {ideasOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIdeasOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Storyline Ideas</span>
              <button className="modal-close" onClick={() => setIdeasOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: 12, maxHeight: 460, overflowY: 'auto' }}>
              {!selectedWorker ? (
                <>
                  <input className="si-search" placeholder="Search workers…" value={ideaSearch} autoFocus
                    onChange={e => setIdeaSearch(e.target.value)} />
                  <div className="si-hint">Select a worker to generate feud &amp; alliance ideas.</div>
                  <div className="si-picker">
                    {pickerList.map((w: any) => (
                      <div key={w.uid} className="si-picker-row" onClick={() => fetchIdeas(w.uid)}>
                        {w.picture
                          ? <img className="si-avatar" src={img('People/' + w.picture)} alt="" onError={hideImg} />
                          : <div className="si-avatar" />}
                        <span>{w.name}</span>
                      </div>
                    ))}
                    {pickerList.length === 0 && <div className="si-empty">No workers match “{ideaSearch}”.</div>}
                  </div>
                </>
              ) : (
                <>
                  <button className="si-back" onClick={() => setSelectedWorker(null)}>← All workers</button>
                  <div className="si-target">
                    {targetWorker?.picture
                      ? <img className="si-avatar" src={img('People/' + targetWorker.picture)} alt="" onError={hideImg} />
                      : <div className="si-avatar" />}
                    <div>
                      <div className="si-target-name">{targetWorker?.name || 'Worker'}</div>
                      <div className="si-target-sub">Feud &amp; alliance suggestions</div>
                    </div>
                  </div>
                  {([['feud', 'Feuds', ideas.feuds], ['ally', 'Alliances / Tag', ideas.alliances]] as const).map(([kind, label, list]) => {
                    const top = Math.max(1, ...list.map((idea: any) => idea.score || 0))
                    return (
                      <div key={kind} className={`si-section ${kind}`}>
                        <div className="si-section-head">{label}<span className="si-section-count">{list.length}</span></div>
                        {list.length > 0 ? list.map((idea: any, i: number) => (
                          <div key={i} className="si-idea-row" title={`View ${idea.name}`}
                            onClick={() => { navigateToEntity('worker', idea.worker_uid); setIdeasOpen(false) }}>
                            {idea.picture
                              ? <img className="si-avatar" src={img('People/' + idea.picture)} alt="" onError={hideImg} />
                              : <div className="si-avatar" />}
                            <div className="si-idea-main">
                              <div className="si-idea-name">{idea.name}</div>
                              <div className="si-chips">
                                {(idea.reasons?.length ? idea.reasons : [kind === 'feud' ? 'Potential rivalry' : 'Potential ally'])
                                  .map((r: string, ri: number) => <span key={ri} className="si-chip">{r}</span>)}
                              </div>
                            </div>
                            <div className="si-strength" title={`Strength ${idea.score}`}>
                              <span style={{ width: `${Math.round((idea.score || 0) / top * 100)}%` }} />
                            </div>
                          </div>
                        )) : <div className="si-empty">No {kind === 'feud' ? 'feud' : 'alliance'} ideas for this worker.</div>}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
