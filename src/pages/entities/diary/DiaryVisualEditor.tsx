import { useEffect, useRef } from 'react'
import { bbcodeToHtml, htmlToBBCode } from '../../../lib/diaryFormat'

interface DiaryVisualEditorProps {
  body: string
  onChange: (bbcode: string) => void
}

/** A live WYSIWYG surface that replaces the old static "preview" — you
 *  build the post visually (bold/italic/lists/alignment/color/images…) and
 *  every edit is converted back into BBCode in the background via
 *  `htmlToBBCode`, so `body` (the actual persisted/postable text) always
 *  stays in sync with what's on screen. Formatting commands go through the
 *  browser's native contentEditable machinery (`execCommand`) rather than
 *  a hand-rolled selection model — it's deprecated but still the pragmatic
 *  choice for a bundled Chromium/Electron target like this app's. */
export function DiaryVisualEditor({ body, onChange }: DiaryVisualEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Tracks the BBCode this component itself last produced/rendered, so the
  // sync effect can tell "body changed because I typed" (skip — don't blow
  // away the cursor) apart from "body changed some other way, e.g. a
  // segment was inserted or Source mode was edited" (re-render from it).
  const lastSynced = useRef<string | null>(null)

  useEffect(() => {
    if (ref.current && body !== lastSynced.current) {
      ref.current.innerHTML = body ? bbcodeToHtml(body) : ''
      lastSynced.current = body
    }
  }, [body])

  const emitChange = () => {
    if (!ref.current) return
    const bbcode = htmlToBBCode(ref.current)
    lastSynced.current = bbcode
    onChange(bbcode)
  }

  const exec = (cmd: string, value?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, value)
    emitChange()
  }

  const insertLink = () => {
    const url = window.prompt('Link URL:')
    if (url) exec('createLink', url)
  }
  const insertImage = () => {
    const url = window.prompt('Image URL:')
    if (url) exec('insertImage', url)
  }

  const toolBtn = (label: React.ReactNode, onClick: () => void, title?: string) => (
    <button
      type="button"
      className="manage-view-btn"
      style={{ fontSize: 12, padding: '3px 8px' }}
      title={title}
      onMouseDown={e => e.preventDefault()} // keep focus/selection in the editor, not the button
      onClick={onClick}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        {toolBtn(<b>B</b>, () => exec('bold'), 'Bold')}
        {toolBtn(<i>I</i>, () => exec('italic'), 'Italic')}
        {toolBtn(<u>U</u>, () => exec('underline'), 'Underline')}
        {toolBtn(<s>S</s>, () => exec('strikeThrough'), 'Strikethrough')}
        {toolBtn('• List', () => exec('insertUnorderedList'), 'Bulleted list')}
        {toolBtn('1. List', () => exec('insertOrderedList'), 'Numbered list')}
        {toolBtn('❝', () => exec('formatBlock', 'blockquote'), 'Quote')}
        {toolBtn('⟵', () => exec('justifyLeft'), 'Align left')}
        {toolBtn('↔', () => exec('justifyCenter'), 'Align center')}
        {toolBtn('⟶', () => exec('justifyRight'), 'Align right')}
        <input
          type="color"
          onChange={e => exec('foreColor', e.target.value)}
          title="Text color"
          style={{ width: 28, height: 26, padding: 0, border: '1px solid var(--border-color)', borderRadius: 4, background: 'none', cursor: 'pointer' }}
        />
        <select
          defaultValue=""
          onChange={e => { if (e.target.value) exec('fontSize', e.target.value); e.target.value = '' }}
          title="Text size"
          style={{ background: 'var(--bg-tertiary)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 4px', fontSize: 11 }}
        >
          <option value="">Size</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">X-Large</option>
          <option value="6">Huge</option>
        </select>
        {toolBtn('Link', insertLink, 'Insert link')}
        {toolBtn('Image', insertImage, 'Insert image')}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder="Build your post here…"
        style={{
          flex: 1, minHeight: 160, background: 'var(--bg-tertiary)', color: '#fff',
          border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px',
          fontSize: 13, lineHeight: 1.6, overflowY: 'auto',
        }}
      />
    </div>
  )
}
