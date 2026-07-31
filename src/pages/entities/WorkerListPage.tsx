import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useApp } from '../../context/AppContext'
import { useModuleConfig } from '../../hooks/useModuleConfig'
import { WorkerListColumnTable } from '../../modules/worker-list/WorkerListTable'
import { TeamsStablesTab } from './worker-list/TeamsStablesTab'
import { ChampionsTab } from './worker-list/ChampionsTab'

export function WorkerListPage() {
  const { focusedFed, playerFed, rosterTab: tab, storeVersion } = useApp()
  const fed = focusedFed || playerFed
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { config, handleConfigChange } = useModuleConfig('worker-list')

  const fedUid = fed?.uid
  useEffect(() => {
    if (fedUid == null) { setLoading(false); return }
    setLoading(true)
    api.roster.list(fedUid).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [fedUid, storeVersion])

  if (loading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>
  if (!data?.workers) return <div className="text-muted" style={{ padding: 24 }}>No workers</div>

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {tab === 'workers' && <WorkerListColumnTable workers={data.workers} config={config} onConfigChange={handleConfigChange} />}
      {tab === 'teams' && fed && <TeamsStablesTab fedUid={fed.uid} workers={data.workers} config={config} onConfigChange={handleConfigChange} />}
      {tab === 'champions' && fed && <ChampionsTab fedUid={fed.uid} workers={data.workers} />}
    </div>
  )
}
