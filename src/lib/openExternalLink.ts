// Opens a URL in the user's real browser via Electron's main process (a link
// can't just navigate the app:// window). Falls back to window.open for the
// plain-browser dev server, where there's no electronAPI bridge.
export function openExternalLink(url: string): void {
  try {
    const api = (window as any).electronAPI
    if (api?.openExternal) api.openExternal(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    /* best-effort */
  }
}
