import type { ModuleDefinition, ModuleData } from '../types'
import { StorylinesModule } from './StorylinesModule'
import { api } from '../../api'

export const storylinesModule: ModuleDefinition<ModuleData<typeof StorylinesModule>> = {
  id: 'storylines',
  fetchData: (fedUid) => api.fed.storylines(fedUid),
  name: 'Storylines',
  description: 'Storyline manager and cross-table grid',
  icon: '📖',
  defaultSize: { w: 14, h: 14 },
  minW: 4,
  minH: 6,
  supportsPageView: true,
  render(props) {
    return <StorylinesModule {...props} />
  },
}
