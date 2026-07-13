import type { ModuleDefinition } from './types'
import { workerListModule } from './worker-list/index'
import { financeModule } from './finance/index'

// The registry is heterogeneous (each module has its own data type), so it
// stores the `any` existential. Per-module type safety lives in each module's
// definition, where fetchData and render are tied via ModuleData<typeof Comp>.
const modules = new Map<string, ModuleDefinition<any>>()

function register(m: ModuleDefinition<any>) {
  modules.set(m.id, m)
}

register(workerListModule)
register(financeModule)

export function getModule(id: string): ModuleDefinition<any> | undefined {
  return modules.get(id)
}

export function getAllModules(): ModuleDefinition<any>[] {
  return Array.from(modules.values())
}
