import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../../../context/AppContext'
import type { DiarySegment, DiaryLabelMode, DiaryStyleConfig } from '../../../api'
import { renderSegment, type DiaryFormat } from '../../../lib/diaryFormat'

interface DiarySegmentModalProps {
  segment: DiarySegment
  format: DiaryFormat
  style: DiaryStyleConfig
  onSave: (segment: DiarySegment) => void
  onRemove: () => void
  onCancel: () => void
}

/** Advanced-mode popout for tweaking one already-inserted diary segment —
 *  heading/body text, and per-segment overrides of the global image/label
 *  style. Follows ArcItemModal's draft-then-confirm pattern: nothing
 *  reaches the diary body until Save is clicked. */
export function DiarySegmentModal({ segment, format, style, onSave, onRemove, onCancel }: DiarySegmentModalProps) {
  const { img } = useApp()
  const [draft, setDraft] = useState<DiarySegment>(segment)
  const patch = (p: Partial<DiarySegment>) => setDraft(d => ({ ...d, ...p }))

  const resolveWorkerImage = (picture: string) => img('People/' + picture)
  const preview = renderSegment(draft, format, style, resolveWorkerImage)

  const cancelSelf = (e: React.MouseEvent) => { e.stopPropagation(); onCancel() }

  const overrideChip = (active: boolean): React.CSSProperties => ({
    padding: '3px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-color)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
  })

  return createPortal(
    <div className="modal-overlay" onClick={cancelSelf}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Segment</span>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body" style={{ padding: 14, maxHeight: 560, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <div className="section-label mb-1">Heading</div>
            <input
              className="search-input" style={{ width: '100%' }}
              value={draft.heading} onChange={e => patch({ heading: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <div className="section-label mb-1">Competitors line</div>
            <input
              className="search-input" style={{ width: '100%' }}
              value={draft.vsLine} onChange={e => patch({ vsLine: e.target.value })}
            />
          </div>

          <div>
            <div className="section-label mb-1">Body / notes</div>
            <textarea
              className="search-input" style={{ width: '100%', minHeight: 90, resize: 'vertical', fontFamily: 'inherit', padding: '6px 8px' }}
              value={draft.notes} onChange={e => patch({ notes: e.target.value })}
              placeholder="Extra prose for this segment…"
            />
          </div>

          {draft.competitors.length > 0 && (
            <div>
              <div className="section-label mb-1">Workers</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {draft.competitors.map(c => (
                  <div key={c.worker_uid} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', borderRadius: 6, padding: '4px 8px' }}>
                    {c.picture ? <img src={img('People/' + c.picture)} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-tertiary)' }} />}
                    <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="section-label mb-1">This segment's style (overrides default)</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Images:</span>
                <span style={overrideChip(draft.showImages === null)} onClick={() => patch({ showImages: null })}>Default</span>
                <span style={overrideChip(draft.showImages === true)} onClick={() => patch({ showImages: true })}>Show</span>
                <span style={overrideChip(draft.showImages === false)} onClick={() => patch({ showImages: false })}>Hide</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Labels:</span>
                <span style={overrideChip(draft.labelMode === null)} onClick={() => patch({ labelMode: null })}>Default</span>
                {(['text', 'image', 'both'] as DiaryLabelMode[]).map(mode => (
                  <span key={mode} style={overrideChip(draft.labelMode === mode)} onClick={() => patch({ labelMode: mode })}>
                    {mode === 'text' ? 'Text' : mode === 'image' ? 'Image' : 'Both'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="section-label mb-1">Preview</div>
            <pre style={{
              background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderRadius: 6, padding: 10,
              fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono, monospace)', margin: 0,
            }}>{preview}</pre>
          </div>
        </div>
        <div className="flex justify-between gap-2" style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)' }}>
          <button className="manage-view-btn" style={{ color: 'var(--accent)' }} onClick={onRemove}>Remove Segment</button>
          <div className="flex gap-2">
            <button className="manage-view-btn" onClick={onCancel}>Cancel</button>
            <button className="btn primary" onClick={() => onSave(draft)}>Save</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
