import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'

/** Planned-storyline breadcrumb name lookup for TopBar. Same cache key as
 *  PlannedStorylineProfile.tsx's own detail fetch — one request, not two. */
export function usePlannedStorylineBreadcrumb(isPlannedStorylineEntity: boolean, storylineId: string | null): string {
  const { data } = useSWR(
    isPlannedStorylineEntity && storylineId ? 'planned-storyline-' + storylineId : null,
    () => api.plannedStorylines.get(storylineId!),
  )
  return data?.name ?? ''
}
