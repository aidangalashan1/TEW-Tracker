import { useCallback, useState } from 'react'

/** Same {config, handleConfigChange} shape as useModuleConfig (see
 *  hooks/useModuleConfig.ts), for pages that need FilterPanel/SubgroupEditor's
 *  group-by/filter config but aren't a movable dashboard module — those only
 *  persist if the workspace layout has a matching `moduleId` item, which a
 *  fixed tab like ArcsTab never has, so useModuleConfig silently drops every
 *  change on next mount. This persists to localStorage instead, under the
 *  same `tew-*` key convention as ui-scale/WorkerListTable's group-by/filters. */
export function useLocalConfig(storageKey: string) {
  const [config, setConfig] = useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const handleConfigChange = useCallback((patch: Record<string, any>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* best-effort */ }
      return next
    })
  }, [storageKey])

  return { config, handleConfigChange }
}
