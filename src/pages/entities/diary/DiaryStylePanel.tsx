import type { DiaryStyleConfig, DiaryLabelMode } from '../../../api'

const COLORS = ['', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#ecf0f1']
const SIZES = [0, 12, 14, 18, 24, 32]

/** Collapsible panel that edits the entry's DiaryStyleConfig — the default
 *  formatting applied when a segment is rendered into the body (heading
 *  emphasis/color/size, body emphasis, and how worker images/labels get
 *  attached to inserted segments). */
export function DiaryStylePanel({ style, onChange }: { style: DiaryStyleConfig; onChange: (patch: Partial<DiaryStyleConfig>) => void }) {
  const toggle = (key: keyof DiaryStyleConfig) => onChange({ [key]: !style[key] } as Partial<DiaryStyleConfig>)

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-color)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
  })

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Segment Heading</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={chipStyle(style.headingBold)} onClick={() => toggle('headingBold')}><b>B</b></span>
          <span style={chipStyle(style.headingItalic)} onClick={() => toggle('headingItalic')}><i>I</i></span>
          <span style={chipStyle(style.headingUnderline)} onClick={() => toggle('headingUnderline')}><u>U</u></span>
          <select value={style.headingColor} onChange={e => onChange({ headingColor: e.target.value })} style={selectStyle}>
            {COLORS.map(c => <option key={c} value={c}>{c ? c : 'No color'}</option>)}
          </select>
          <select value={style.headingSize} onChange={e => onChange({ headingSize: Number(e.target.value) })} style={selectStyle}>
            {SIZES.map(s => <option key={s} value={s}>{s ? `${s}px` : 'Default size'}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Segment Body</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={chipStyle(style.bodyItalic)} onClick={() => toggle('bodyItalic')}><i>I</i></span>
          <select value={style.bodyColor} onChange={e => onChange({ bodyColor: e.target.value })} style={selectStyle}>
            {COLORS.map(c => <option key={c} value={c}>{c ? c : 'No color'}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Worker Images &amp; Labels</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={labelStyle}>
            <input type="checkbox" checked={style.autoAddWorkerImages} onChange={() => toggle('autoAddWorkerImages')} />
            Auto-add worker images to new segments
          </label>
          <label style={labelStyle}>
            <input type="checkbox" checked={style.showImages} onChange={() => toggle('showImages')} />
            Show images by default
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Labels:</span>
            {(['text', 'image', 'both'] as DiaryLabelMode[]).map(mode => (
              <span key={mode} style={chipStyle(style.labelMode === mode)} onClick={() => onChange({ labelMode: mode })}>
                {mode === 'text' ? 'Text' : mode === 'image' ? 'Image' : 'Both'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--border-color)',
  borderRadius: 6, padding: '4px 6px', fontSize: 11,
}
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
}
