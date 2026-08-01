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
})
