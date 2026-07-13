import type { ModuleDefinition, ModuleData } from '../types'
import { TopWorkersModule } from './TopWorkersModule'
import { api } from '../../api'

export const topWorkersModule: ModuleDefinition<ModuleData<typeof TopWorkersModule>> = {
  id: 'top-workers',
  fetchData: async (fedUid) => {
    const [roster, belts] = await Promise.all([api.roster.list(fedUid), api.fed.belts(fedUid)])
    return { workers: roster.workers, belts: belts.belts }
  },
  name: 'Top Workers',
  description: 'Highest-rated workers by overall skill',
  icon: '⭐',
  defaultSize: { w: 4, h: 4 },
  minW: 2,
  minH: 2,
  maxW: 8,
  maxH: 8,
  render(props) {
    return <TopWorkersModule {...props} />
  },
}
