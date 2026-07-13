/** Contract-expiry color coding — fewer days left means the player needs to
 *  renegotiate or risk losing the worker to free agency (was finance-wages). */
export function daysLeftTone(days: number): string {
  if (days <= 30) return 'text-red'
  if (days <= 90) return 'text-yellow'
  return 'text-muted'
}
