import type { ModuleDefinition, ModuleData } from '../types'
import { StorylineGridModule } from './StorylineGridModule'
import { api } from '../../api'

export const storylineGridModule: ModuleDefinition<ModuleData<typeof StorylineGridModule>> = {
  id: 'storyline-grid',
  fetchData: (fedUid) => api.storylines.cross(fedUid),
  name: 'Storyline Grid',
  description: 'Cross-table view of storylines across shows',
  icon: '📊',
  defaultSize: { w: 16, h: 16 },
  minW: 8,
  minH: 8,
  supportsPageView: true,
  render(props) {
    return <StorylineGridModule {...props} />
  },
}
