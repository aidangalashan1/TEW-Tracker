import type { ModuleDefinition, ModuleData } from '../types'
import { StableListModule } from './StableListModule'
import { api } from '../../api'

export const stableListModule: ModuleDefinition<ModuleData<typeof StableListModule>> = {
  id: 'stable-list',
  fetchData: (fedUid) => api.stables.list(fedUid),
  name: 'Stables',
  description: 'All stables and factions in your federation',
  icon: '🏢',
  defaultSize: { w: 10, h: 8 },
  minW: 2,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <StableListModule {...props} />
  },
}
