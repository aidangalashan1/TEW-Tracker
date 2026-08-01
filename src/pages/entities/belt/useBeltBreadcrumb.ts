import { useState, useEffect } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'

/** Belt-domain breadcrumb name lookup for TopBar, so TopBar doesn't need to
 *  know how to fetch a belt's name itself. */
export function useBeltBreadcrumb(isBeltEntity: boolean, beltUid: number | null): string {
  const { storeVersion } = useApp()
  const [name, setName] = useState('')
  useEffect(() => {
    if (isBeltEntity && beltUid) {
      api.belt.detail(beltUid).then(b => setName(b.name)).catch(() => {})
    }
  }, [isBeltEntity, beltUid, storeVersion])
  return name
}
