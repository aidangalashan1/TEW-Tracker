export type { ColumnDef, ColumnState } from './types'
export { StatusBadge, MoneyDisplay, conditionHeart, condPctBar, fmtDuration, fmtDurationHm, MiniGraphTooltip, Last5Cell, AvgCell } from './renderers'
export { ratingColor } from '../../../lib/colors'

const STORAGE_KEY = 'tew-worker-columns'
const STORAGE_VERSION = 6

export function loadColumnState(): import('./types').ColumnState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === STORAGE_VERSION && Array.isArray(parsed.columns)) {
        return parsed.columns
      }
    }
  } catch {}
  return defaultColumnState()
}

export function saveColumnState(state: import('./types').ColumnState[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, columns: state }))
}

export function defaultColumnState(): import('./types').ColumnState[] {
  return [
    { id: 'img', width: 32 },
    { id: 'status', width: 32 },
    { id: 'gender', width: 24 },
    { id: 'nat', width: 28 },
    { id: 'name', width: 250 },
    { id: 'condition', width: 50 },
    { id: 'current_ability', width: 60 },
    { id: 'potential_ability', width: 60 },
    { id: 'current_usage', width: 70 },
    { id: 'potential_usage', width: 70 },
  ]
}

export const GROUP_ORDER = ['info', 'skills', 'performance', 'contract', 'record']

export const FILTER_GROUPS = [
  { id: 'personal', label: 'Personal' },
  { id: 'creative', label: 'Creative' },
  { id: 'contract', label: 'Contract' },
  { id: 'stats', label: 'Stats' },
  { id: 'popularity', label: 'Popularity' },
  { id: 'medical', label: 'Medical' },
]

import { buildColumns } from './defs'
export const defaultColumns = buildColumns()
