// Shared display-label lookups sourced from a single place so the same map
// isn't re-typed across columns, filters, grouping and profile views.

/** TEW worker perception tier (tblContract.Perception) → display name. */
export const PERCEPTION_LABELS: Record<number, string> = {
  0: 'No Perception', 1: 'Major Star', 2: 'Star', 3: 'Well Known', 4: 'Recognisable', 5: 'Unimportant',
}
