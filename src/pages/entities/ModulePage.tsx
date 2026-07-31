import { useState, useEffect } from 'react'
import { getModule } from '../../modules/registry'
import { useApp } from '../../context/AppContext'
import { useModuleConfig } from '../../hooks/useModuleConfig'

export function ModulePage({ moduleId }: { moduleId: string }) {
  const { focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const def = getModule(moduleId)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { config, handleConfigChange } = useModuleConfig(moduleId)

  const fedUid = fed?.uid
  useEffect(() => {
    if (fedUid == null || !def?.fetchData) { setLoading(false); return }
    setLoading(true)
    def.fetchData(fedUid).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [def, fedUid])

  if (!def) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: 'var(--accent)' }}>Module not found: {moduleId}</div>
      </div>
    )
  }

  if (loading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

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
