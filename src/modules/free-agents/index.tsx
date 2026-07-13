import type { ModuleDefinition, ModuleData } from '../types'
import { FreeAgentsModule } from './FreeAgentsModule'
import { api } from '../../api'

export const freeAgentsModule: ModuleDefinition<ModuleData<typeof FreeAgentsModule>> = {
  id: 'free-agents',
  fetchData: (fedUid) => api.freeAgents.list(fedUid),
  name: 'Free Agents',
  description: 'Unsigned workers you can scout and shortlist',
  icon: '🕵️',
  defaultSize: { w: 12, h: 12 },
  minW: 2,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <FreeAgentsModule {...props} />
  },
}
