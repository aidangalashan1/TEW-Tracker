import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'

/** Show-domain breadcrumb name lookup for TopBar. */
export function usePastShowBreadcrumb(isPastShowEntity: boolean, pastShowUid: number | null): string {
  const { storeVersion } = useApp()
  const [name, setName] = useState('')
  useEffect(() => {
    if (isPastShowEntity && pastShowUid) {
      api.show_history.detail(pastShowUid).then(s => setName(s.name)).catch(() => {})
    }
  }, [isPastShowEntity, pastShowUid, storeVersion])
  return name
}
