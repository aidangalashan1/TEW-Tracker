import type { ModuleDefinition, ModuleData } from '../types'
import { FinanceSummaryModule } from './FinanceSummaryModule'
import { api } from '../../api'

export const financeSummaryModule: ModuleDefinition<ModuleData<typeof FinanceSummaryModule>> = {
  id: 'finance-summary',
  fetchData: (fedUid) => api.finance.summary(fedUid),
  name: 'Finance Summary',
  description: 'Balance, profit/loss, wage bill, and standing at a glance',
  icon: '💵',
  defaultSize: { w: 16, h: 4 },
  minW: 4,
  minH: 2,
  supportsPageView: false,
  render(props) {
    return <FinanceSummaryModule {...props} />
  },
}
