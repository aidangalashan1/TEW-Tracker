import { useMemo } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'

export interface RosterNavEntry {
  uid: number
  name: string
  perception: number
  picture: string
  contractPicture: string
}

/** Worker-domain roster list for TopBar's prev/next-worker navigator,
 *  ordered by perception (most prominent first). Same cache key as
 *  WorkerListPage's own roster fetch — one request per fed, not two. */
export function useWorkerRosterNav() {
  const { focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  const { data } = useSWR(fedUid != null ? 'roster-' + fedUid : null, () => api.roster.list(fedUid!))

  const rosterList = useMemo(() => {
    const list: RosterNavEntry[] = (data?.workers || []).map((w: any) => ({
      uid: w.uid,
      name: w.name,
      perception: (w.contract as any)?.Perception ?? 99,
      picture: (w as any).picture || '',
      contractPicture: (w as any).contract?.picture || '',
    }))
    list.sort((a, b) => a.perception - b.perception)
    return list
  }, [data])

  const perceptionOrder = useMemo(() => rosterList.map(w => w.uid), [rosterList])

  return { rosterList, perceptionOrder }
}
