import type { PastShowMatch } from '../api'

export type DiaryFormat = 'bbcode' | 'markdown'

/** Formats a show segment/match as a ready-to-paste snippet in the diary's
 *  chosen format, for inserting at the cursor. */
export function buildSegmentSnippet(match: PastShowMatch, format: DiaryFormat): string {
  const sides = new Map<number, string[]>()
  for (const comp of match.competitors || []) {
    const arr = sides.get(comp.side) || []
    arr.push(comp.name)
    sides.set(comp.side, arr)
  }
  const sideGroups = [...sides.entries()].sort((a, b) => a[0] - b[0])
  const vsLine = sideGroups.map(([, names]) => names.join(' & ')).join(' vs. ')
  const heading = match.log_entry || 'Segment'
  const ratingLine = match.rating > 0 ? `Rating: ${match.rating}%` : ''

  if (format === 'bbcode') {
    return [
      `[b]${heading}[/b]`,
      vsLine,
      ratingLine,
    ].filter(Boolean).join('\n') + '\n'
  }
  return [
    `**${heading}**`,
    vsLine,
    ratingLine,
  ].filter(Boolean).join('\n') + '\n'
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
  html = html.replace(/\[img\]([\s\S]*?)\[\/img\]/gi, (_m, src) => `<img src="${sanitizeHref(src)}" style="max-width:100%;border-radius:4px;" />`)

  html = html.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<b>$1</b>')
  html = html.replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<i>$1</i>')
  html = html.replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
  html = html.replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')

  return html.replace(/\n/g, '<br/>')
}
