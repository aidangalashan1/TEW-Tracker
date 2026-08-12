import type { PastShow, PastShowMatch, DiarySegment, DiaryStyleConfig, DiaryImageAlign } from '../api'
import { DEFAULT_DIARY_STYLE } from '../api'

export type DiaryFormat = 'bbcode' | 'markdown'

/** Converts a raw past-show match into the structured, re-editable segment
 *  record that both the inline text render and the advanced-mode editor
 *  work from. `show`, if given, captures its logo as the segment's banner
 *  image (placed wherever the style template's {banner} token sits). */
export function matchToSegment(match: PastShowMatch, show?: PastShow, sideSeparator = ' & ', vsSeparator = ' vs. '): DiarySegment {
  const sides = new Map<number, string[]>()
  for (const comp of match.competitors || []) {
    const arr = sides.get(comp.side) || []
    arr.push(comp.name)
    sides.set(comp.side, arr)
  }
  const vsLine = [...sides.entries()].sort((a, b) => a[0] - b[0]).map(([, names]) => names.join(sideSeparator)).join(vsSeparator)
  return {
    id: 'seg-' + Math.random().toString(36).slice(2, 10),
    heading: match.log_entry || 'Segment',
    notes: '',
    vsLine,
    rating: match.rating || 0,
    competitors: match.competitors || [],
    bannerImage: show?.logo ? (show.is_tv ? 'TV/' : 'Events/') + show.logo : null,
    showImages: null,
    labelMode: null,
    renderedText: '',
  }
}

function wrapHeading(text: string, format: DiaryFormat, style: DiaryStyleConfig): string {
  let out = `${style.headingPrefix}${text}${style.headingSuffix}`
  if (format === 'bbcode') {
    if (style.headingItalic) out = `[i]${out}[/i]`
    if (style.headingUnderline) out = `[u]${out}[/u]`
    if (style.headingBold) out = `[b]${out}[/b]`
    if (style.headingColor) out = `[color=${style.headingColor}]${out}[/color]`
    if (style.headingSize > 0) out = `[size=${style.headingSize}]${out}[/size]`
  } else {
    if (style.headingItalic) out = `*${out}*`
    if (style.headingBold) out = `**${out}**`
  }
  return out
}

function wrapBody(text: string, format: DiaryFormat, style: DiaryStyleConfig): string {
  let out = `${style.bodyPrefix}${text}${style.bodySuffix}`
  if (format === 'bbcode') {
    if (style.bodyItalic) out = `[i]${out}[/i]`
    if (style.bodyColor) out = `[color=${style.bodyColor}]${out}[/color]`
  } else {
    if (style.bodyItalic) out = `*${out}*`
  }
  return out
}

function imageTag(src: string, format: DiaryFormat, widthPx: number): string {
  if (format === 'bbcode') return widthPx > 0 ? `[img width=${widthPx}]${src}[/img]` : `[img]${src}[/img]`
  return widthPx > 0 ? `<img src="${src}" width="${widthPx}" />` : `![](${src})`
}

/** Wraps a block of one or more image tags in an alignment tag. BBCode's
 *  [left]/[center]/[right] tags (already understood by the forum-preview
 *  renderer) are reused directly; Markdown gets an equivalent `<div
 *  align>` since inline HTML is generally accepted there too. No-op for
 *  'none' or empty text. */
function wrapAlign(text: string, format: DiaryFormat, align: DiaryImageAlign): string {
  if (!text || align === 'none') return text
  if (format === 'bbcode') return `[${align}]${text}[/${align}]`
  return `<div align="${align}">\n\n${text}\n\n</div>`
}

/** Substitutes {token} placeholders in a free-form template with rendered
 *  pieces. A line that consists solely of one placeholder is dropped
 *  entirely when that piece is empty (so an unused {banner}/{images}/etc.
 *  doesn't leave a blank gap) — any other line, including ones mixing a
 *  placeholder with the user's own literal text, is kept as-is. */
function applyTemplate(template: string, pieces: Record<string, string>): string {
  const outLines: string[] = []
  for (const line of template.split('\n')) {
    const soleToken = line.trim().match(/^\{(\w+)\}$/)?.[1]
    let resolved = line
    for (const [key, val] of Object.entries(pieces)) resolved = resolved.split(`{${key}}`).join(val)
    if (soleToken != null && pieces[soleToken] !== undefined && resolved.trim() === '') continue
    outLines.push(resolved)
  }
  return outLines.join('\n') + '\n'
}

/** Renders a structured segment into ready-to-paste diary text. The
 *  structured style fields (prefixes/suffixes, colors, separators) decide
 *  what each piece looks like; `style.template` decides how those pieces
 *  are arranged, with total freedom to reorder, repeat, omit, or mix in
 *  arbitrary literal text/markup. `showImages` and `labelMode` are
 *  independent: showImages alone decides whether worker photos render at
 *  all, labelMode only decides whether the vs.-line *text* also shows.
 *  `resolveImage` turns an already-relative path (e.g. "People/x.jpg" or
 *  "Events/y.png") into a fully-qualified URL — the caller supplies
 *  AppContext's `img()`, since this module has no access to it. */
export function renderSegment(
  segment: DiarySegment,
  format: DiaryFormat,
  style: DiaryStyleConfig = DEFAULT_DIARY_STYLE,
  resolveImage?: (relPath: string) => string,
): string {
  const labelMode = segment.labelMode ?? style.labelMode
  const showImages = (segment.showImages ?? style.showImages) || style.autoAddWorkerImages

  const banner = (segment.bannerImage && resolveImage)
    ? wrapAlign(imageTag(resolveImage(segment.bannerImage), format, style.imageWidth), format, style.imageAlign)
    : ''
  const images = (showImages && resolveImage)
    ? wrapAlign(
        segment.competitors.filter(c => c.picture)
          .map(c => imageTag(resolveImage('People/' + c.picture), format, style.imageWidth))
          .join(style.imageLayout === 'inline' ? ' ' : '\n'),
        format, style.imageAlign,
      )
    : ''

  const pieces: Record<string, string> = {
    banner,
    heading: wrapHeading(segment.heading || 'Segment', format, style),
    images,
    vsLine: (labelMode === 'text' || labelMode === 'both') ? segment.vsLine : '',
    rating: segment.rating > 0 ? `${style.ratingPrefix}${segment.rating}${style.ratingSuffix}` : '',
    notes: segment.notes.trim() ? wrapBody(segment.notes.trim(), format, style) : '',
  }

  return applyTemplate(style.template || DEFAULT_DIARY_STYLE.template, pieces)
}

/** Formats a show segment/match as a ready-to-paste snippet — thin
 *  backward-compatible wrapper around matchToSegment + renderSegment. */
export function buildSegmentSnippet(
  match: PastShowMatch,
  format: DiaryFormat,
  style: DiaryStyleConfig = DEFAULT_DIARY_STYLE,
  resolveImage?: (relPath: string) => string,
): string {
  return renderSegment(matchToSegment(match, undefined, style.sideSeparator, style.vsSeparator), format, style, resolveImage)
}

/** Advanced Mode tracks an inserted segment by the exact text it rendered
 *  to, rather than wrapping it in any kind of marker/tag — the diary body
 *  must only ever contain real, postable BBCode/Markdown, never inserted
 *  bookkeeping syntax that would show up broken on a forum. Editing a
 *  segment finds that exact substring and swaps it for the freshly
 *  rendered text; if it can't be found (the user hand-edited or deleted
 *  it), the body is left untouched rather than guessing. */
export function replaceRenderedSegment(body: string, oldText: string, newText: string): string {
  const idx = oldText ? body.indexOf(oldText) : -1
  if (idx === -1) return body
  return body.slice(0, idx) + newText + body.slice(idx + oldText.length)
}

/** Removes a previously-inserted segment's exact rendered text from the
 *  body, or leaves it untouched if it can no longer be found. */
export function removeRenderedSegment(body: string, text: string): string {
  const idx = text ? body.indexOf(text) : -1
  if (idx === -1) return body
  return (body.slice(0, idx) + body.slice(idx + text.length)).replace(/\n{3,}/g, '\n\n')
}

/** Best-effort Markdown -> GDS-style BBCode conversion for export/copy.
 *  Covers the common subset (bold, italic, links, headings, quotes, lists) —
 *  not a full spec implementation, just enough for diary prose. */
export function markdownToBBCode(md: string): string {
  let out = md

  // Bold + italic combined (***text***)
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '[b][i]$1[/i][/b]')
  // Bold (**text** or __text__)
  out = out.replace(/\*\*([^*]+)\*\*/g, '[b]$1[/b]')
  out = out.replace(/__([^_]+)__/g, '[b]$1[/b]')
  // Italic (*text* or _text_)
  out = out.replace(/\*([^*]+)\*/g, '[i]$1[/i]')
  out = out.replace(/(?<![\w])_([^_]+)_(?![\w])/g, '[i]$1[/i]')
  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[url=$2]$1[/url]')
  // Images ![alt](url)
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[img]$2[/img]')
  // Headings -> bold line
  out = out.replace(/^#{1,6}\s+(.*)$/gm, '[b]$1[/b]')
  // Blockquotes
  out = out.replace(/^>\s?(.*)$/gm, '[quote]$1[/quote]')
  // Unordered list items
  out = out.replace(/^[-*]\s+(.*)$/gm, '[*]$1')
  // Wrap consecutive [*] lines in [list]...[/list]
  out = out.replace(/(^\[\*\].*(?:\n\[\*\].*)*)/gm, m => `[list]\n${m}\n[/list]`)

  return out
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const ALIGN_TAG: Record<string, string> = { left: 'left', center: 'center', right: 'right' }
const FONT_SIZE_SCALE: Record<string, number> = { '1': 10, '2': 13, '3': 16, '4': 18, '5': 24, '6': 32, '7': 48 }

function rgbToHex(color: string): string {
  if (!color) return ''
  if (color.startsWith('#')) return color
  const m = color.match(/\d+/g)
  if (!m || m.length < 3) return ''
  return '#' + m.slice(0, 3).map(n => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')).join('')
}

/** Wraps `inner` in BBCode tags for whatever inline styling `el` (a <span>,
 *  <div>, or <p> from contentEditable output) carries via its `style`
 *  attribute — color, size, weight/style/decoration, and text-align. */
function wrapInlineStyle(el: HTMLElement, inner: string): string {
  let out = inner
  const s = el.style
  const color = rgbToHex(s.color)
  if (color) out = `[color=${color}]${out}[/color]`
  const size = s.fontSize ? parseInt(s.fontSize, 10) : 0
  if (size > 0) out = `[size=${size}]${out}[/size]`
  if (s.fontWeight === 'bold' || s.fontWeight === '700' || Number(s.fontWeight) >= 600) out = `[b]${out}[/b]`
  if (s.fontStyle === 'italic') out = `[i]${out}[/i]`
  if (s.textDecorationLine?.includes('underline') || s.textDecoration?.includes('underline')) out = `[u]${out}[/u]`
  if (s.textDecorationLine?.includes('line-through') || s.textDecoration?.includes('line-through')) out = `[s]${out}[/s]`
  const align = ALIGN_TAG[s.textAlign]
  if (align) out = `[${align}]${out}[/${align}]`
  return out
}

function walkToBBCode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  const children = Array.from(el.childNodes).map(walkToBBCode).join('')

  switch (tag) {
    case 'b': case 'strong': return `[b]${children}[/b]`
    case 'i': case 'em': return `[i]${children}[/i]`
    case 'u': return `[u]${children}[/u]`
    case 's': case 'strike': case 'del': return `[s]${children}[/s]`
    case 'a': return `[url=${el.getAttribute('href') || ''}]${children}[/url]`
    case 'img': {
      const w = Number(el.getAttribute('width')) || (el.style.width ? parseInt(el.style.width, 10) : 0)
      const src = el.getAttribute('src') || ''
      return w > 0 ? `[img width=${w}]${src}[/img]` : `[img]${src}[/img]`
    }
    case 'ul': return `[list]\n${children}[/list]\n`
    case 'ol': return `[list=1]\n${children}[/list]\n`
    case 'li': return `[*]${children}\n`
    case 'blockquote': return `[quote]${children}[/quote]\n`
    case 'pre': case 'code': return `[code]${el.textContent || ''}[/code]\n`
    case 'br': return '\n'
    case 'div': case 'p':
      return wrapInlineStyle(el, children) + '\n'
    case 'span':
      return wrapInlineStyle(el, children)
    case 'font': {
      // execCommand('foreColor'/'fontSize') falls back to legacy <font
      // color=.. size=..> in some browsers instead of a styled <span>.
      let out = children
      const sizeAttr = el.getAttribute('size')
      const px = sizeAttr ? FONT_SIZE_SCALE[sizeAttr] : 0
      if (px) out = `[size=${px}]${out}[/size]`
      const colorAttr = el.getAttribute('color')
      if (colorAttr) out = `[color=${colorAttr}]${out}[/color]`
      return out
    }
    default:
      return children
  }
}

/** Converts a contentEditable element's live DOM into BBCode — the inverse
 *  of `bbcodeToHtml` for the subset of markup the visual editor's toolbar
 *  (execCommand-driven) actually produces. Walking the DOM directly (rather
 *  than reparsing an HTML string) means it always reflects exactly what the
 *  browser rendered, including inline styles the browser chose on its own. */
export function htmlToBBCode(root: HTMLElement): string {
  const out = Array.from(root.childNodes).map(walkToBBCode).join('')
  return out.replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '')
}

/** Only allow http(s)/mailto URLs through into href/src attributes — this text
 *  is user-authored and gets rendered via dangerouslySetInnerHTML, so a
 *  javascript: URL smuggled into a [url]/[img] tag shouldn't get to execute. */
function sanitizeHref(href: string): string {
  const trimmed = href.trim()
  return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : '#'
}

/** Renders the export-ready BBCode as HTML for the "what the forum post will
 *  actually look like" preview — not the toolbar-authoring view, which is the
 *  raw markup shown in the editor itself. Covers the same tag set the
 *  toolbar produces; unrecognized/malformed tags just pass through as text. */
export function bbcodeToHtml(bbcode: string): string {
  let html = escapeHtml(bbcode)

  html = html.replace(/\[list=1\]([\s\S]*?)\[\/list\]/gi, (_m, inner) => {
    const items = String(inner).split(/\[\*\]/).map((s: string) => s.trim()).filter(Boolean)
    return `<ol>${items.map((i: string) => `<li>${i}</li>`).join('')}</ol>`
  })
  html = html.replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_m, inner) => {
    const items = String(inner).split(/\[\*\]/).map((s: string) => s.trim()).filter(Boolean)
    return `<ul>${items.map((i: string) => `<li>${i}</li>`).join('')}</ul>`
  })

  html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_m, inner) =>
    `<pre style="background:rgba(255,255,255,0.06);padding:8px 10px;border-radius:6px;white-space:pre-wrap;font-family:monospace;margin:4px 0;">${inner}</pre>`)
  html = html.replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, (_m, inner) =>
    `<blockquote style="border-left:3px solid var(--accent);margin:4px 0;padding:2px 10px;color:var(--text-secondary);">${inner}</blockquote>`)

  html = html.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, (_m, inner) => `<div style="text-align:left;">${inner}</div>`)
  html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, (_m, inner) => `<div style="text-align:center;">${inner}</div>`)
  html = html.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, (_m, inner) => `<div style="text-align:right;">${inner}</div>`)
  html = html.replace(/\[color=(#?[0-9a-fA-F]{3,8}|[a-zA-Z]+)\]([\s\S]*?)\[\/color\]/gi, (_m, c, inner) => `<span style="color:${c};">${inner}</span>`)
  html = html.replace(/\[size=(\d+)\]([\s\S]*?)\[\/size\]/gi, (_m, s, inner) => `<span style="font-size:${s}px;">${inner}</span>`)

  html = html.replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_m, href, text) => `<a href="${sanitizeHref(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`)
  html = html.replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (_m, href) => `<a href="${sanitizeHref(href)}" target="_blank" rel="noopener noreferrer">${href}</a>`)
  html = html.replace(/\[img(?:\s+width=(\d+))?\]([\s\S]*?)\[\/img\]/gi, (_m, w, src) =>
    `<img src="${sanitizeHref(src)}" style="${w ? `width:${w}px;` : 'max-width:100%;'}border-radius:4px;" />`)

  html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<b>$1</b>')
  html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<i>$1</i>')
  html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
  html = html.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')

  return html.replace(/\n/g, '<br/>')
}
