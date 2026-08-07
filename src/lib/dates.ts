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

const ORDINAL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtOrdinal(d: Date): string {
  const day = d.getDate()
  // 11th/12th/13th are the exception to the day%10 pattern (not 11st/12nd/13rd).
  const suffix = day >= 11 && day <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]
  return `${day}${suffix} ${ORDINAL_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtDateOrdinal(s: string | undefined | null): string {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return s || ''
  return fmtOrdinal(d)
}

/** TEW belt-history dates arrive as DD/MM/YYYY, DD/MM/YY, or an ISO
 *  YYYY-MM-DD prefix — distinct from the save's own YYYY-MM-DD game-date
 *  format that parseGameDate/fmtDateOrdinal above expect. */
export function parseFlexibleDate(s: string): Date | null {
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]))
  const dmy2 = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (dmy2) {
    const year = parseInt(dmy2[3])
    // Years 00-49 are 2000-2049, years 50-99 are 1950-1999
    const fullYear = year < 50 ? 2000 + year : 1900 + year
    return new Date(fullYear, parseInt(dmy2[2]) - 1, parseInt(dmy2[1]))
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))
  return null
}

export function fmtFlexibleDateOrdinal(s: string): string {
  const d = parseFlexibleDate(s)
  return d ? fmtOrdinal(d) : s
}

export function daysBetweenFlexible(from: string, to: string): number {
  const a = parseFlexibleDate(from)
  const b = parseFlexibleDate(to)
  if (!a || !b) return 0
  return Math.round((b.getTime() - a.getTime()) / 86400000)
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "January 2026"-style label for a YYYY-MM-DD date string — the labelFn
 *  ScheduleTab/ShowHistoryTab-style month grouping is built from, via
 *  groupByLabel below. */
export function monthLabel(dateStr: string): string {
  const dt = new Date(dateStr)
  return isNaN(dt.getTime()) ? dateStr.substring(0, 7) : `${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`
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
