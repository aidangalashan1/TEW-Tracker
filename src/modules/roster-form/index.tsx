import type { ModuleDefinition, ModuleData } from '../types'
import { RosterFormModule } from './RosterFormModule'
import { api } from '../../api'

export const rosterFormModule: ModuleDefinition<ModuleData<typeof RosterFormModule>> = {
  id: 'roster-form',
  fetchData: (fedUid) => api.roster.rosterForm(fedUid),
  name: 'Form Guide',
  description: 'Every worker\'s recent match/angle performance, full career, at a glance',
  icon: '📈',
  defaultSize: { w: 12, h: 12 },
  minW: 2,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <RosterFormModule {...props} />
  },
}
