import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { api, ShowCard, CardSegment, Worker, PlannedStoryline, UpcomingShow } from '../api'
import { useApp } from '../context/AppContext'
import plusIcon from '../assets/UI icons/plus.png'
import faceIcon from '../assets/UI icons/face.png'
import heelIcon from '../assets/UI icons/heel.png'
import maleIcon from '../assets/UI icons/male.png'
import femaleIcon from '../assets/UI icons/female.png'

interface CardEditorProps {
  show: UpcomingShow
  fedUid: number
  onClose: () => void
}

const PERCEPTION_LABELS = [
  { label: 'All', v: 0 },
  { label: 'Major Star', v: 1 },
  { label: 'Star', v: 2 },
  { label: 'Well Known', v: 3 },
  { label: 'Recognisable', v: 4 },
  { label: 'Unimportant', v: 5 },
]

function SavedSegment({ seg, i, workerById, workerPic }: { seg: CardSegment; i: number; workerById: (uid: number) => Worker | undefined; workerPic: (w: Worker) => string }) {
  const headline = () => {
    if (seg.type === 'match') {
      const parts = seg.sides.map(side => side.map(uid => workerById(uid)?.name || '?').join(' & ') || '???')
      return <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{parts.join(' vs. ')}</span>
    }
    if (seg.type === 'battle-royal') {
      const names = seg.workers.map(uid => workerById(uid)?.name || '?')
      return <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Battle Royal: {names.join(', ')}</span>
    }
    return <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{seg.description || 'Angle'}</span>
  }

  const workerImg = (uid: number) => {
    const w = workerById(uid)
    if (!w) return null
    const url = workerPic(w)
    return url
      ? <img src={url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      : <div style={{ width: 40, height: 40, background: 'var(--bg-secondary)', borderRadius: 5 }} />
  }

  const accentColor = seg.type === 'match' || seg.type === 'battle-royal' ? '#e04040' : '#ff9800'
  return (
    <div className="card-editor-segment-saved" style={{ borderLeft: `3px solid ${accentColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: seg.notes ? 4 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', minWidth: 20 }}>{i + 1}.</span>
        {seg.type === 'match' ? seg.sides.map((side, si) => (
          <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {si > 0 && <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 2px' }}>vs.</span>}
            {side.map(uid => <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{workerImg(uid)}<span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{workerById(uid)?.name || '?'}</span></div>)}
          </div>
        )) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {seg.workers.map(uid => <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{workerImg(uid)}</div>)}
            {headline()}
          </div>
        )}
      </div>
      {seg.notes && <div style={{ fontSize: 12, color: '#fff', marginLeft: 26, lineHeight: 1.4 }}>{seg.notes}</div>}
    </div>
  )
}

function WorkerChip({ uid, workerById, workerPic, onRemove, showAnd }: { uid: number; workerById: (uid: number) => Worker | undefined; workerPic: (w: Worker) => string; onRemove: () => void; showAnd?: boolean }) {
  const w = workerById(uid)
  if (!w) return null
  const url = workerPic(w)
  return (
    <div className="card-editor-worker-chip">
      {url ? <img src={url} alt="" className="card-editor-worker-chip-img" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div className="card-editor-worker-chip-img-placeholder" />}
      <span className="card-editor-worker-chip-name">{w.name}</span>
      {showAnd && <span className="card-editor-worker-chip-and">&</span>}
      <span className="card-editor-worker-chip-remove" onClick={onRemove}>✕</span>
    </div>
  )
}

function MatchEditor({ seg, dragWorker, onDropWorker, onAddSide, onRemoveSide, onRemoveWorker, workerById, workerPic }: {
  seg: CardSegment; i: number; dragWorker: number | null;
  onDropWorker: (e: React.DragEvent, sideIdx?: number) => void;
  onAddSide: () => void; onRemoveSide: () => void;
  onRemoveWorker: (uid: number, sideIdx?: number) => void;
  workerById: (uid: number) => Worker | undefined;
  workerPic: (w: Worker) => string;
}) {
  return (
    <div onDragOver={e => e.preventDefault()} onDrop={e => {
      const firstEmpty = seg.sides.findIndex(s => s.length === 0)
      if (firstEmpty >= 0) onDropWorker(e, firstEmpty)
    }} className="card-editor-match-dropzone" style={{
      background: dragWorker ? 'rgba(0,180,255,0.06)' : 'transparent',
      border: `1px dashed ${dragWorker ? 'rgba(0,180,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      {seg.sides.every(s => s.length === 0) && <span style={{ fontSize: 10, color: '#fff', fontStyle: 'italic', padding: '2px 0' }}>Drop workers here</span>}
      {seg.sides.map((side, si) => (
        <div key={si} className="card-editor-match-side">
          {si > 0 && <span className="card-editor-match-vs">vs.</span>}
          {side.length === 0 ? (
            <div onDragOver={e => e.preventDefault()} onDrop={e => onDropWorker(e, si)} className="card-editor-match-side-empty">
              {si === 0 ? 'Side A' : si === 1 ? 'Side B' : `Side ${String.fromCharCode(65 + si)}`}
            </div>
          ) : (
            <div onDragOver={e => e.preventDefault()} onDrop={e => onDropWorker(e, si)} className="card-editor-match-side-filled">
              {side.map((uid, wi) => <WorkerChip key={uid} uid={uid} workerById={workerById} workerPic={workerPic} showAnd={wi < side.length - 1} onRemove={() => onRemoveWorker(uid, si)} />)}
            </div>
          )}
        </div>
      ))}
      <div className="card-editor-match-actions">
        <button className="topbar-add-btn" onClick={onAddSide} style={{ padding: '2px 8px' }}><img src={plusIcon} alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(1)' }} />Add side</button>
        {seg.sides.length > 2 && <button onClick={onRemoveSide} style={{ background: 'none', border: 'none', color: '#e55', cursor: 'pointer', fontSize: 11, padding: '2px 6px' }}>− Remove last side</button>}
      </div>
    </div>
  )
}

function FlatWorkerList({ seg, dragWorker, onDrop, onRemoveWorker, workerById, workerPic }: {
  seg: CardSegment; dragWorker: number | null;
  onDrop: (e: React.DragEvent) => void;
  onRemoveWorker: (uid: number) => void;
  workerById: (uid: number) => Worker | undefined;
  workerPic: (w: Worker) => string;
}) {
  return (
    <div onDragOver={e => e.preventDefault()} onDrop={onDrop} className="card-editor-flat-dropzone" style={{
      background: dragWorker ? 'rgba(0,180,255,0.06)' : 'transparent',
      border: `1px dashed ${dragWorker ? 'rgba(0,180,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      {seg.workers.length === 0 && <span style={{ fontSize: 10, color: '#fff', fontStyle: 'italic', padding: '2px 0' }}>Drop workers here</span>}
      {seg.workers.map((uid, wi) => <WorkerChip key={uid} uid={uid} workerById={workerById} workerPic={workerPic} showAnd={wi < seg.workers.length - 1} onRemove={() => onRemoveWorker(uid)} />)}
    </div>
  )
}

export function CardEditor({ show, fedUid, onClose }: CardEditorProps) {
  const { img } = useApp()
  const [card, setCard] = useState<ShowCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [segments, setSegments] = useState<CardSegment[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [gameStorylines, setGameStorylines] = useState<PlannedStoryline[]>([])
  const [plannedStorylines, setPlannedStorylines] = useState<PlannedStoryline[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragWorker, setDragWorker] = useState<number | null>(null)
  const [dragSegIdx, setDragSegIdx] = useState<number | null>(null)
  const [showStorylinePicker, setShowStorylinePicker] = useState<number | null>(null)
  const [dispFilter, setDispFilter] = useState<'all' | 'face' | 'heel'>('all')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [wrestlersOnly, setWrestlersOnly] = useState(true)
  const [popFilter, setPopFilter] = useState<number>(0)

  useEffect(() => {
    Promise.all([
      api.roster.list(fedUid),
      api.plannedStorylines.list(),
      api.cards.getByShow(show.type, show.tvUid || show.cardUid || 0, show.date),
      api.fed.storylines(fedUid),
    ]).then(([roster, sls, existing, gameSls]) => {
      const sorted = (roster.workers || []).sort((a, b) => (b.pop?.pct || 0) - (a.pop?.pct || 0))
      setWorkers(sorted)
      setGameStorylines((gameSls.storylines || []).map((s: any) => ({ id: `game-${s.uid}`, name: s.name, workers: [], notes: '', created: '', updated: '' })))
      setPlannedStorylines(sls.storylines || [])
      if (existing) {
        setCard(existing)
        setSegments(existing.segments || [])
      } else {
        api.cards.create({ showType: show.type, showUid: show.tvUid || show.cardUid || 0, showName: show.name, showDate: show.date, fedUid })
          .then(r => { setCard(r.card); setSegments([]) })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
    // Runs once when the editor opens to load initial data; the editor is
    // remounted per show, so intentionally not re-run on show/fed changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const assignedUids = new Set<number>()
  for (const seg of segments) {
    if (seg.saved) continue
    for (const uid of seg.workers) assignedUids.add(uid)
    for (const side of seg.sides) for (const uid of side) assignedUids.add(uid)
  }

  const filteredWorkers = workers.filter(w => {
    if (dispFilter === 'face' && !w.contract?.face) return false
    if (dispFilter === 'heel' && w.contract?.face !== false) return false
    if (genderFilter === 'male' && w.Gender && w.Gender !== 1 && w.Gender !== 3) return false
    if (genderFilter === 'female' && w.Gender && w.Gender !== 5 && w.Gender !== 8) return false
    if (wrestlersOnly && w.non_wrestler) return false
    if (popFilter > 0 && (w.contract?.perception || 0) !== popFilter) return false
    if (assignedUids.has(w.uid)) return false
    return true
  })

  // Indexed lookup: workerById is called inside nested render loops (segments ×
  // sides × workers), so a linear .find() here is quadratic on roster size.
  const workerMap = useMemo(() => new Map(workers.map(w => [w.uid, w])), [workers])
  const workerById = useCallback((uid: number) => workerMap.get(uid), [workerMap])
  const workerPic = (w: Worker) => { const p = w.contract?.picture || w.picture; return p ? img('People/' + p) : '' }

  const update = (idx: number, updates: Partial<CardSegment>) => {
    setSegments(segments.map((s, i) => i === idx ? { ...s, ...updates } : s))
    setDirty(true)
  }

  const addSegment = (type: 'match' | 'angle' | 'battle-royal') => {
    setSegments([...segments, {
      type, order: segments.length,
      workers: (type === 'angle' || type === 'battle-royal') ? [] : [],
      sides: type === 'match' ? [[], []] : [],
      description: '', notes: '', storyline: '', saved: false,
    }])
    setDirty(true)
  }

  const removeSegment = (idx: number) => {
    setSegments(segments.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })))
    setDirty(true)
  }

  const addSide = (idx: number) => {
    const seg = segments[idx]
    if (seg.type !== 'match') return
    update(idx, { sides: [...seg.sides, []] })
  }

  const removeSide = (segIdx: number, sideIdx: number) => {
    const seg = segments[segIdx]
    if (seg.sides.length <= 2) return
    update(segIdx, { sides: seg.sides.filter((_, i) => i !== sideIdx) })
  }

  const handleWorkerDrop = (e: React.DragEvent, segIdx: number, sideIdx?: number) => {
    e.preventDefault()
    const uid = parseInt(e.dataTransfer.getData('text/plain'))
    if (isNaN(uid)) return
    const seg = segments[segIdx]
    if (seg.type === 'match' && sideIdx !== undefined) {
      const newSides = seg.sides.map((s, i) => i === sideIdx ? (s.includes(uid) ? s : [...s, uid]) : s)
      update(segIdx, { sides: newSides })
    } else if (seg.type === 'angle' || seg.type === 'battle-royal') {
      if (!seg.workers.includes(uid)) update(segIdx, { workers: [...seg.workers, uid] })
    }
    setDragWorker(null)
  }

  const removeWorker = (segIdx: number, workerUid: number, sideIdx?: number) => {
    const seg = segments[segIdx]
    if (seg.type === 'match' && sideIdx !== undefined) {
      update(segIdx, { sides: seg.sides.map((s, i) => i === sideIdx ? s.filter(w => w !== workerUid) : s) })
    } else {
      update(segIdx, { workers: seg.workers.filter(w => w !== workerUid) })
    }
  }

  const handleSegDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData('text/plain', String(idx))
    setDragSegIdx(idx)
  }

  const handleSegDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    const from = parseInt(e.dataTransfer.getData('text/plain'))
    if (isNaN(from) || from === idx) { setDragSegIdx(null); return }
    const next = [...segments]
    const [removed] = next.splice(from, 1)
    next.splice(idx, 0, removed)
    setSegments(next.map((s, i) => ({ ...s, order: i })))
    setDirty(true)
    setDragSegIdx(null)
  }

  const handleSegDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleSegDropGeneric = (e: React.DragEvent, i: number) => {
    const v = parseInt(e.dataTransfer.getData('text/plain'))
    if (!isNaN(v) && v < segments.length) { handleSegDrop(e, i); return }
    handleWorkerDrop(e, i)
  }

  const save = useCallback(async () => {
    if (!card || !dirty) return
    setSaving(true)
    try { await api.cards.update(card.id, { segments }); setDirty(false) } finally { setSaving(false) }
  }, [card, segments, dirty])

  useEffect(() => {
    if (!dirty || !card) return
    const timer = setTimeout(save, 2000)
    return () => clearTimeout(timer)
  }, [segments, dirty, card, save])

  return createPortal(
    <div className="card-editor-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="card-editor-modal">
        <div className="card-editor-header">
          <div>
            <span className="card-editor-header-title">{show.name}</span>
            <span className="card-editor-header-meta">{show.date} · {show.lengthMin} min</span>
          </div>
          <div className="card-editor-header-actions">
            <button onClick={() => { save(); onClose() }} disabled={saving} className="card-editor-save-btn" style={{ opacity: saving ? 0.5 : 1 }}>{saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}</button>
            <button onClick={onClose} className="card-editor-close-btn">✕</button>
          </div>
        </div>

        {loading ? <div className="loading" style={{ padding: 60, textAlign: 'center' }}>Loading...</div>
        : (
          <div className="card-editor-body">
            {/* Left: worker list */}
            <div className="card-editor-sidebar">
              <div className="card-editor-sidebar-filters">
                <div className="toolbar card-editor-toolbar-group">
                  <button className={`btn ${dispFilter === 'all' ? 'active' : ''}`} onClick={() => setDispFilter('all')} style={{ color: '#fff' }}>All</button>
                  <button className={`btn ${dispFilter === 'face' ? 'active' : ''}`} onClick={() => setDispFilter('face')} style={{ color: dispFilter === 'face' ? undefined : '#22c55e' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#22c55e', mask: `url(${faceIcon}) center/contain no-repeat`, WebkitMask: `url(${faceIcon}) center/contain no-repeat`, verticalAlign: 'middle' }} />
                  </button>
                  <button className={`btn ${dispFilter === 'heel' ? 'active' : ''}`} onClick={() => setDispFilter('heel')} style={{ color: dispFilter === 'heel' ? undefined : '#ef4444' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#ef4444', mask: `url(${heelIcon}) center/contain no-repeat`, WebkitMask: `url(${heelIcon}) center/contain no-repeat`, verticalAlign: 'middle' }} />
                  </button>
                </div>
                <div className="toolbar card-editor-toolbar-group">
                  <button className={`btn ${genderFilter === 'all' ? 'active' : ''}`} onClick={() => setGenderFilter('all')} style={{ color: '#fff' }}>All</button>
                  <button className={`btn ${genderFilter === 'male' ? 'active' : ''}`} onClick={() => setGenderFilter('male')} style={{ color: '#fff' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#60a5fa', mask: `url(${maleIcon}) center/contain no-repeat`, WebkitMask: `url(${maleIcon}) center/contain no-repeat`, verticalAlign: 'middle' }} />
                  </button>
                  <button className={`btn ${genderFilter === 'female' ? 'active' : ''}`} onClick={() => setGenderFilter('female')} style={{ color: '#fff' }}>
                    <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#f472b6', mask: `url(${femaleIcon}) center/contain no-repeat`, WebkitMask: `url(${femaleIcon}) center/contain no-repeat`, verticalAlign: 'middle' }} />
                  </button>
                </div>
                <div className="toolbar card-editor-toolbar-group">
                  <div className={`toggle ${wrestlersOnly ? 'active' : ''}`} onClick={() => setWrestlersOnly(!wrestlersOnly)} style={wrestlersOnly ? { background: '#22c55e', borderColor: '#22c55e' } : {}}>
                    <div className="toggle-knob" />
                  </div>
                  <span style={{ fontSize: 12, color: '#fff' }}>Wrestlers only</span>
                </div>
                <div className="toolbar" style={{ flexWrap: 'wrap', gap: 4 }}>
                  {PERCEPTION_LABELS.map(p => (
                    <button key={p.v} className={`btn ${popFilter === p.v ? 'active' : ''}`} onClick={() => setPopFilter(p.v)} style={{ color: '#fff', padding: '2px 6px', fontSize: 11 }}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="card-editor-sidebar-list">
                <div className="card-editor-sidebar-section-label">Roster ({filteredWorkers.length})</div>
                {[
                  { v: 0, label: '' },
                  { v: 1, label: 'Major Star' },
                  { v: 2, label: 'Star' },
                  { v: 3, label: 'Well Known' },
                  { v: 4, label: 'Recognisable' },
                  { v: 5, label: 'Unimportant' },
                  { v: 999, label: 'No Perception' },
                ].map(({ v, label }) => {
                  const group = filteredWorkers.filter(w => {
                    const p = w.contract?.perception || 0
                    if (v === 999) return p >= 6 || p === 0
                    return p === v
                  })
                  if (group.length === 0) return null
                  return (
                    <div key={v}>
                      {label && <div className="card-editor-sidebar-group-label">{label}</div>}
                      {group.map(w => (
                        <div key={w.uid} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', String(w.uid)); setDragWorker(w.uid) }}
                          className="card-editor-worker-item" style={{ background: dragWorker === w.uid ? 'rgba(0,180,255,0.15)' : 'transparent', opacity: dragWorker === w.uid ? 0.5 : 1 }}>
                          {(() => { const u = workerPic(w); return u ? <img src={u} alt="" className="card-editor-worker-img" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div className="card-editor-worker-img-placeholder" /> })()}
                          <span className="card-editor-worker-name">{w.name}</span>
                          <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: w.contract?.face ? '#22c55e' : '#ef4444', mask: `url(${w.contract?.face ? faceIcon : heelIcon}) center/contain no-repeat`, WebkitMask: `url(${w.contract?.face ? faceIcon : heelIcon}) center/contain no-repeat` }} />
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: segments */}
            <div className="card-editor-content">
              {segments.map((seg, i) => (
                <div key={i} className="card-editor-segment">
                  {seg.saved ? (
                    <div onClick={() => update(i, { saved: false })}>
                      <SavedSegment seg={seg} i={i} workerById={workerById} workerPic={workerPic} />
                    </div>
                  ) : (
                    <div draggable onDragStart={e => handleSegDragStart(e, i)} onDragOver={handleSegDragOver}
                      onDrop={e => handleSegDropGeneric(e, i)}
                      style={{ border: `1px solid ${dragSegIdx === i ? 'rgba(0,180,255,0.5)' : 'transparent'}`, opacity: dragSegIdx === i ? 0.4 : 1, transition: 'border-color 0.15s', borderRadius: 7 }}>
                      <div className="card-editor-segment-card" style={{ borderLeft: `3px solid ${seg.type === 'match' || seg.type === 'battle-royal' ? '#e04040' : '#ff9800'}` }}>
                        <div className="card-editor-segment-layout">
                          <div className="card-editor-segment-number">{i + 1}</div>
                          <div className="card-editor-segment-body">
                            {/* Row 1: type, storyline, delete */}
                            <div className="card-editor-segment-actions-row">
                              <select value={seg.type} onChange={e => {
                                const t = e.target.value as 'match' | 'angle' | 'battle-royal'
                                update(i, { type: t, sides: t === 'match' ? [[], []] : [], workers: (t === 'angle' || t === 'battle-royal') ? seg.workers : [] })
                              }} className="card-editor-input">
                                <option value="match">Match</option>
                                <option value="battle-royal">Battle Royal</option>
                                <option value="angle">Angle</option>
                              </select>
                              <div style={{ position: 'relative' }}>
                              <button onClick={() => setShowStorylinePicker(showStorylinePicker === i ? null : i)}
                                  className="card-editor-input" style={{ cursor: 'pointer', color: seg.storyline ? '#ffd700' : '#fff', borderColor: seg.storyline ? '#ffd700' : 'var(--border-color)' }}>
                                {seg.storyline || 'Storyline'}
                              </button>
                                {showStorylinePicker === i && (
                                  <div className="card-editor-storyline-picker">
                                    <div className="card-editor-storyline-item" style={{ fontSize: 11 }} onClick={() => { update(i, { storyline: '' }); setShowStorylinePicker(null) }}>None</div>
                                    {gameStorylines.length > 0 && <><div className="card-editor-storyline-header">Current</div>
                                      {gameStorylines.map(sl => <div key={sl.id} className="card-editor-storyline-item" onClick={() => { update(i, { storyline: sl.name }); setShowStorylinePicker(null) }}>{sl.name}</div>)}</>}
                                    {plannedStorylines.length > 0 && <><div className="card-editor-storyline-header">Planned</div>
                                      {plannedStorylines.map(sl => <div key={sl.id} className="card-editor-storyline-item" onClick={() => { update(i, { storyline: sl.name }); setShowStorylinePicker(null) }}>{sl.name}</div>)}</>}
                                  </div>
                                )}
                              </div>
                              <button onClick={() => removeSegment(i)} className="card-editor-delete-btn">✕</button>
                            </div>

                            {/* Angle description */}
                            {seg.type === 'angle' && <input value={seg.description} onChange={e => update(i, { description: e.target.value })} placeholder="Angle description..." className="card-editor-input" style={{ width: '100%' }} />}

                            {/* Match / Battle Royal / Angle workers */}
                            {seg.type === 'match' ? (
                              <MatchEditor seg={seg} i={i} dragWorker={dragWorker}
                                onDropWorker={(e, sideIdx) => handleWorkerDrop(e, i, sideIdx)}
                                onAddSide={() => addSide(i)} onRemoveSide={() => removeSide(i, seg.sides.length - 1)}
                                onRemoveWorker={(uid, sideIdx) => removeWorker(i, uid, sideIdx)}
                                workerById={workerById} workerPic={workerPic} />
                            ) : (
                              <FlatWorkerList seg={seg} dragWorker={dragWorker}
                                onDrop={e => handleWorkerDrop(e, i)}
                                onRemoveWorker={uid => removeWorker(i, uid)}
                                workerById={workerById} workerPic={workerPic} />
                            )}

                            {/* Notes and save */}
                            <input value={seg.notes} onChange={e => update(i, { notes: e.target.value })} placeholder="Booking notes..." className="card-editor-input" />
                            <button className="topbar-add-btn" onClick={() => update(i, { saved: true })} style={{ alignSelf: 'flex-start' }}>Save Segment</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="card-editor-add-segments">
                <button className="topbar-add-btn" onClick={() => addSegment('match')}><img src={plusIcon} alt="" style={{ width: 14, height: 14, filter: 'brightness(0) invert(1)' }} />Match</button>
                <button className="topbar-add-btn" onClick={() => addSegment('battle-royal')}><img src={plusIcon} alt="" style={{ width: 14, height: 14, filter: 'brightness(0) invert(1)' }} />Battle Royal</button>
                <button className="topbar-add-btn" onClick={() => addSegment('angle')}><img src={plusIcon} alt="" style={{ width: 14, height: 14, filter: 'brightness(0) invert(1)' }} />Angle</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}


