import type { ModuleDefinition, ModuleData } from '../types'
import { ScheduleModule } from './ScheduleModule'
import { api } from '../../api'

export const scheduleModule: ModuleDefinition<ModuleData<typeof ScheduleModule>> = {
  id: 'schedule',
  fetchData: (fedUid) => api.schedule.list(fedUid),
  name: 'Schedule',
  description: 'Upcoming TV shows and events',
  icon: '📅',
  defaultSize: { w: 6, h: 8 },
  minW: 2,
  minH: 2,
  supportsPageView: false,
  render(props) {
    return <ScheduleModule {...props} />
  },
}
