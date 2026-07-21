import { UserPage } from './pageTypes'

const STORAGE_KEY = 'tew-pages'
const STORAGE_VERSION = 1
let _cached: UserPage[] | null = null

export const WORKER_LIST_PAGE_ID = 'entity-module-worker-list'

export function defaultPages(): UserPage[] {
  return [
    { id: WORKER_LIST_PAGE_ID, label: 'Roster' },
    { id: 'roster', label: 'Roster' },
    { id: 'booking', label: 'Booking' },
    { id: 'finances', label: 'Finances' },
  ]
}

export async function loadWorkspaceFromBackend(): Promise<{pages: UserPage[]; layouts: Record<string, any>} | null> {
  try {
    const m = await import('../api')
    const data = await m.api.workspace.get()
    if (data.pages?.length) {
      _cached = data.pages
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: STORAGE_VERSION, pages: data.pages }))
      return data as any
    }
  } catch {}
  return null
}

export function loadPages(): UserPage[] {
  if (_cached) return _cached
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPages()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    if (parsed._v && parsed._v >= STORAGE_VERSION && Array.isArray(parsed.pages)) return parsed.pages
    return defaultPages()
  } catch {
    return defaultPages()
  }
}

export function savePages(pages: UserPage[]): void {
  _cached = pages
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: STORAGE_VERSION, pages }))
  } catch {}
  // Fire-and-forget backend sync
  import('../api').then(m => m.api.workspace.save(pages, {})).catch(e => console.error('[pages] workspace sync failed', e))
}
