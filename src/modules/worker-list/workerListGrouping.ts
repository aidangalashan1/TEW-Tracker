import type { Worker } from '../../api'
import { sortWorkers, type SortKey } from './workerListSort'
import { PERCEPTION_LABELS } from './workerListFilters'

export interface SubgroupFilter {
  role?: string[]
  gender?: string[]
  disposition?: string[]
  brand?: number[]
  perception?: number[]
}
export interface SubgroupDef { label: string; filters: SubgroupFilter }

export interface GroupedEntry { worker: Worker; secondary: boolean }

export const GROUP_ORDER: Record<string, string[]> = {
  role: ['Wrestler', 'Non-Wrestler'],
  role_advanced: ['Occasional', 'Manager', 'Personality', 'Road Agent', 'Announcer', 'Colour Commentator', 'Referee'],
  disposition: ['Face', 'Heel'],
  gender: ['Male', 'Female'],
  brand: [],
  perception: Object.values(PERCEPTION_LABELS).filter(v => v !== 'No Perception'),
}

export function buildDimOptions(allBrands: number[]): { id: string; label: string }[] {
  return [
    { id: 'role', label: 'Role' },
    { id: 'disposition', label: 'Disposition' },
    { id: 'gender', label: 'Gender' },
    { id: 'perception', label: 'Perception' },
    ...(allBrands.length > 1 ? [{ id: 'brand', label: 'Brand' }] : []),
  ]
}

/** Applies the user's saved dimension order, appending any new dimensions
 *  (e.g. 'brand' becoming available) that aren't in the saved order yet. */
export function orderDims(dimOrder: string[], dimOptions: { id: string; label: string }[]): { id: string; label: string }[] {
  const ordered = dimOrder.map(id => dimOptions.find(d => d.id === id)).filter(Boolean) as typeof dimOptions
  for (const d of dimOptions) { if (!ordered.find(o => o.id === d.id)) ordered.push(d) }
  return ordered
}

export function groupKey(w: Worker, dim: string): string {
  if (dim === 'role') return w.non_wrestler ? 'Non-Wrestler' : 'Wrestler'
  if (dim === 'role_adv') {
    if (w.retired) return 'Retired'
    const matched = GROUP_ORDER.role_advanced.find(p => w.positions.includes(p))
    return matched || 'Other'
  }
  if (dim === 'disposition') return w.contract?.face ? 'Face' : 'Heel'
  if (dim === 'gender') return w.gender
  if (dim === 'brand') return `Brand ${(w as any).contract?.brand || 0}`
  if (dim === 'perception') return PERCEPTION_LABELS[(w.contract as any)?.Perception ?? 0] || 'Unknown'
  return ''
}

export function sortGroups<T>(entries: [string, T][], dim: string): [string, T][] {
  const order = GROUP_ORDER[dim]
  if (order && order.length > 0) {
    return entries.sort((a, b) => {
      const ai = order.indexOf(a[0])
      const bi = order.indexOf(b[0])
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
  }
  return entries.sort((a, b) => a[0].localeCompare(b[0]))
}

export function matchesSubgroup(w: Worker, sg: SubgroupDef): boolean {
  const { role, gender, disposition, brand, perception } = sg.filters
  if (role && role.length > 0 && !role.some(r => r === 'Wrestler' ? !w.non_wrestler : w.positions.includes(r))) return false
  if (gender && gender.length > 0 && !gender.includes(w.gender)) return false
  if (disposition && disposition.length > 0) {
    const disp = w.contract?.face ? 'Face' : 'Heel'
    if (!disposition.includes(disp)) return false
  }
  if (brand && brand.length > 0 && !brand.includes((w as any).contract?.brand ?? 0)) return false
  if (perception && perception.length > 0 && !perception.includes((w.contract as any)?.Perception ?? 0)) return false
  return true
}

export function roleGroupKeyFallback(w: Worker, advancedRoleFilters: Set<string>): string {
  if (w.retired || w.non_wrestler) {
    if (advancedRoleFilters.size > 0) {
      const matched = GROUP_ORDER.role_advanced.find(p => advancedRoleFilters.has(p) && w.positions.includes(p))
      if (matched) return matched
    }
    return 'Non-Wrestler'
  }
  return 'Wrestler'
}

export interface ComputeGroupsOpts {
  groupBy: Set<string>
  subgroups: SubgroupDef[]
  activeSubgroups: Set<string>
  advancedRoleFilters: Set<string>
  sorts: { key: SortKey; dir: 'asc' | 'desc' }[]
}

/** Groups (and sub-sorts) the filtered worker list by the active dimensions.
 *  Returns null when nothing is grouped, so callers can fall back to a flat
 *  list. Priority: active subgroups first, then advanced-role multi-role
 *  expansion (a retired/non-wrestler worker can appear under every matching
 *  advanced role), then standard single-key grouping. */
export function computeGroups(filtered: Worker[], opts: ComputeGroupsOpts): [string, GroupedEntry[]][] | null {
  const { groupBy, subgroups, activeSubgroups, advancedRoleFilters, sorts } = opts
  const dims = Array.from(groupBy)
  const hasSubgroups = activeSubgroups.size > 0
  const hasAdvanced = advancedRoleFilters.size > 0
  const roleDim = dims.includes('role')
  if (dims.length === 0 && !hasSubgroups) return null

  const roleGroupSort: string[] = [
    ...subgroups.filter(s => activeSubgroups.has(s.label)).map(s => s.label),
    'Wrestler',
    'Non-Wrestler',
    ...GROUP_ORDER.role_advanced,
  ]

  const map = new Map<string, GroupedEntry[]>()
  for (const w of filtered) {
    // Check active subgroups first
    let sgLabel: string | null = null
    if (hasSubgroups) {
      for (const sg of subgroups) {
        if (activeSubgroups.has(sg.label) && matchesSubgroup(w, sg)) {
          sgLabel = sg.label
          break
        }
      }
    }
    if (sgLabel) {
      const arr = map.get(sgLabel) || []
      arr.push({ worker: w, secondary: false })
      map.set(sgLabel, arr)
      continue
    }
    if (roleDim && hasAdvanced && (w.retired || w.non_wrestler)) {
      // Multi-role expansion: add worker as primary to every matching advanced role group
      let matchedAny = false
      for (const role of GROUP_ORDER.role_advanced) {
        if (advancedRoleFilters.has(role) && w.positions.includes(role)) {
          matchedAny = true
          const parts = dims.map(d => d === 'role' ? role : groupKey(w, d))
          const key = parts.join(' › ')
          const arr = map.get(key) || []
          arr.push({ worker: w, secondary: false })
          map.set(key, arr)
        }
      }
      if (!matchedAny) {
        // No advanced role matched — use standard grouping
        const parts = dims.map(d => d === 'role' ? 'Non-Wrestler' : groupKey(w, d))
        const key = parts.join(' › ')
        const arr = map.get(key) || []
        arr.push({ worker: w, secondary: false })
        map.set(key, arr)
      }
      continue
    }
    // Standard single-key grouping
    const parts = dims.map(d => d === 'role' ? roleGroupKeyFallback(w, advancedRoleFilters) : groupKey(w, d))
    if (parts.some(p => p === '')) continue
    const key = parts.join(' › ')
    const arr = map.get(key) || []
    arr.push({ worker: w, secondary: false })
    map.set(key, arr)
  }

  let entries = Array.from(map.entries())
  const sortByRoleGroup = (a: [string, GroupedEntry[]], b: [string, GroupedEntry[]]) => {
    const ai = roleGroupSort.indexOf(a[0])
    const bi = roleGroupSort.indexOf(b[0])
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  }
  if (hasSubgroups) {
    entries = entries.sort((a, b) => {
      const aIsSg = activeSubgroups.has(a[0])
      const bIsSg = activeSubgroups.has(b[0])
      if (aIsSg && !bIsSg) return -1
      if (!aIsSg && bIsSg) return 1
      if (aIsSg && bIsSg) return sortByRoleGroup(a, b)
      const lastDim = dims[dims.length - 1]
      if (lastDim === 'role') return sortByRoleGroup(a, b)
      return sortGroups([a, b], lastDim)[0][0] === a[0] ? -1 : 1
    })
  } else {
    for (const dim of [...dims].reverse()) {
      if (dim === 'role') {
        entries = entries.sort(sortByRoleGroup)
      } else {
        entries = sortGroups(entries, dim)
      }
    }
  }
  if (sorts.length > 0) {
    entries = entries.map(([key, items]) => {
      const sorted = [...items].sort((a, b) => {
        for (const s of sorts) {
          const res = sortWorkers([a.worker, b.worker], [s])
          if (res[0] !== res[1]) return res[0] === a.worker ? -1 : 1
        }
        return 0
      })
      return [key, sorted] as [string, GroupedEntry[]]
    })
  }
  return entries
}
