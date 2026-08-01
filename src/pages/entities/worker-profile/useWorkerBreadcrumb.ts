import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'

/** Worker-domain breadcrumb name lookup for TopBar. Uses the same cache key
 *  as WorkerProfile.tsx's own detail fetch, so visiting a worker's profile
 *  only ever triggers one request for its data, not two. */
export function useWorkerBreadcrumb(isWorkerEntity: boolean, workerUid: number | null): string {
  const { data } = useSWR(
    isWorkerEntity && workerUid ? 'worker-' + workerUid : null,
    () => api.roster.detail(workerUid!),
  )
  return data?.name ?? ''
}
