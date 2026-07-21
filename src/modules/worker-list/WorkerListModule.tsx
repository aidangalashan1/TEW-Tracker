import { useEffect } from 'react'
import { ModuleRenderProps } from '../types'
import { Worker } from '../../api'
import { useApp } from '../../context/AppContext'
import { WorkerListColumnTable } from './WorkerListTable'

export function WorkerListModule({ data, config, onConfigChange }: ModuleRenderProps<{fed_uid: number; workers: Worker[]}>) {
  const { setWorkerRoster } = useApp()
  const workers = data?.workers || []
  useEffect(() => {
    if (workers.length > 0) setWorkerRoster(workers.map(w => w.uid))
  }, [workers])

  if (workers.length === 0) return <div className="loading p-5 text-center text-muted">No workers</div>

  return <WorkerListColumnTable workers={workers} config={config} onConfigChange={onConfigChange} />
}
