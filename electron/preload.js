const { contextBridge, ipcRenderer } = require('electron')

// Fetch the backend port the main process chose, so the renderer's API client
// targets the right port even when 8567 was taken.
let apiBase = null
try {
  const port = ipcRenderer.sendSync('get-api-port')
  if (port) apiBase = `http://127.0.0.1:${port}/api`
} catch { /* not in Electron, or handler unavailable — fall back in api.ts */ }

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  apiBase,
  logError: (payload) => ipcRenderer.send('log-error', payload),
  quitApp: () => ipcRenderer.send('quit-app'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openPopout: (page, title, sub) => ipcRenderer.send('open-popout', { page, title, ...sub }),
  popoutWindowControl: (action) => ipcRenderer.send('popout-window-control', action),
  updates: {
    check: () => ipcRenderer.send('check-for-updates'),
    download: () => ipcRenderer.send('download-update'),
    install: () => ipcRenderer.send('install-update'),
    onStatus: (cb) => ipcRenderer.on('update-status', (_e, payload) => cb(payload)),
    setAutoCheckEnabled: (enabled) => ipcRenderer.send('set-auto-check-enabled', enabled),
  },
  uiScale: {
    // Sync so it's available before first paint (same reasoning as
    // get-api-port above) — how much this specific window's own display
    // differs from the 2560x1440 dev baseline, before any user override.
    getAutoScale: () => { try { return ipcRenderer.sendSync('get-auto-scale') } catch { return 1 } },
    // `mult` is the user's Settings-page override on top of that auto value
    // (1 = auto only). Re-sent on every change and once at startup — see
    // src/lib/uiScale.ts.
    setOverride: (mult) => ipcRenderer.send('set-zoom-override', mult),
    // Fired after a monitor swap (screen.on('display-metrics-changed') in
    // main) — the renderer re-sends its stored override so the reset auto
    // scale gets the user's multiplier re-applied on top.
    onRescale: (cb) => ipcRenderer.on('rescale', cb),
  },
})
