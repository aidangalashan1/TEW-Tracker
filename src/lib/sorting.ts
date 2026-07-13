import type { RosterFormEntry, TagTeam } from '../api'

export type FormSortKey = 'avg' | 'best' | 'recent' | 'name'

/** Was roster-form's sortWorkers. */
export function sortRosterFormWorkers(workers: RosterFormEntry[], key: FormSortKey): RosterFormEntry[] {
  const list = [...workers]
  if (key === 'name') return list.sort((a, b) => a.name.localeCompare(b.name))
  if (key === 'best') return list.sort((a, b) => b.summary.best_rating - a.summary.best_rating)
  if (key === 'recent') return list.sort((a, b) => (b.recent_ratings[0] ?? 0) - (a.recent_ratings[0] ?? 0))
  return list.sort((a, b) => b.summary.avg_rating - a.summary.avg_rating)
}

export type TagTeamSortKey = 'experience' | 'pop' | 'name'

/** Was tagteam-list's sort comparator. */
export function sortTagTeams(teams: TagTeam[], key: TagTeamSortKey): TagTeam[] {
  return [...teams].sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name)
    if (key === 'pop') return (b.pop || 0) - (a.pop || 0)
    return (b.experience || 0) - (a.experience || 0)
  })
}
