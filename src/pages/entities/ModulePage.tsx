import { useState, useEffect } from 'react'
import { getModule } from '../../modules/registry'
import { useApp } from '../../context/AppContext'

export function ModulePage({ moduleId }: { moduleId: string }) {
  const { closeEntity, focusedFed, playerFed } = useApp()
  const fed = focusedFed || playerFed
  const def = getModule(moduleId)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fed || !def?.fetchData) { setLoading(false); return }
    setLoading(true)
    def.fetchData(fed.uid).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [moduleId, fed?.uid])

  if (!def) {
    return (
      <div style={{ padding: 24 }}>
        <button className="btn" onClick={closeEntity} style={{ marginBottom: 16 }}>← Back</button>
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
        config: {},
        onConfigChange: () => {},
      })}
    </div>
  )
}
