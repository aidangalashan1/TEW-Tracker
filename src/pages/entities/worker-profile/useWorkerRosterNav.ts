import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'

export interface RosterNavEntry {
  uid: number
  name: string
  perception: number
  picture: string
  contractPicture: string
}

/** Worker-domain roster list for TopBar's prev/next-worker navigator,
 *  ordered by perception (most prominent first). */
export function useWorkerRosterNav() {
  const { focusedFed, playerFed, storeVersion } = useApp()
  const [rosterList, setRosterList] = useState<RosterNavEntry[]>([])
  const [perceptionOrder, setPerceptionOrder] = useState<number[]>([])

  useEffect(() => {
    const fed = focusedFed || playerFed
    if (!fed) return
    api.roster.list(fed.uid).then(res => {
      const list: RosterNavEntry[] = (res.workers || []).map((w: any) => ({
        uid: w.uid,
        name: w.name,
        perception: (w.contract as any)?.Perception ?? 99,
        picture: (w as any).picture || '',
        contractPicture: (w as any).contract?.picture || '',
      }))
      list.sort((a, b) => a.perception - b.perception)
      setRosterList(list)
      setPerceptionOrder(list.map(w => w.uid))
    }).catch(() => {})
  }, [focusedFed, playerFed, storeVersion])

  return { rosterList, perceptionOrder }
}
