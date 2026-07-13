import type { ModuleDefinition, ModuleData } from '../types'
import { FinanceWagesModule } from './FinanceWagesModule'
import { api } from '../../api'

export const financeWagesModule: ModuleDefinition<ModuleData<typeof FinanceWagesModule>> = {
  id: 'finance-wages',
  fetchData: (fedUid) => api.finance.wages(fedUid),
  name: 'Wage Bill',
  description: 'Top earners and total wage spend from active contracts',
  icon: '🤑',
  defaultSize: { w: 10, h: 10 },
  minW: 4,
  minH: 2,
  supportsPageView: true,
  render(props) {
    return <FinanceWagesModule {...props} />
  },
}
