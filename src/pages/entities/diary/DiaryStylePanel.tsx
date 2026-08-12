import { DIARY_TEMPLATE_TOKENS, DEFAULT_DIARY_TEMPLATE, type DiaryStyleConfig, type DiaryLabelMode } from '../../../api'

/** Collapsible panel that edits the entry's DiaryStyleConfig — the
 *  structured fields (prefixes/suffixes, colors, separators) control what
 *  each piece of a segment looks like; the free-form template at the
 *  bottom controls how they're arranged, with no fixed layout imposed —
 *  the user can reorder, repeat, drop, or surround placeholders with
 *  whatever literal text/markup they like. */
export function DiaryStylePanel({ style, onChange }: { style: DiaryStyleConfig; onChange: (patch: Partial<DiaryStyleConfig>) => void }) {
  const toggle = (key: keyof DiaryStyleConfig) => onChange({ [key]: !style[key] } as Partial<DiaryStyleConfig>)

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-color)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
  })

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={sectionLabel}>Segment Heading</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
          <input className="search-input" placeholder='Prefix, e.g. "SEGMENT 1: "' value={style.headingPrefix} onChange={e => onChange({ headingPrefix: e.target.value })} style={{ width: 170 }} />
          <input className="search-input" placeholder="Suffix" value={style.headingSuffix} onChange={e => onChange({ headingSuffix: e.target.value })} style={{ width: 120 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={chipStyle(style.headingBold)} onClick={() => toggle('headingBold')}><b>B</b></span>
          <span style={chipStyle(style.headingItalic)} onClick={() => toggle('headingItalic')}><i>I</i></span>
          <span style={chipStyle(style.headingUnderline)} onClick={() => toggle('headingUnderline')}><u>U</u></span>
          <ColorPicker value={style.headingColor} onChange={v => onChange({ headingColor: v })} />
          <input
            type="number" min={0} placeholder="Size"
            value={style.headingSize || ''} onChange={e => onChange({ headingSize: Number(e.target.value) || 0 })}
            style={{ ...selectStyle, width: 64 }}
          />
        </div>
      </div>

      <div>
        <div style={sectionLabel}>Segment Body / Notes</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
          <input className="search-input" placeholder="Prefix" value={style.bodyPrefix} onChange={e => onChange({ bodyPrefix: e.target.value })} style={{ width: 170 }} />
          <input className="search-input" placeholder="Suffix" value={style.bodySuffix} onChange={e => onChange({ bodySuffix: e.target.value })} style={{ width: 120 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={chipStyle(style.bodyItalic)} onClick={() => toggle('bodyItalic')}><i>I</i></span>
          <ColorPicker value={style.bodyColor} onChange={v => onChange({ bodyColor: v })} />
        </div>
      </div>

      <div>
        <div style={sectionLabel}>Competitors Line</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={labelStyle}>Side separator
            <input className="search-input" value={style.sideSeparator} onChange={e => onChange({ sideSeparator: e.target.value })} style={{ width: 60 }} />
          </label>
          <label style={labelStyle}>Vs. separator
            <input className="search-input" value={style.vsSeparator} onChange={e => onChange({ vsSeparator: e.target.value })} style={{ width: 60 }} />
          </label>
        </div>
      </div>

      <div>
        <div style={sectionLabel}>Rating</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="search-input" placeholder='Prefix, e.g. "Rating: "' value={style.ratingPrefix} onChange={e => onChange({ ratingPrefix: e.target.value })} style={{ width: 130 }} />
          <input className="search-input" placeholder='Suffix, e.g. "%"' value={style.ratingSuffix} onChange={e => onChange({ ratingSuffix: e.target.value })} style={{ width: 80 }} />
        </div>
      </div>

      <div>
        <div style={sectionLabel}>Worker Images &amp; Labels</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={labelStyle}>
            <input type="checkbox" checked={style.autoAddWorkerImages} onChange={() => toggle('autoAddWorkerImages')} />
            Auto-add worker images to new segments
          </label>
          <label style={labelStyle}>
            <input type="checkbox" checked={style.showImages} onChange={() => toggle('showImages')} />
            Show images by default
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }} title="Controls whether the competitors' names also appear as text — independent of whether images are shown">Names in vs.-line:</span>
          {(['text', 'both', 'image'] as DiaryLabelMode[]).map(mode => (
            <span key={mode} style={chipStyle(style.labelMode === mode)} onClick={() => onChange({ labelMode: mode })}>
              {mode === 'text' ? 'Text only' : mode === 'both' ? 'Text + images' : 'Hide text'}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div style={sectionLabel}>Segment Template — arrange the pieces however you like</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
          Available placeholders: {DIARY_TEMPLATE_TOKENS.map(t => <code key={t} style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3, marginRight: 4 }}>{t}</code>)}
          — mix in your own text/BBCode, reorder, repeat, or drop any of them. A line that's just one empty placeholder is skipped automatically.
        </div>
        <textarea
          value={style.template}
          onChange={e => onChange({ template: e.target.value })}
          spellCheck={false}
          style={{
            width: '100%', minHeight: 110, resize: 'vertical', fontFamily: 'var(--font-mono, monospace)', fontSize: 12,
            background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: 8, boxSizing: 'border-box',
          }}
        />
        <button className="manage-view-btn" style={{ marginTop: 6, fontSize: 11 }} onClick={() => onChange({ template: DEFAULT_DIARY_TEMPLATE })}>Reset to Default Template</button>
      </div>
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff'}
        onChange={e => onChange(e.target.value)}
        style={{ width: 26, height: 26, padding: 0, border: '1px solid var(--border-color)', borderRadius: 4, background: 'none', cursor: 'pointer' }}
        title="Pick any color"
      />
      <input
        className="search-input" placeholder="e.g. #e74c3c" value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: 90, fontSize: 11 }}
      />
      {value && <span style={{ fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onChange('')} title="Clear color">×</span>}
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
}
const selectStyle: React.CSSProperties = {
  background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--border-color)',
  borderRadius: 6, padding: '4px 6px', fontSize: 11,
}
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer',
}
