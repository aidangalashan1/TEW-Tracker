import { PageLayout, LayoutItemData } from './types'

const STORAGE_KEY = 'tew-layouts'
// Bumped 1 -> 2: the finances page moved from one monolithic `finance` module
// to five focused finance-* modules — a stale layout referencing the removed
// `finance` id would silently drop that tile, so force a reset to defaults.
export const STORAGE_VERSION = 2
let _cachedBackendLayouts: Record<string, PageLayout> | null = null

export function defaultLayout(page: string): PageLayout {
  const defaults: Record<string, LayoutItemData[]> = {
    roster: [
      { i: 'top-workers-1', moduleId: 'top-workers', x: 0, y: 0, w: 4, h: 4 },
      { i: 'worker-list-1', moduleId: 'worker-list', x: 4, y: 0, w: 12, h: 12 },
    ],
    booking: [
      { i: 'schedule-1', moduleId: 'schedule', x: 0, y: 0, w: 6, h: 10 },
    ],
    finances: [
      { i: 'finance-summary-1', moduleId: 'finance-summary', x: 0, y: 0, w: 16, h: 4 },
      { i: 'finance-cashflow-1', moduleId: 'finance-cashflow', x: 0, y: 4, w: 10, h: 10 },
      { i: 'finance-wages-1', moduleId: 'finance-wages', x: 10, y: 4, w: 6, h: 10 },
      { i: 'finance-breakdown-1', moduleId: 'finance-breakdown', x: 0, y: 14, w: 10, h: 10 },
      { i: 'finance-standing-1', moduleId: 'finance-standing', x: 10, y: 14, w: 6, h: 10 },
    ],
  }
  return { page, items: defaults[page] ?? [] }
}

export function loadLayout(page: string): PageLayout {
  if (_cachedBackendLayouts?.[page]) return _cachedBackendLayouts[page]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // The blob mixes a top-level `_v` version number with per-page PageLayouts,
    // so read the version off the raw value before treating entries as layouts.
    const all = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>
    const version = typeof all._v === 'number' ? all._v : 0
    if (version < STORAGE_VERSION) return defaultLayout(page)
    return (all[page] as PageLayout | undefined) ?? defaultLayout(page)
  } catch {
    return defaultLayout(page)
  }
}

export function saveLayout(page: string, layout: PageLayout): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const all: Record<string, any> = raw ? JSON.parse(raw) : {}
    all._v = STORAGE_VERSION
    all[page] = layout
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {}
  // Fire-and-forget backend sync
  setTimeout(() => {
    import('../api').then(m => m.api.workspace.save(
      loadPagesWithImport(),
      allLayoutsWithImport(),
    )).catch(e => console.error('[layout] workspace sync failed', e))
  }, 0)
}

function loadPagesWithImport(): {id: string; label: string}[] {
  try {
    const raw = localStorage.getItem('tew-pages')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function allLayoutsWithImport(): Record<string, any> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

/** Called on app startup to seed cache from backend */
export function seedLayoutsFromBackend(layouts: Record<string, any>): void {
  _cachedBackendLayouts = layouts
  try {
    const toStore = { ...layouts, _v: STORAGE_VERSION }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch {}
}
