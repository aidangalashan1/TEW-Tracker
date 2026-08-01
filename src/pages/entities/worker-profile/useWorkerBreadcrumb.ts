import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'

/** Worker-domain breadcrumb name lookup for TopBar. */
export function useWorkerBreadcrumb(isWorkerEntity: boolean, workerUid: number | null): string {
  const { storeVersion } = useApp()
  const [name, setName] = useState('')
  useEffect(() => {
    if (isWorkerEntity && workerUid) {
      api.roster.detail(workerUid).then(w => setName(w.name)).catch(() => {})
    }
  }, [isWorkerEntity, workerUid, storeVersion])
  return name
}
