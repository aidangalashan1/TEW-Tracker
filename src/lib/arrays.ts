/** Max of a numeric key across items, floored at `min` — normalizes
 *  proportional bar widths so nothing is ever divided by zero. */
export function maxBy<T>(items: T[], key: (item: T) => number, min = 1): number {
  return Math.max(min, ...items.map(key))
}
