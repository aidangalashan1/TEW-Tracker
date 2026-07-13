import type { ModuleDefinition, ModuleData } from '../types'
import { FinanceCashflowModule } from './FinanceCashflowModule'
import { api } from '../../api'

export const financeCashflowModule: ModuleDefinition<ModuleData<typeof FinanceCashflowModule>> = {
  id: 'finance-cashflow',
  fetchData: (fedUid) => api.finance.history(fedUid),
  name: 'Cash Flow',
  description: 'Income vs spending over time, and your cash balance trend',
  icon: '📈',
  defaultSize: { w: 10, h: 10 },
  minW: 4,
  minH: 3,
  supportsPageView: true,
  render(props) {
    return <FinanceCashflowModule {...props} />
  },
}
