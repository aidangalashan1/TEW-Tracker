import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'

/** Show-domain breadcrumb name lookup for TopBar — a TV episode's entity id
 *  encodes "tvUid@date", but the breadcrumb only needs the parent show's
 *  name. Same cache key as ShowProfile.tsx/ShowEpisodeProfile.tsx's own
 *  tvDetail fetch — they all share the one underlying TV show resource. */
export function useTvEpisodeBreadcrumb(isTvEpisodeEntity: boolean, tvUid: number | null): string {
  const { data } = useSWR(
    isTvEpisodeEntity && tvUid ? 'tv-show-' + tvUid : null,
    () => api.schedule.tvDetail(tvUid!),
  )
  return data?.name ?? ''
}
