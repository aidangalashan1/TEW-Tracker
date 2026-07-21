import { PageLayout, LayoutItemData } from './types'

const STORAGE_KEY = 'tew-layouts'
// Bumped 2 -> 3: the module system was consolidated down to worker-list plus
// one Finance module (was 15 modules, including 5 separate finance-* ones) —
// a stale layout referencing any of the removed module ids would silently
// drop that tile, so force a reset to defaults.
export const STORAGE_VERSION = 3
let _cachedBackendLayouts: Record<string, PageLayout> | null = null

export function defaultLayout(page: string): PageLayout {
  const defaults: Record<string, LayoutItemData[]> = {
    roster: [
      { i: 'worker-list-1', moduleId: 'worker-list', x: 0, y: 0, w: 16, h: 12 },
    ],
    booking: [],
    finances: [
      { i: 'finance-1', moduleId: 'finance', x: 0, y: 0, w: 10, h: 6 },
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

const ACTIVE_VIEW_KEY = 'tew-active-view-id'

/** The named view (Views feature) currently "pinned" as this install's
 *  active view, if any. Absent means: no view is pinned, pages just use
 *  their ambient auto-saved layout (today's default behavior, unchanged). */
export function getActiveViewId(): string | null {
  try { return localStorage.getItem(ACTIVE_VIEW_KEY) } catch { return null }
}

export function setActiveViewId(id: string): void {
  try { localStorage.setItem(ACTIVE_VIEW_KEY, id) } catch {}
}

export function clearActiveViewId(): void {
  try { localStorage.removeItem(ACTIVE_VIEW_KEY) } catch {}
}
