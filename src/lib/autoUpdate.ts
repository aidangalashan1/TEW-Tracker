/** User's opt-in/out preference for automatic update checks — a per-machine
 *  setting like ui-scale, so it lives in localStorage rather than save-file
 *  data. Main only ever *checks* on startup (never auto-downloads or
 *  auto-installs — see electron/main.js), so disabling this just silences
 *  that startup check; the Settings page's "Check Now" button always works
 *  regardless, since that's an explicit user action, not an automatic one. */

const KEY = 'tew-auto-update-enabled'

function ea() {
  return (window as any).electronAPI
}

export function getAutoUpdateEnabled(): boolean {
  return localStorage.getItem(KEY) !== 'false'
}

export function setAutoUpdateEnabled(enabled: boolean) {
  localStorage.setItem(KEY, String(enabled))
  ea()?.updates?.setAutoCheckEnabled?.(enabled)
}

/** Call once per main-window startup — tells main whether it's allowed to
 *  run its startup update check. Popouts don't call this; only the main
 *  window's electron/main.js checkForUpdates() call is gated by it. */
export function initAutoUpdatePreference() {
  ea()?.updates?.setAutoCheckEnabled?.(getAutoUpdateEnabled())
}
