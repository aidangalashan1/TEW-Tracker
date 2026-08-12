import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { api, DEFAULT_DIARY_STYLE, type PastShow, type DiarySegment, type DiaryStyleConfig } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { fmtDateOrdinal } from '../../../lib/dates'
import { ratingColor } from '../../../lib/colors'
import { formatRatingPct } from '../../../lib/grade'
import { matchToSegment, renderSegment, wrapSegmentMarkers, replaceSegmentBlock, removeSegmentBlock, stripSegmentMarkers, markdownToBBCode, bbcodeToHtml } from '../../../lib/diaryFormat'
import { applyToolbarCommand, applyColor, applySize, applyImage, type ToolbarCommand } from '../../../lib/textEditCommands'
import { useTextUndoRedo } from '../../../lib/useTextUndoRedo'
import { DiaryToolbar } from './DiaryToolbar'
import { CollateralPanel } from './CollateralPanel'
import { DiaryStylePanel } from './DiaryStylePanel'
import { DiarySegmentModal } from './DiarySegmentModal'

function useDebouncedSave(entryId: string | undefined, save: (patch: Record<string, unknown>) => void, delay = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return (patch: Record<string, unknown>) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { if (entryId) save(patch) }, delay)
  }
}

export function DiaryEntryProfile({ entryId }: { entryId: string }) {
  const { focusedFed, playerFed, ratingFormat, img } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  const resolveWorkerImage = (picture: string) => img('People/' + picture)

  const { data: entry, error, setData: setEntry } = useSWR('diary-entry-' + entryId, () => api.diary.get(entryId))
  const { data: showsData } = useSWR(fedUid != null ? 'past-shows-' + fedUid : null, () => api.show_history.list(fedUid!, 100))
  const pastShows: PastShow[] = showsData?.shows ?? []

  // The list endpoint's embedded `matches` can under-report vs. the per-show
  // detail endpoint (the proven-correct source PastShowProfile itself reads)
  // — same list-vs-detail discrepancy SegmentsTab/BeatsPlannerTab work around,
  // so fetch detail for whichever show is currently open in the picker and
  // prefer it once it resolves.
  const [pickedShowDetail, setPickedShowDetail] = useState<PastShow | null>(null)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [format, setFormat] = useState<'bbcode' | 'markdown'>('bbcode')
  const bodyHistory = useTextUndoRedo('')
  const body = bodyHistory.text
  const [showPicker, setShowPicker] = useState(false)
  const [showCollateral, setShowCollateral] = useState(false)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickedShowUid, setPickedShowUid] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const [style, setStyle] = useState<DiaryStyleConfig>(DEFAULT_DIARY_STYLE)
  const [segments, setSegments] = useState<DiarySegment[]>([])
  const [editingSegment, setEditingSegment] = useState<DiarySegment | null>(null)

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setDate(entry.date)
      setFormat(entry.format)
      bodyHistory.reset(entry.body)
      setStyle({ ...DEFAULT_DIARY_STYLE, ...(entry.styleConfig || {}) })
      setSegments(entry.segments || [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id])

  const persist = (patch: Record<string, unknown>) => {
    api.diary.update(entryId, patch).then(r => setEntry(r.entry)).catch(() => {})
  }
  const debouncedPersist = useDebouncedSave(entryId, persist)

  const filteredShows = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    const list = q ? pastShows.filter(s => s.name.toLowerCase().includes(q)) : pastShows
    return list.slice(0, 30)
  }, [pastShows, pickerSearch])

  const pickedShowSummary = pastShows.find(s => s.uid === pickedShowUid) || null
  const pickedShow = pickedShowDetail?.uid === pickedShowUid ? pickedShowDetail : pickedShowSummary

  useEffect(() => {
    if (pickedShowUid == null) return
    let cancelled = false
    api.show_history.detail(pickedShowUid).then(full => { if (!cancelled) setPickedShowDetail(full) }).catch(() => {})
    return () => { cancelled = true }
  }, [pickedShowUid])

  // discrete=true (toolbar/segment-insert commands) always gets its own undo
  // step; discrete=false (typing) coalesces rapid keystrokes into one.
  const applySnapshot = (snap: { text: string; selStart: number; selEnd: number }, discrete: boolean) => {
    bodyHistory.set(snap, discrete)
    debouncedPersist({ body: snap.text })
    const el = bodyRef.current
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.selectionStart = snap.selStart
      el.selectionEnd = snap.selEnd
    })
  }

  const insertAtCursor = (text: string) => {
    const el = bodyRef.current
    const start = el?.selectionStart ?? body.length
    const end = el?.selectionEnd ?? body.length
    const next = body.slice(0, start) + text + body.slice(end)
    applySnapshot({ text: next, selStart: start + text.length, selEnd: start + text.length }, true)
  }

  const getSelection = () => {
    const el = bodyRef.current
    return { start: el?.selectionStart ?? body.length, end: el?.selectionEnd ?? body.length }
  }

  const applyEdit = (result: { body: string; selectionStart: number; selectionEnd: number }) => {
    applySnapshot({ text: result.body, selStart: result.selectionStart, selEnd: result.selectionEnd }, true)
  }

  const runToolbarCommand = (cmd: ToolbarCommand, urlHref?: string) => {
    applyEdit(applyToolbarCommand(cmd, format, body, getSelection(), urlHref))
  }
  const runColor = (hex: string) => applyEdit(applyColor(body, getSelection(), hex))
  const runSize = (size: number) => applyEdit(applySize(body, getSelection(), size))
  const runImage = (href: string) => applyEdit(applyImage(body, getSelection(), format, href))

  const runUndo = () => {
    const snap = bodyHistory.undo()
    if (!snap) return
    debouncedPersist({ body: snap.text })
    const el = bodyRef.current
    requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = snap.selStart; el.selectionEnd = snap.selEnd } })
  }
  const runRedo = () => {
    const snap = bodyHistory.redo()
    if (!snap) return
    debouncedPersist({ body: snap.text })
    const el = bodyRef.current
    requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = snap.selStart; el.selectionEnd = snap.selEnd } })
  }

  const persistStyle = (patch: Partial<DiaryStyleConfig>) => {
    const next = { ...style, ...patch }
    setStyle(next)
    api.diary.update(entryId, { styleConfig: next }).then(r => setEntry(r.entry)).catch(() => {})
  }

  const persistSegments = (next: DiarySegment[]) => {
    setSegments(next)
    api.diary.update(entryId, { segments: next }).catch(() => {})
  }

  const insertSegment = (show: PastShow, match: PastShow['matches'][number]) => {
    const seg = matchToSegment(match)
    const rendered = renderSegment(seg, format, style, resolveWorkerImage)
    insertAtCursor(wrapSegmentMarkers(seg.id, rendered))
    persistSegments([...segments, seg])
    linkShow(show)
  }

  const saveSegmentEdit = (updated: DiarySegment) => {
    const rendered = renderSegment(updated, format, style, resolveWorkerImage)
    const nextBody = replaceSegmentBlock(body, updated.id, rendered)
    applySnapshot({ text: nextBody, selStart: nextBody.length, selEnd: nextBody.length }, true)
    persistSegments(segments.map(s => s.id === updated.id ? updated : s))
    setEditingSegment(null)
  }

  const removeSegmentEdit = (id: string) => {
    const nextBody = removeSegmentBlock(body, id)
    applySnapshot({ text: nextBody, selStart: nextBody.length, selEnd: nextBody.length }, true)
    persistSegments(segments.filter(s => s.id !== id))
    setEditingSegment(null)
  }

  const linkShow = (show: PastShow) => {
    const linked = entry?.linkedShows || []
    if (linked.some(s => s.showUid === show.uid)) return
    const next = [...linked, { showType: 'past', showUid: show.uid, showName: show.name, showDate: show.date }]
    api.diary.update(entryId, { linkedShows: next }).then(r => setEntry(r.entry)).catch(() => {})
  }

  const unlinkShow = (showUid: number) => {
    const linked = entry?.linkedShows || []
    const next = linked.filter(s => s.showUid !== showUid)
    api.diary.update(entryId, { linkedShows: next }).then(r => setEntry(r.entry)).catch(() => {})
  }

  const cleanBody = stripSegmentMarkers(body)
  const exportText = format === 'markdown' ? markdownToBBCode(cleanBody) : cleanBody

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  if (error) return <div className="loading" style={{ color: 'var(--accent)' }}>Error loading diary entry</div>
  if (!entry) return <div className="loading">Loading...</div>

  return (
    <div style={{ padding: 20, height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); debouncedPersist({ title: e.target.value }) }}
          placeholder="Diary entry title"
          style={{ flex: 1, minWidth: 200, fontSize: 18, fontWeight: 700, background: 'var(--bg-secondary)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 12px' }}
        />
        <input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); debouncedPersist({ date: e.target.value }) }}
          style={{ background: 'var(--bg-secondary)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 10px' }}
        />
        <select
          value={format}
          onChange={e => { const f = e.target.value as 'bbcode' | 'markdown'; setFormat(f); debouncedPersist({ format: f }) }}
          style={{ background: 'var(--bg-secondary)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 10px' }}
        >
          <option value="bbcode">BBCode</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="manage-view-btn" onClick={() => setShowPicker(p => !p)}>
          {showPicker ? 'Hide Segment Picker' : 'Insert Segment…'}
        </button>
        <button className="manage-view-btn" onClick={() => setShowStylePanel(p => !p)}>
          {showStylePanel ? 'Hide Formatting Style' : 'Formatting Style…'}
        </button>
        <button
          className="manage-view-btn"
          style={advancedMode ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          onClick={() => setAdvancedMode(p => !p)}
          title="Edit inserted segments individually via a popout editor"
        >
          {advancedMode ? 'Advanced Mode: On' : 'Advanced Mode: Off'}
        </button>
        <button className="manage-view-btn" onClick={copyToClipboard}>
          {copied ? 'Copied!' : format === 'markdown' ? 'Copy as BBCode' : 'Copy to Forum'}
        </button>
        {entry.linkedShows.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {entry.linkedShows.map(s => (
              <span key={s.showUid} style={{ fontSize: 11, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderRadius: 12, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.showName} ({fmtDateOrdinal(s.showDate)})
                <span style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => unlinkShow(s.showUid)}>×</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {showPicker && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, display: 'flex', gap: 12, maxHeight: 340 }}>
          <div style={{ flex: '0 0 220px', overflowY: 'auto' }}>
            <input
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              placeholder="Search shows…"
              className="search-input"
              style={{ width: '100%', marginBottom: 8 }}
            />
            {filteredShows.map(s => (
              <div
                key={s.uid}
                onClick={() => setPickedShowUid(s.uid)}
                title="Browse this show's segments"
                style={{
                  padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#fff',
                  background: pickedShowUid === s.uid ? 'var(--bg-tertiary)' : 'transparent',
                }}
              >
                {s.name}
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{fmtDateOrdinal(s.date)} · {s.matches.length} segment{s.matches.length === 1 ? '' : 's'}</div>
              </div>
            ))}
            {filteredShows.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>No shows found</div>}
          </div>
          <div style={{ flex: 1, minWidth: 260, overflowY: 'auto', borderLeft: '1px solid var(--border-color)', paddingLeft: 12 }}>
            {!pickedShow && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Select a show on the left to browse its segments</div>}
            {pickedShow && pickedShow.matches.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No segments recorded for this show</div>}
            {[...(pickedShow?.matches || [])].map(m => {
              const sides = new Map<number, string[]>()
              for (const c of m.competitors || []) {
                const arr = sides.get(c.side) || []
                arr.push(c.name)
                sides.set(c.side, arr)
              }
              const vsLine = [...sides.entries()].sort((a, b) => a[0] - b[0]).map(([, names]) => names.join(' & ')).join(' vs. ')
              return (
                <div key={m.uid} style={{ padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{m.log_entry || 'Segment'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {m.rating > 0 && (
                        <span style={{ background: ratingColor(m.rating), color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 10, lineHeight: '16px' }}>
                          {formatRatingPct(m.rating, ratingFormat)}
                        </span>
                      )}
                      <button className="manage-view-btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => pickedShow && insertSegment(pickedShow, m)}>Insert</button>
                    </div>
                  </div>
                  {vsLine && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{vsLine}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showStylePanel && <DiaryStylePanel style={style} onChange={persistStyle} />}

      <DiaryToolbar
        format={format} onCommand={runToolbarCommand} onColor={runColor} onSize={runSize} onImage={runImage}
        onUndo={runUndo} onRedo={runRedo} canUndo={bodyHistory.canUndo} canRedo={bodyHistory.canRedo}
        onOpenCollateral={() => setShowCollateral(p => !p)}
      />

      {showCollateral && <CollateralPanel fedUid={fedUid} />}

      {advancedMode && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Segments in this entry
          </div>
          {segments.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No segments inserted yet — use "Insert Segment…" above, then edit them here.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {segments.map(seg => (
              <div key={seg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'var(--bg-tertiary)', borderRadius: 6, padding: '6px 10px' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{seg.heading}</div>
                  {seg.vsLine && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{seg.vsLine}</div>}
                </div>
                <button className="manage-view-btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setEditingSegment(seg)}>Edit…</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        ref={bodyRef}
        value={body}
        onChange={e => applySnapshot({ text: e.target.value, selStart: e.target.selectionStart, selEnd: e.target.selectionEnd }, false)}
        onKeyDown={e => {
          const mod = e.ctrlKey || e.metaKey
          if (!mod) return
          const key = e.key.toLowerCase()
          if (key === 'z' && !e.shiftKey) { e.preventDefault(); runUndo() }
          else if (key === 'y' || (key === 'z' && e.shiftKey)) { e.preventDefault(); runRedo() }
        }}
        placeholder={format === 'bbcode' ? 'Write your diary in BBCode…' : 'Write your diary in Markdown…'}
        style={{
          flex: 1, resize: 'none', background: 'var(--bg-secondary)', color: '#fff',
          border: '1px solid var(--border-color)', borderRadius: 8, padding: 14,
          fontFamily: 'var(--font-mono, monospace)', fontSize: 13, lineHeight: 1.5,
        }}
      />

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Preview — how this will look on the forum
        </div>
        {cleanBody ? (
          <div
            style={{
              background: 'var(--bg-tertiary)', color: '#fff', borderRadius: 8, padding: '10px 14px',
              fontSize: 13, lineHeight: 1.6, maxHeight: 200, overflowY: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: bbcodeToHtml(exportText) }}
          />
        ) : (
          <div style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderRadius: 8, padding: 12, fontSize: 12 }}>—</div>
        )}
      </div>

      {editingSegment && (
        <DiarySegmentModal
          segment={editingSegment}
          format={format}
          style={style}
          onSave={saveSegmentEdit}
          onRemove={() => removeSegmentEdit(editingSegment.id)}
          onCancel={() => setEditingSegment(null)}
        />
      )}
    </div>
  )
}
