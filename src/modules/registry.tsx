import type { ModuleDefinition } from './types'
import { workerListModule } from './worker-list/index'
import { topWorkersModule } from './top-workers/index'
import { tagTeamListModule } from './tagteam-list/index'
import { beltListModule } from './belt-list/index'
import { stableListModule } from './stable-list/index'
import { scheduleModule } from './schedule/index'
import { showHistoryModule } from './show-history/index'
import { storylinesModule } from './storylines/index'
import { rosterFormModule } from './roster-form/index'
import { freeAgentsModule } from './free-agents/index'
import { financeSummaryModule } from './finance-summary/index'
import { financeCashflowModule } from './finance-cashflow/index'
import { financeBreakdownModule } from './finance-breakdown/index'
import { financeWagesModule } from './finance-wages/index'
import { financeStandingModule } from './finance-standing/index'

// The registry is heterogeneous (each module has its own data type), so it
// stores the `any` existential. Per-module type safety lives in each module's
// definition, where fetchData and render are tied via ModuleData<typeof Comp>.
const modules = new Map<string, ModuleDefinition<any>>()

function register(m: ModuleDefinition<any>) {
  modules.set(m.id, m)
}

register(workerListModule)
register(topWorkersModule)
register(tagTeamListModule)
register(beltListModule)
register(stableListModule)
register(scheduleModule)
register(showHistoryModule)
register(storylinesModule)
register(rosterFormModule)
register(freeAgentsModule)
register(financeSummaryModule)
register(financeCashflowModule)
register(financeBreakdownModule)
register(financeWagesModule)
register(financeStandingModule)

export function getModule(id: string): ModuleDefinition<any> | undefined {
  return modules.get(id)
}

export function getAllModules(): ModuleDefinition<any>[] {
  return Array.from(modules.values())
}
