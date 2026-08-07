import { useCallback, useMemo } from 'react'
import { api, ShortlistEntry } from '../api'
import useSWR from './useApi'

/** Shared access to the player's scouting shortlist (non-roster workers held
 *  in a local JSON file — see python/routers/shortlist.py). One SWR cache
 *  entry ('shortlist') so every add/remove from any page (Worker List
 *  context menu, Worker Search, Worker Profile) stays in sync everywhere
 *  else it's read (planned-storyline/arc/segment worker pickers). */
export function useShortlist() {
  const { data, setData, mutate } = useSWR('shortlist', () => api.shortlist.list())
  const entries: ShortlistEntry[] = data?.entries ?? []
  const uids = useMemo(() => new Set(entries.map(e => e.worker_uid)), [entries])
  const isShortlisted = useCallback((uid: number) => uids.has(uid), [uids])

  const add = useCallback((uid: number) => {
    api.shortlist.add(uid).then(r => setData({ entries: r.entries })).catch(() => mutate())
  }, [setData, mutate])

  const remove = useCallback((uid: number) => {
    api.shortlist.remove(uid).then(r => setData({ entries: r.entries })).catch(() => mutate())
  }, [setData, mutate])

  const toggle = useCallback((uid: number) => {
    if (isShortlisted(uid)) remove(uid); else add(uid)
  }, [isShortlisted, add, remove])

  return { entries, uids, isShortlisted, add, remove, toggle }
}
