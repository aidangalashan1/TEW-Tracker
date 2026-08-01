import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'

/** Show-domain breadcrumb name lookup for TopBar. Same cache key as
 *  PastShowProfile.tsx's own detail fetch — one request per show, not two. */
export function usePastShowBreadcrumb(isPastShowEntity: boolean, pastShowUid: number | null): string {
  const { data } = useSWR(
    isPastShowEntity && pastShowUid ? 'past-show-' + pastShowUid : null,
    () => api.show_history.detail(pastShowUid!),
  )
  return data?.name ?? ''
}
