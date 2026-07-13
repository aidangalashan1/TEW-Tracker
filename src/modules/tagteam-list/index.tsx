import type { ModuleDefinition, ModuleData } from '../types'
import { TagTeamListModule } from './TagTeamListModule'
import { api } from '../../api'

export const tagTeamListModule: ModuleDefinition<ModuleData<typeof TagTeamListModule>> = {
  id: 'tagteam-list',
  fetchData: (fedUid) => api.tagteams.list(fedUid),
  name: 'Tag Team List',
  description: 'All tag teams in your federation',
  icon: '🤝',
  defaultSize: { w: 12, h: 10 },
  minW: 2,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <TagTeamListModule {...props} />
  },
}
