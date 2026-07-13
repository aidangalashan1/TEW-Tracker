/** Shared date utilities. TEW stores dates as 'YYYY-MM-DD' strings.
 *  Appending 'T00:00:00' prevents JS from misinterpreting the date as UTC
 *  and shifting it by the local timezone offset. */

export function parseGameDate(d: string): Date {
  return new Date(d + 'T00:00:00')
}

export function fmtDate(d: string): string {
  return parseGameDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtShortDate(d: string): string {
  return parseGameDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtDateOrdinal(s: string | undefined | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s || ''
  const day = d.getDate()
  const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function isToday(d: string, today: string): boolean {
  return d === today
}

export function isThisWeek(d: string, today: string): boolean {
  const dt = parseGameDate(d)
  const td = parseGameDate(today)
  const startOfWeek = new Date(td)
  startOfWeek.setDate(td.getDate() - td.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return dt >= startOfWeek && dt < endOfWeek
}

export function getMonthLabel(d: string): string {
  const dt = parseGameDate(d)
  const now = new Date()
  const diff = now.getTime() - dt.getTime()
  const daysAgo = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (daysAgo < 7) return 'This Week'
  if (daysAgo < 14) return 'Last Week'
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function fmtRating(r: number): string {
  if (r <= 0) return '-'
  return r.toString()
}

export function fmtNum(n: number): string {
  if (n <= 0) return '-'
  return n.toLocaleString()
}

/** Adds a contract's remaining days to the game's current date (was top-workers). */
export function calcContractExpiry(gameDate: string | null, daysLeft: number): string {
  if (!gameDate || !daysLeft) return ''
  const d = new Date(gameDate)
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + daysLeft)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Buckets items into contiguous labeled groups, in the order given — the
 *  label function decides "Today"/"This Week"/month-name/etc; consecutive
 *  items sharing a label join the same group (was schedule/show-history). */
export function groupByLabel<T>(items: T[], labelFn: (item: T) => string): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = []
  let current: { label: string; items: T[] } | null = null
  for (const item of items) {
    const label = labelFn(item)
    if (!current || current.label !== label) {
      current = { label, items: [] }
      groups.push(current)
    }
    current.items.push(item)
  }
  return groups
}
