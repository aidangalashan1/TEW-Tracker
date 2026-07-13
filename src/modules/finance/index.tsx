import type { ModuleDefinition, ModuleData } from '../types'
import { FinanceModule } from './FinanceModule'
import { api } from '../../api'

export const financeModule: ModuleDefinition<ModuleData<typeof FinanceModule>> = {
  id: 'finance',
  fetchData: (fedUid) => Promise.all([
    api.finance.summary(fedUid),
    api.finance.history(fedUid),
    api.finance.breakdown(fedUid),
    api.finance.wages(fedUid),
    api.finance.standing(fedUid),
  ]).then(([summary, history, breakdown, wages, standing]) => ({ summary, history, breakdown, wages, standing })),
  name: 'Finance',
  description: 'Balance, profit/loss, wage bill, cash flow, and standing at a glance',
  icon: '💰',
  defaultSize: { w: 10, h: 6 },
  minW: 4,
  minH: 3,
  supportsPageView: true,
  render(props) {
    return <FinanceModule {...props} />
  },
}
