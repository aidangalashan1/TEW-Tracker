import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../../context/AppContext'
import { api, DEFAULT_DIARY_STYLE, type PastShow, type DiarySegment, type DiaryStyleConfig } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { fmtDateOrdinal } from '../../../lib/dates'
import { ratingColor } from '../../../lib/colors'
import { formatRatingPct } from '../../../lib/grade'
import { matchToSegment, renderSegment, replaceRenderedSegment, removeRenderedSegment, markdownToBBCode, bbcodeToHtml } from '../../../lib/diaryFormat'
import { applyToolbarCommand, applyColor, applySize, applyImage, type ToolbarCommand } from '../../../lib/textEditCommands'
import { useTextUndoRedo } from '../../../lib/useTextUndoRedo'
import { DiaryToolbar } from './DiaryToolbar'
import { CollateralPanel } from './CollateralPanel'
import { DiaryStylePanel } from './DiaryStylePanel'
import { DiarySegmentModal } from './DiarySegmentModal'
import { DiaryVisualEditor } from './DiaryVisualEditor'

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
  const resolveImage = (relPath: string) => img(relPath)

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
  // Only one overlay open at a time — picker/style/collateral used to be
  // inline panels that all stacked above the textarea simultaneously,
  // crowding out the editor and preview. They're modals now so the editor
  // stays the fixed, dominant element on the page no matter what's open.
  const [openModal, setOpenModal] = useState<'picker' | 'style' | 'collateral' | null>(null)
  const [advancedMode, setAdvancedMode] = useState(false)
  // Visual mode replaces the old static "preview" — it's a live WYSIWYG
  // surface you build the post in directly, with BBCode generated in the
  // background from every edit. It only makes sense for the bbcode format
  // (the visual editor always emits BBCode), so markdown entries stay in
  // Source mode.
  const [editorMode, setEditorMode] = useState<'source' | 'visual'>('visual')
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
      setEditorMode(entry.format === 'markdown' ? 'source' : 'visual')
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

  // Same idea as applySnapshot, but for edits coming from the visual
  // editor's contentEditable div rather than the (unmounted, in Visual
  // mode) textarea — nothing to focus/select there, so it just updates the
  // text and persists.
  const updateBodyFromVisual = (next: string) => {
    bodyHistory.set({ text: next, selStart: next.length, selEnd: next.length }, false)
    debouncedPersist({ body: next })
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

  // The body always gets only the plain rendered segment text — no marker
  // or bookkeeping tags are ever inserted, so it's always safe to copy
  // straight to a forum. When Advanced Mode is on, the segment is also
  // tracked by that exact rendered text so it can be found and swapped for
  // a re-rendered version later; if the text can no longer be found (the
  // user hand-edited or deleted it), edits/removals leave the body alone.
  const insertSegment = (show: PastShow, match: PastShow['matches'][number]) => {
    const seg = matchToSegment(match, show, style.sideSeparator, style.vsSeparator)
    const rendered = renderSegment(seg, format, style, resolveImage)
    insertAtCursor(rendered)
    if (advancedMode) {
      persistSegments([...segments, { ...seg, renderedText: rendered }])
    }
    linkShow(show)
  }

  const saveSegmentEdit = (updated: DiarySegment) => {
    const rendered = renderSegment(updated, format, style, resolveImage)
    const nextBody = replaceRenderedSegment(body, updated.renderedText, rendered)
    applySnapshot({ text: nextBody, selStart: nextBody.length, selEnd: nextBody.length }, true)
    persistSegments(segments.map(s => s.id === updated.id ? { ...updated, renderedText: rendered } : s))
    setEditingSegment(null)
  }

  const removeSegmentEdit = (id: string) => {
    const seg = segments.find(s => s.id === id)
    const nextBody = seg ? removeRenderedSegment(body, seg.renderedText) : body
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

  const exportText = format === 'markdown' ? markdownToBBCode(body) : body

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
          onChange={e => {
            const f = e.target.value as 'bbcode' | 'markdown'
            setFormat(f); debouncedPersist({ format: f })
            if (f === 'markdown') setEditorMode('source') // the visual editor only ever emits BBCode
          }}
          style={{ background: 'var(--bg-secondary)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '8px 10px' }}
        >
          <option value="bbcode">BBCode</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="manage-view-btn" onClick={() => setOpenModal('picker')}>Insert Segment…</button>
        <button className="manage-view-btn" onClick={() => setOpenModal('style')}>Formatting Style…</button>
        <button className="manage-view-btn" onClick={() => setOpenModal('collateral')}>Collateral…</button>
        <button
          className="manage-view-btn"
          style={advancedMode ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          onClick={() => setAdvancedMode(p => !p)}
          title="Show the segments panel to edit inserted segments individually"
        >
          {advancedMode ? 'Advanced Mode: On' : 'Advanced Mode: Off'}
        </button>
        {format === 'bbcode' && (
          <div className="flex" style={{ border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
            {(['visual', 'source'] as const).map(m => (
              <button
                key={m}
                className="manage-view-btn"
                style={{ border: 'none', borderRadius: 0, background: editorMode === m ? 'var(--accent)' : 'transparent', color: editorMode === m ? '#fff' : undefined }}
                onClick={() => setEditorMode(m)}
              >
                {m === 'visual' ? 'Visual Editor' : 'Source'}
              </button>
            ))}
          </div>
        )}
        <button className="manage-view-btn" onClick={copyToClipboard} style={{ marginLeft: 'auto' }}>
          {copied ? 'Copied!' : format === 'markdown' ? 'Copy as BBCode' : 'Copy to Forum'}
        </button>
      </div>

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

      {editorMode === 'source' && (
        <DiaryToolbar
          format={format} onCommand={runToolbarCommand} onColor={runColor} onSize={runSize} onImage={runImage}
          onUndo={runUndo} onRedo={runRedo} canUndo={bodyHistory.canUndo} canRedo={bodyHistory.canRedo}
          onOpenCollateral={() => setOpenModal('collateral')}
        />
      )}

      {/* The editor column is always the dominant element on the page;
          Advanced Mode adds a sidebar next to it instead of pushing it
          down, so neither ever has to fight the other for height. */}
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {editorMode === 'visual' ? (
            <DiaryVisualEditor body={body} onChange={updateBodyFromVisual} />
          ) : (
            <>
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
                  flex: 1, minHeight: 120, resize: 'none', background: 'var(--bg-secondary)', color: '#fff',
                  border: '1px solid var(--border-color)', borderRadius: 8, padding: 14,
                  fontFamily: 'var(--font-mono, monospace)', fontSize: 13, lineHeight: 1.5,
                }}
              />

              <div style={{ flex: '0 0 auto' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Preview — how this will look on the forum
                </div>
                {body ? (
                  <div
                    style={{
                      background: 'var(--bg-tertiary)', color: '#fff', borderRadius: 8, padding: '10px 14px',
                      fontSize: 13, lineHeight: 1.6, maxHeight: 180, overflowY: 'auto',
                    }}
                    dangerouslySetInnerHTML={{ __html: bbcodeToHtml(exportText) }}
                  />
                ) : (
                  <div style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderRadius: 8, padding: 12, fontSize: 12 }}>—</div>
                )}
              </div>
            </>
          )}
        </div>

        {advancedMode && (
          <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
              Segments in this entry
            </div>
            {segments.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No segments inserted yet — use "Insert Segment…" above, then edit them here.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {segments.map(seg => (
                <div key={seg.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 6, padding: '6px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{seg.heading}</div>
                  {seg.vsLine && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{seg.vsLine}</div>}
                  <button className="manage-view-btn" style={{ fontSize: 11, padding: '2px 8px', marginTop: 4 }} onClick={() => setEditingSegment(seg)}>Edit…</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {openModal === 'picker' && (
        <ModalShell title="Insert Segment" onClose={() => setOpenModal(null)} maxWidth={720}>
          <div style={{ display: 'flex', gap: 12, height: 420 }}>
            <div style={{ flex: '0 0 220px', overflowY: 'auto' }}>
              <input
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search shows…"
                className="search-input"
                style={{ width: '100%', marginBottom: 8 }}
                autoFocus
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
                        <button className="manage-view-btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => { if (pickedShow) { insertSegment(pickedShow, m); setOpenModal(null) } }}>Insert</button>
                      </div>
                    </div>
                    {vsLine && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{vsLine}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </ModalShell>
      )}

      {openModal === 'style' && (
        <ModalShell title="Formatting Style" onClose={() => setOpenModal(null)} maxWidth={640}>
          <DiaryStylePanel style={style} onChange={persistStyle} />
        </ModalShell>
      )}

      {openModal === 'collateral' && (
        <ModalShell title="Collateral" onClose={() => setOpenModal(null)} maxWidth={640}>
          <CollateralPanel fedUid={fedUid} />
        </ModalShell>
      )}

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

/** Shared portal chrome for the picker/style/collateral overlays — same
 *  modal-overlay/modal classes and backdrop-click-to-close pattern used
 *  throughout the app (see ArcItemModal). */
function ModalShell({ title, maxWidth, onClose, children }: { title: string; maxWidth: number; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ padding: 14, maxHeight: '75vh', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
