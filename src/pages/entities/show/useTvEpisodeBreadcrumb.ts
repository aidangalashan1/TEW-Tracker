import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'

/** Show-domain breadcrumb name lookup for TopBar — a TV episode's entity id
 *  encodes "tvUid@date", but the breadcrumb only needs the parent show's name. */
export function useTvEpisodeBreadcrumb(isTvEpisodeEntity: boolean, tvUid: number | null): string {
  const { storeVersion } = useApp()
  const [name, setName] = useState('')
  useEffect(() => {
    if (isTvEpisodeEntity && tvUid) {
      api.schedule.tvDetail(tvUid).then(s => setName(s.name)).catch(() => {})
    }
  }, [isTvEpisodeEntity, tvUid, storeVersion])
  return name
}
