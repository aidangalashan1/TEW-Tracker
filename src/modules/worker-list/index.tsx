import type { ModuleDefinition, ModuleData } from '../types'
import { WorkerListModule } from './WorkerListModule'
import { api } from '../../api'

export const workerListModule: ModuleDefinition<ModuleData<typeof WorkerListModule>> = {
  id: 'worker-list',
  fetchData: (fedUid) => api.roster.list(fedUid),
  name: 'Worker List',
  description: 'All workers in your federation',
  icon: '👥',
  defaultSize: { w: 12, h: 12 },
  minW: 2,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <WorkerListModule {...props} />
  },
}
