import type { RosterTab, CreativeTab, StorylinesSubTab } from '../context/UIContext'

/** Popped-out windows load the exact same renderer bundle as the main
 *  window, distinguished only by a `?popout=<page>` query param (plus
 *  optional sub-tab state) the main process attaches when it opens one (see
 *  electron/main.js's ipcMain.on('open-popout', ...)). Read once at module
 *  load — the query string is fixed for the lifetime of a given window. */
const params = new URLSearchParams(window.location.search)
const popoutPage = params.get('popout')

/** True when this renderer is running in a secondary, pinned page window
 *  rather than the main app window. */
export const isPopoutWindow = !!popoutPage

/** The page this popout window should boot straight into (undefined for the
 *  main window, which always starts on the default 'roster' page). */
export const popoutInitialPage = popoutPage || undefined

/** The human-readable label the opening window passed (e.g. "Roster —
 *  Champions") — PopoutTitleBar shows this since a frameless popout has no
 *  native titlebar text of its own. */
export const popoutTitle = params.get('title') || undefined

/** The fed the opening window currently had focused (TopBar's company
 *  switcher) — most top-level pages (Roster, Champions, Teams & Stables,
 *  Schedule, ...) scope themselves to `focusedFed`, which a popout's own
 *  fresh DataProvider would otherwise default back to the *player's* fed
 *  regardless of what the main window was actually showing (e.g. popping
 *  out Champions while browsing a rival promotion silently showed the
 *  player's own promotion's belts instead). undefined for the main window
 *  and for popouts opened from a page that doesn't carry a fed at all. */
const focusedFedUidParam = params.get('focusedFedUid')
export const popoutInitialFocusedFedUid = focusedFedUidParam ? Number(focusedFedUidParam) : undefined

export function popoutWindowControl(action: 'minimize' | 'maximize' | 'close') {
  const ea = (window as any).electronAPI
  if (ea?.popoutWindowControl) ea.popoutWindowControl(action)
}

/** Some top-level pages (Roster, Booking) hold their currently-shown tab in
 *  UIContext rather than in `currentPage` itself (e.g. Full Roster vs.
 *  Teams & Stables vs. Champions are all WORKER_LIST_PAGE_ID with a
 *  different rosterTab) — so a popout needs this too, or it would always
 *  reset to that page's default tab instead of the one the user actually
 *  had open. Each is undefined unless the opening window passed it. */
export interface PopoutInitialUI {
  rosterTab?: RosterTab
  creativeTab?: CreativeTab
  storylinesSubTab?: StorylinesSubTab
}

export const popoutInitialUI: PopoutInitialUI = {
  rosterTab: (params.get('rosterTab') as RosterTab) || undefined,
  creativeTab: (params.get('creativeTab') as CreativeTab) || undefined,
  storylinesSubTab: (params.get('storylinesSubTab') as StorylinesSubTab) || undefined,
}

export interface PopoutOpenOptions extends PopoutInitialUI {
  focusedFedUid?: number
}

export function openPopout(page: string, title?: string, sub?: PopoutOpenOptions) {
  const ea = (window as any).electronAPI
  if (ea?.openPopout) ea.openPopout(page, title, sub)
}
