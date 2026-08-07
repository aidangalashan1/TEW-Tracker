import { useState } from 'react'
import type { DiaryFormat, ToolbarCommand } from '../../../lib/textEditCommands'

const BTN_STYLE: React.CSSProperties = {
  background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--border-color)',
  borderRadius: 4, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0, flexShrink: 0,
}

const SIZES = [8, 10, 12, 14, 18, 24, 32, 48]

// All non-letter buttons share this exact viewBox/stroke so they render at
// identical visual weight — mismatched Unicode glyphs (❝ vs </>) rendering at
// wildly different intrinsic sizes was the original inconsistency.
const ICON_PROPS = { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const ICONS: Record<string, JSX.Element> = {
  link: <svg {...ICON_PROPS}><path d="M6.5 9.5a2.5 2.5 0 0 0 3.5.2l2-2a2.5 2.5 0 0 0-3.5-3.5l-1 1" /><path d="M9.5 6.5a2.5 2.5 0 0 0-3.5-.2l-2 2a2.5 2.5 0 0 0 3.5 3.5l1-1" /></svg>,
  quote: <svg {...ICON_PROPS} strokeWidth="1.2"><path d="M4 6.5c0-1.4 1-2.3 2.3-2.5v1.2c-.7.1-1.1.5-1.1 1.1h1.1v3.2H4V6.5Z" fill="currentColor" stroke="none" /><path d="M9.7 6.5c0-1.4 1-2.3 2.3-2.5v1.2c-.7.1-1.1.5-1.1 1.1h1.1v3.2H9.7V6.5Z" fill="currentColor" stroke="none" /></svg>,
  code: <svg {...ICON_PROPS}><path d="M5.5 4.5 2 8l3.5 3.5" /><path d="M10.5 4.5 14 8l-3.5 3.5" /></svg>,
  bullets: <svg {...ICON_PROPS}><circle cx="2.6" cy="4" r="0.9" fill="currentColor" stroke="none" /><circle cx="2.6" cy="8" r="0.9" fill="currentColor" stroke="none" /><circle cx="2.6" cy="12" r="0.9" fill="currentColor" stroke="none" /><path d="M6 4h8M6 8h8M6 12h8" /></svg>,
  numbered: <svg {...ICON_PROPS} strokeWidth="1.1"><text x="0.5" y="5.2" fontSize="4" fill="currentColor" stroke="none" fontWeight="700">1</text><text x="0.5" y="9.2" fontSize="4" fill="currentColor" stroke="none" fontWeight="700">2</text><text x="0.5" y="13.2" fontSize="4" fill="currentColor" stroke="none" fontWeight="700">3</text><path d="M6 4h8M6 8h8M6 12h8" strokeWidth="1.4" /></svg>,
  alignLeft: <svg {...ICON_PROPS}><path d="M2 4h12M2 7.33h8M2 10.67h12M2 14h8" /></svg>,
  alignCenter: <svg {...ICON_PROPS}><path d="M2 4h12M4 7.33h8M2 10.67h12M4 14h8" /></svg>,
  alignRight: <svg {...ICON_PROPS}><path d="M2 4h12M6 7.33h8M2 10.67h12M6 14h8" /></svg>,
  image: <svg {...ICON_PROPS}><rect x="2" y="3" width="12" height="10" rx="1.2" /><circle cx="5.5" cy="6.5" r="1.1" /><path d="m3.5 11.5 3-3 2 2 2.5-2.5 2.5 2.5" /></svg>,
  undo: <svg {...ICON_PROPS}><path d="M3 8a5 5 0 1 1 1.5 3.5" /><path d="M3 4.5V8h3.5" /></svg>,
  redo: <svg {...ICON_PROPS}><path d="M13 8a5 5 0 1 0-1.5 3.5" /><path d="M13 4.5V8H9.5" /></svg>,
  folder: <svg {...ICON_PROPS}><path d="M2 4.5a1 1 0 0 1 1-1h3l1.3 1.5H13a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5Z" /></svg>,
}

function ToolbarButton({ icon, label, title, onClick, italic, underline, strike, disabled }: {
  icon?: keyof typeof ICONS; label?: string; title: string; onClick: () => void
  italic?: boolean; underline?: boolean; strike?: boolean; disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...BTN_STYLE,
        fontStyle: italic ? 'italic' : 'normal',
        textDecoration: underline ? 'underline' : strike ? 'line-through' : 'none',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)' }}
    >
      {icon ? ICONS[icon] : label}
    </button>
  )
}

const SEP: React.CSSProperties = { width: 1, alignSelf: 'stretch', background: 'var(--border-color)', margin: '2px 4px' }

export function DiaryToolbar({ format, onCommand, onColor, onSize, onImage, onUndo, onRedo, canUndo, canRedo, onOpenCollateral }: {
  format: DiaryFormat
  onCommand: (cmd: ToolbarCommand, urlHref?: string) => void
  onColor: (hex: string) => void
  onSize: (size: number) => void
  onImage: (href: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onOpenCollateral: () => void
}) {
  const [color, setColor] = useState('#ff0000')

  const url = () => {
    const href = window.prompt('Link URL:', 'https://')
    if (href) onCommand('url', href)
  }

  const image = () => {
    const href = window.prompt('Image URL:', 'https://')
    if (href) onImage(href)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 6 }}>
      <ToolbarButton icon="undo" title="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} />
      <ToolbarButton icon="redo" title="Redo (Ctrl+Y)" onClick={onRedo} disabled={!canRedo} />
      <div style={SEP} />
      <ToolbarButton label="B" title="Bold" onClick={() => onCommand('bold')} />
      <ToolbarButton label="I" title="Italic" onClick={() => onCommand('italic')} italic />
      <ToolbarButton label="U" title="Underline" onClick={() => onCommand('underline')} underline />
      <ToolbarButton label="S" title="Strikethrough" onClick={() => onCommand('strike')} strike />
      <div style={SEP} />
      <ToolbarButton icon="link" title="Insert link" onClick={url} />
      <ToolbarButton icon="image" title="Insert image (URL)" onClick={image} />
      <ToolbarButton icon="folder" title="Browse collateral (fed logo, show logos, roster photos, your own files)" onClick={onOpenCollateral} />
      <ToolbarButton icon="quote" title="Quote" onClick={() => onCommand('quote')} />
      <ToolbarButton icon="code" title="Code" onClick={() => onCommand('code')} />
      <div style={SEP} />
      <ToolbarButton icon="bullets" title="Bullet list" onClick={() => onCommand('bullets')} />
      <ToolbarButton icon="numbered" title="Numbered list" onClick={() => onCommand('numbered')} />
      <div style={SEP} />
      <ToolbarButton icon="alignLeft" title="Align left" onClick={() => onCommand('alignLeft')} />
      <ToolbarButton icon="alignCenter" title="Align center" onClick={() => onCommand('alignCenter')} />
      <ToolbarButton icon="alignRight" title="Align right" onClick={() => onCommand('alignRight')} />
      <div style={SEP} />
      <input
        type="color"
        value={color}
        title="Font color"
        onChange={e => { setColor(e.target.value); onColor(e.target.value) }}
        style={{ width: 26, height: 26, padding: 0, border: '1px solid var(--border-color)', borderRadius: 4, background: 'none', cursor: 'pointer' }}
      />
      <select
        title="Font size"
        defaultValue=""
        onChange={e => { if (e.target.value) { onSize(Number(e.target.value)); e.target.value = '' } }}
        style={{ background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 4, height: 26, fontSize: 11, padding: '0 4px' }}
      >
        <option value="" disabled>Size</option>
        {SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
      </select>
    </div>
  )
}
