import { getModule } from '../../modules/registry'
import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { useModuleConfig } from '../../hooks/useModuleConfig'

export function ModulePage({ moduleId }: { moduleId: string }) {
  const { focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const def = getModule(moduleId)
  const fedUid = fed?.uid
  // Previously didn't depend on storeVersion at all, so it never refreshed
  // after an autosave while mounted — useSWR fixes that as a side effect.
  const canFetch = fedUid != null && !!def?.fetchData
  const { data, isLoading } = useSWR(canFetch ? `module-${moduleId}-${fedUid}` : null, () => def!.fetchData!(fedUid!))
  const { config, handleConfigChange } = useModuleConfig(moduleId)

  if (!def) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: 'var(--accent)' }}>Module not found: {moduleId}</div>
      </div>
    )
  }

  if (isLoading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  return (
    <div className="module-full" style={{ padding: 8 }}>
      {def.render({
        data,
        width: 16,
        height: 16,
        tier: 'large',
        config,
        onConfigChange: handleConfigChange,
      })}
    </div>
  )
}
