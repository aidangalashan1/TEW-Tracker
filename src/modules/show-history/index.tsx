import type { ModuleDefinition, ModuleData } from '../types'
import { ShowHistoryModule } from './ShowHistoryModule'
import { api } from '../../api'

export const showHistoryModule: ModuleDefinition<ModuleData<typeof ShowHistoryModule>> = {
  id: 'show-history',
  fetchData: (fedUid) => api.show_history.list(fedUid),
  name: 'Show History',
  description: 'Past TV shows and events',
  icon: '📋',
  defaultSize: { w: 12, h: 14 },
  minW: 2,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <ShowHistoryModule {...props} />
  },
}
