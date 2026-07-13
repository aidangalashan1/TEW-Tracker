import type { ModuleDefinition, ModuleData } from '../types'
import { FinanceBreakdownModule } from './FinanceBreakdownModule'
import { api } from '../../api'

export const financeBreakdownModule: ModuleDefinition<ModuleData<typeof FinanceBreakdownModule>> = {
  id: 'finance-breakdown',
  fetchData: (fedUid) => api.finance.breakdown(fedUid),
  name: 'Budget Breakdown',
  description: 'Income and expenditure by line, with drill-down detail',
  icon: '📊',
  defaultSize: { w: 10, h: 10 },
  minW: 6,
  minH: 4,
  supportsPageView: true,
  render(props) {
    return <FinanceBreakdownModule {...props} />
  },
}
