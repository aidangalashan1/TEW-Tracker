import { api } from '../../api'
import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { useModuleConfig } from '../../hooks/useModuleConfig'
import { WorkerListColumnTable } from '../../modules/worker-list/WorkerListTable'
import { TeamsStablesTab } from './worker-list/TeamsStablesTab'
import { ChampionsTab } from './worker-list/ChampionsTab'

export function WorkerListPage() {
  const { focusedFed, playerFed, rosterTab: tab } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  const { data, isLoading } = useSWR(fedUid != null ? 'roster-' + fedUid : null, () => api.roster.list(fedUid!))
  const { config, handleConfigChange } = useModuleConfig('worker-list')

  if (isLoading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>
  if (!data?.workers) return <div className="text-muted" style={{ padding: 24 }}>No workers</div>

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {tab === 'workers' && <WorkerListColumnTable workers={data.workers} config={config} onConfigChange={handleConfigChange} />}
      {tab === 'teams' && fed && <TeamsStablesTab fedUid={fed.uid} workers={data.workers} config={config} onConfigChange={handleConfigChange} />}
      {tab === 'champions' && fed && <ChampionsTab fedUid={fed.uid} workers={data.workers} />}
    </div>
  )
}
