import type { ModuleDefinition, ModuleData } from '../types'
import { BeltListModule } from './BeltListModule'
import { api } from '../../api'

export const beltListModule: ModuleDefinition<ModuleData<typeof BeltListModule>> = {
  id: 'belt-list',
  fetchData: (fedUid) => api.fed.belts(fedUid),
  name: 'Title Belts',
  description: 'All championships in your federation',
  icon: '👑',
  defaultSize: { w: 10, h: 8 },
  minW: 2,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <BeltListModule {...props} />
  },
}
