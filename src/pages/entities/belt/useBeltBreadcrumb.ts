import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'

/** Belt-domain breadcrumb name lookup for TopBar, so TopBar doesn't need to
 *  know how to fetch a belt's name itself. Same cache key as BeltProfile.tsx's
 *  own detail fetch — one request per belt, not two. */
export function useBeltBreadcrumb(isBeltEntity: boolean, beltUid: number | null): string {
  const { data } = useSWR(
    isBeltEntity && beltUid ? 'belt-' + beltUid : null,
    () => api.belt.detail(beltUid!),
  )
  return data?.name ?? ''
}
