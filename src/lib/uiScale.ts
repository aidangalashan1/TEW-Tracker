/** UI auto-scale — see electron/main.js for the actual scaling mechanism
 *  (Chromium page-zoom driven from the display's size vs. a 2560x1440
 *  dev-monitor baseline). This module owns the user's manual override
 *  multiplier on top of that: a per-machine preference like ratingFormat,
 *  so it's kept in localStorage rather than save-file/backend data, and is
 *  independent per Electron profile the same way recent-DBs/pages are. */

const KEY = 'tew-ui-scale-override'
const PRESETS = [0.75, 0.85, 1, 1.1, 1.25] as const

function ea() {
  return (window as any).electronAPI
}

export function getZoomOverride(): number {
  const raw = localStorage.getItem(KEY)
  const n = raw ? parseFloat(raw) : 1
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** The auto-fit scale this specific window's own display computed, before
 *  the user's override multiplier — read-only, informational (e.g. so
 *  Settings can show "Auto-detected: 100%"). 1 outside Electron. */
export function getAutoScale(): number {
  return ea()?.uiScale?.getAutoScale ? ea().uiScale.getAutoScale() : 1
}

export function applyZoomOverride() {
  ea()?.uiScale?.setOverride?.(getZoomOverride())
}

export function setZoomOverride(mult: number) {
  localStorage.setItem(KEY, String(mult))
  applyZoomOverride()
}

export function resetZoomOverride() {
  localStorage.removeItem(KEY)
  applyZoomOverride()
}

export { PRESETS as ZOOM_PRESETS }

/** Call once per window at startup — applies the stored override on top of
 *  that window's own auto-scale, and re-applies it whenever main pushes a
 *  'rescale' (a monitor swap reset this window back to auto-scale x1). */
export function initUiScale() {
  applyZoomOverride()
  ea()?.uiScale?.onRescale?.(() => applyZoomOverride())
}
