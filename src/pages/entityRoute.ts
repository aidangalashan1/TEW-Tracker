/** A parsed `entity-<type>-<id>` page id. `id` is numeric when it parses as an
 *  integer, otherwise the raw string tail. */
export interface EntityRoute {
  type: string
  id: number | string
}

/** Parse a `currentPage` string into an entity route, or null if it isn't one. */
export function parseEntityPage(page: string): EntityRoute | null {
  const numMatch = page.match(/^entity-(\w+)-(\d+)$/)
  if (numMatch) return { type: numMatch[1], id: parseInt(numMatch[2], 10) }
  const strMatch = page.match(/^entity-(\w+)-(.+)$/)
  if (strMatch) return { type: strMatch[1], id: strMatch[2] }
  return null
}
