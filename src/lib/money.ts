/** Shared money formatter — compact $ notation (e.g. $1.91M, $487K, $9). */
export function fmtMoney(n: number): string {
  const sign = n < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}M`
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}K`
  return `${sign}$${a}`
}

/** Accounting-style formatting for figures that can meaningfully go negative
 *  (net, balance, debt) — wraps negatives in parens instead of a leading
 *  minus, e.g. ($59K) rather than -$59K. Positive/zero values are unchanged. */
export function fmtMoneyAccounting(n: number): string {
  return n < 0 ? `(${fmtMoney(Math.abs(n))})` : fmtMoney(n)
}
