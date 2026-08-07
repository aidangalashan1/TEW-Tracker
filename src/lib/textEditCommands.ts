export type DiaryFormat = 'bbcode' | 'markdown'

interface Selection { start: number; end: number }

/** Applies a text-editing command to `body` given the current textarea
 *  selection, returning the new body plus where the selection should land
 *  afterward. Wrap-style commands (bold, italic, …) re-select the wrapped
 *  text so a follow-up keystroke types over it; block commands place the
 *  caret after the inserted block. */
export interface EditResult {
  body: string
  selectionStart: number
  selectionEnd: number
}

function wrapSelection(body: string, sel: Selection, before: string, after: string, placeholder: string): EditResult {
  const selected = body.slice(sel.start, sel.end) || placeholder
  const next = body.slice(0, sel.start) + before + selected + after + body.slice(sel.end)
  return {
    body: next,
    selectionStart: sel.start + before.length,
    selectionEnd: sel.start + before.length + selected.length,
  }
}

/** Prefixes every line touched by the selection (extended to full line
 *  boundaries) with a per-line string. */
function prefixLines(body: string, sel: Selection, prefixFor: (lineIndex: number) => string): EditResult {
  const lineStart = body.lastIndexOf('\n', sel.start - 1) + 1
  let lineEnd = body.indexOf('\n', sel.end)
  if (lineEnd === -1) lineEnd = body.length
  const block = body.slice(lineStart, lineEnd)
  const lines = block.length ? block.split('\n') : ['']
  const newBlock = lines.map((l, i) => prefixFor(i) + l).join('\n')
  const next = body.slice(0, lineStart) + newBlock + body.slice(lineEnd)
  return { body: next, selectionStart: lineStart, selectionEnd: lineStart + newBlock.length }
}

function bbcodeList(body: string, sel: Selection, numbered: boolean): EditResult {
  const selected = body.slice(sel.start, sel.end) || 'List item'
  const items = selected.split('\n').filter(l => l.trim() !== '')
  const lines = items.length ? items : ['List item']
  const tag = numbered ? '[list=1]' : '[list]'
  const inner = lines.map(l => `[*]${l}`).join('\n')
  const block = `${tag}\n${inner}\n[/list]`
  const next = body.slice(0, sel.start) + block + body.slice(sel.end)
  const pos = sel.start + block.length
  return { body: next, selectionStart: pos, selectionEnd: pos }
}

export type ToolbarCommand =
  | 'bold' | 'italic' | 'underline' | 'strike' | 'url' | 'quote' | 'code'
  | 'bullets' | 'numbered' | 'alignLeft' | 'alignCenter' | 'alignRight'

/** BBCode-only concepts (underline, align, color, size have no Markdown
 *  equivalent) always emit raw BBCode tags, even in Markdown mode — they pass
 *  straight through markdownToBBCode untouched since it only rewrites
 *  Markdown syntax. */
export function applyToolbarCommand(command: ToolbarCommand, format: DiaryFormat, body: string, sel: Selection, urlHref?: string): EditResult {
  const md = format === 'markdown'
  switch (command) {
    case 'bold':
      return wrapSelection(body, sel, md ? '**' : '[b]', md ? '**' : '[/b]', 'bold text')
    case 'italic':
      return wrapSelection(body, sel, md ? '*' : '[i]', md ? '*' : '[/i]', 'italic text')
    case 'underline':
      return wrapSelection(body, sel, '[u]', '[/u]', 'underlined text')
    case 'strike':
      return wrapSelection(body, sel, md ? '~~' : '[s]', md ? '~~' : '[/s]', 'strikethrough text')
    case 'url': {
      const href = urlHref || 'https://'
      return md
        ? wrapSelection(body, sel, '[', `](${href})`, 'link text')
        : wrapSelection(body, sel, `[url=${href}]`, '[/url]', 'link text')
    }
    case 'quote':
      return md
        ? prefixLines(body, sel, () => '> ')
        : wrapSelection(body, sel, '[quote]\n', '\n[/quote]', 'quoted text')
    case 'code':
      return md
        ? wrapSelection(body, sel, '`', '`', 'code')
        : wrapSelection(body, sel, '[code]', '[/code]', 'code')
    case 'bullets':
      return md ? prefixLines(body, sel, () => '- ') : bbcodeList(body, sel, false)
    case 'numbered':
      return md ? prefixLines(body, sel, i => `${i + 1}. `) : bbcodeList(body, sel, true)
    // Invision Community's BBCode parser uses dedicated [left]/[center]/[right]
    // tags rather than vBulletin-style [align=x] — this codebase targets
    // Grey Dog Software's (Invision-hosted) forum, so match that syntax.
    case 'alignLeft':
      return wrapSelection(body, sel, '[left]', '[/left]', 'text')
    case 'alignCenter':
      return wrapSelection(body, sel, '[center]', '[/center]', 'text')
    case 'alignRight':
      return wrapSelection(body, sel, '[right]', '[/right]', 'text')
  }
}

export function applyColor(body: string, sel: Selection, hex: string): EditResult {
  return wrapSelection(body, sel, `[color=${hex}]`, '[/color]', 'colored text')
}

export function applySize(body: string, sel: Selection, size: number): EditResult {
  return wrapSelection(body, sel, `[size=${size}]`, '[/size]', 'text')
}

/** Images aren't a wrap-selection command — the URL is the tag's content in
 *  BBCode ([img]url[/img]), not the selected text, so this inserts a fresh
 *  tag at the cursor (Markdown keeps the selection as alt text) rather than
 *  wrapping whatever's selected. */
export function applyImage(body: string, sel: Selection, format: DiaryFormat, href: string): EditResult {
  const tag = format === 'markdown' ? `![${body.slice(sel.start, sel.end) || 'image'}](${href})` : `[img]${href}[/img]`
  const next = body.slice(0, sel.start) + tag + body.slice(sel.end)
  const pos = sel.start + tag.length
  return { body: next, selectionStart: pos, selectionEnd: pos }
}
