import type { ModuleDefinition, ModuleData } from '../types'
import { FinanceStandingModule } from './FinanceStandingModule'
import { api } from '../../api'

export const financeStandingModule: ModuleDefinition<ModuleData<typeof FinanceStandingModule>> = {
  id: 'finance-standing',
  fetchData: (fedUid) => api.finance.standing(fedUid),
  name: 'Financial Standing',
  description: 'How your promotion compares to others by revenue',
  icon: '🏆',
  defaultSize: { w: 10, h: 8 },
  minW: 4,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <FinanceStandingModule {...props} />
  },
}
