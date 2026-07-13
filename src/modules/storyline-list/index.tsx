import type { ModuleDefinition, ModuleData } from '../types'
import { StorylineListModule } from './StorylineListModule'
import { api } from '../../api'

export const storylineListModule: ModuleDefinition<ModuleData<typeof StorylineListModule>> = {
  id: 'storyline-list',
  fetchData: (fedUid) => api.fed.storylines(fedUid),
  name: 'Storylines',
  description: 'All active storylines in your federation',
  icon: '📖',
  defaultSize: { w: 10, h: 8 },
  minW: 2,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <StorylineListModule {...props} />
  },
}
