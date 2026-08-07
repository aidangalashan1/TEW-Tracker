const { app, BrowserWindow, ipcMain, protocol, shell, screen } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const net = require('net')
const fs = require('fs')

let pythonProcess = null
let mainWindow = null
// Popped-out page windows (see openPopoutWindow) — tracked only so they can
// be enumerated/closed together if ever needed; window-all-closed already
// does the right thing (quits once every window, main or popout, is gone)
// without any special-casing here.
const popoutWindows = new Set()

// ── UI auto-scale ──
// Every layout in this app (topbar height, table columns, modal widths, ...)
// was built with fixed px against a 2560x1440 dev monitor rather than
// relative units — retrofitting the whole component tree to rem/vw would be
// a huge, risky change. Instead, scale the entire rendered page uniformly
// via Chromium's page-zoom (webContents.setZoomFactor), computed from how
// the actual display compares to that 2560x1440 baseline. This keeps every
// existing px value correct relative to itself; it's just rendered smaller
// or larger as a whole, the same way Ctrl+/- zoom works.
const BASE_WIDTH = 2560
const BASE_HEIGHT = 1440
const MIN_SCALE = 0.65
const MAX_SCALE = 1.5

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)) }

// Scale purely from the display's *own* size, ignoring window bounds — a
// maximized/fullscreen window's bounds ARE the display size, but a popout
// opened at a fixed 900x700 shouldn't render tiny UI just because its own
// window is small; it should match what the rest of the app looks like on
// that monitor.
function computeAutoScale(win) {
  const display = win ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  return clamp(Math.min(width / BASE_WIDTH, height / BASE_HEIGHT), MIN_SCALE, MAX_SCALE)
}

// User-facing "Display Scale" preference in Settings — a multiplier on top
// of the auto-computed scale, so someone on a small laptop panel who still
// finds the auto-fit too small (or a 4K user who wants it smaller than
// auto-fit) can adjust. Persisted renderer-side (localStorage, see
// src/lib/uiScale.ts) since it's a per-machine UI preference like
// ratingFormat, not save-file data — the renderer just tells us the
// multiplier to apply.
function applyZoom(win, overrideMultiplier = 1) {
  if (!win || win.isDestroyed()) return
  const mult = clamp(Number(overrideMultiplier) || 1, 0.5, 2)
  win.webContents.setZoomFactor(clamp(computeAutoScale(win) * mult, MIN_SCALE, MAX_SCALE * 2))
}

function allLiveWindows() {
  return [mainWindow, ...popoutWindows].filter(w => w && !w.isDestroyed())
}

ipcMain.on('get-auto-scale', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  e.returnValue = computeAutoScale(win)
})

ipcMain.on('set-zoom-override', (e, mult) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  applyZoom(win, mult)
})

// A monitor swap (undocking a laptop, moving the window to a different-DPI
// display) changes what "auto-fit" means — re-apply to every open window.
// This resets each window back to auto-scale × 1 rather than remembering
// per-window override multipliers here (main has no reason to track that
// state); the renderer re-asserts its stored override on the next 'rescale'
// push below, same as it does once on startup.
//
// Registered inside whenReady() rather than at module scope — the `screen`
// module's getter throws until the app 'ready' event has fired, and this
// file runs (loading every top-level ipcMain.on/function decl above) well
// before that.
function registerDisplayWatcher() {
  screen.on('display-metrics-changed', () => {
    for (const win of allLiveWindows()) {
      applyZoom(win, 1)
      win.webContents.send('rescale')
    }
  })
}

// The packaged renderer is served from a custom `app://` scheme rather than a
// bare file:// path. That gives the page a real, stable web origin so Chromium's
// same-origin policy can stay ON (webSecurity: true) — the backend's CORS
// allowlist includes `app://bundle`, and 127.0.0.1 is a trustworthy origin, so
// API calls work without disabling web security. Registered as privileged so it
// behaves like https (secure context, fetch support) before the app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
])

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.map': 'application/json', '.wasm': 'application/wasm',
}

// ── Diagnostics log (userData/logs/app.log) ──
// Captures renderer errors (via IPC) and the Python backend's output, so a
// field issue can be diagnosed from a file without reproducing it live.
function appendLog(line) {
  try {
    const dir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(path.join(dir, 'app.log'), `[${new Date().toISOString()}] ${line}\n`)
  } catch { /* logging must never crash the app */ }
}

// ── Auto-update ──
// Ships against a private GitHub repo (see package.json "build.publish"),
// so electron-updater needs a token with read access to that repo's
// Releases to check/download — set GH_TOKEN (or ELECTRON_UPDATER_TOKEN,
// which electron-updater also honors) in the environment the packaged app
// runs in. Without it, checkForUpdates() just fails silently below and the
// app behaves as if no update is available; it never blocks startup.
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false
if (process.env.ELECTRON_UPDATER_TOKEN) {
  process.env.GH_TOKEN = process.env.ELECTRON_UPDATER_TOKEN
}

function broadcast(channel, payload) {
  for (const win of allLiveWindows()) {
    if (!win.webContents.isDestroyed()) win.webContents.send(channel, payload)
  }
}

autoUpdater.on('update-available', (info) => {
  appendLog(`UPDATER update available: ${info.version}`)
  broadcast('update-status', { state: 'available', version: info.version })
})
autoUpdater.on('update-not-available', () => {
  broadcast('update-status', { state: 'not-available' })
})
autoUpdater.on('error', (err) => {
  appendLog(`UPDATER error: ${err?.message || err}`)
  broadcast('update-status', { state: 'error', message: err?.message || String(err) })
})
autoUpdater.on('download-progress', (progress) => {
  broadcast('update-status', { state: 'downloading', percent: progress.percent })
})
autoUpdater.on('update-downloaded', (info) => {
  appendLog(`UPDATER downloaded: ${info.version}`)
  broadcast('update-status', { state: 'downloaded', version: info.version })
})

ipcMain.on('check-for-updates', () => {
  if (!app.isPackaged) { broadcast('update-status', { state: 'not-available' }); return }
  autoUpdater.checkForUpdates().catch((err) => appendLog(`UPDATER check failed: ${err?.message || err}`))
})

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate().catch((err) => appendLog(`UPDATER download failed: ${err?.message || err}`))
})

// Quits and relaunches into the downloaded installer — same shutdown path as
// quit-app (the Python backend must be told to exit gracefully first) rather
// than autoUpdater.quitAndInstall()'s default abrupt app.quit().
ipcMain.on('install-update', async () => {
  await shutdownPython()
  autoUpdater.quitAndInstall()
})

const isDev = process.env.TEW_PROD ? false : !app.isPackaged
let API_PORT = parseInt(process.env.TEW_API_PORT || '8567', 10)
let API_BASE = `http://127.0.0.1:${API_PORT}`

// Resolve a free TCP port, preferring `preferred` (8567) but falling back to an
// OS-assigned ephemeral port if it's taken — so an orphaned backend from a
// previous unclean shutdown can't prevent the app from launching.
function findFreePort(preferred) {
  return new Promise((resolve) => {
    const tryPort = (port, onBusy) => {
      const srv = net.createServer()
      srv.once('error', onBusy)
      srv.listen(port, '127.0.0.1', () => {
        const chosen = srv.address().port
        srv.close(() => resolve(chosen))
      })
    }
    tryPort(preferred, () => tryPort(0, () => resolve(preferred)))
  })
}

function getPythonExePath() {
  if (isDev) return null
  if (app.isPackaged) return path.join(process.resourcesPath, 'python', 'main.exe')
  return path.join(__dirname, '..', 'dist-python', 'main', 'main.exe')
}

function getPythonCwd() {
  if (isDev) return path.join(__dirname, '..')
  if (app.isPackaged) return path.join(process.resourcesPath, 'python')
  return path.join(__dirname, '..', 'dist-python', 'main')
}

function waitForHealth(retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    function check(attempt) {
      const req = http.get(`${API_BASE}/api/health`, (res) => {
        if (res.statusCode === 200) return resolve()
        if (attempt >= retries) return reject(new Error('Python backend did not start'))
        setTimeout(() => check(attempt + 1), delay)
      })
      req.on('error', () => {
        if (attempt >= retries) return reject(new Error('Python backend did not start'))
        setTimeout(() => check(attempt + 1), delay)
      })
      req.end()
    }
    check(0)
  })
}

function shutdownPython() {
  // Try graceful shutdown via API
  return new Promise((resolve) => {
    const req = http.request(`${API_BASE}/api/system/shutdown`, { method: 'POST' }, () => resolve())
    req.on('error', () => resolve())
    req.end()
    // Force kill after 2s if graceful fails
    setTimeout(() => {
      if (pythonProcess) { pythonProcess.kill(); pythonProcess = null }
      resolve()
    }, 2000)
  })
}

function startPythonBackend() {
  const exePath = getPythonExePath()
  const cwd = getPythonCwd()

  const spawnEnv = { ...process.env, TEW_API_PORT: String(API_PORT) }
  if (exePath) {
    pythonProcess = spawn(exePath, [], { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: spawnEnv })
  } else {
    const script = path.join(__dirname, '..', 'python', 'main.py')
    pythonProcess = spawn('py', [script], { cwd: path.join(__dirname, '..'), stdio: ['pipe', 'pipe', 'pipe'], env: spawnEnv })
  }

  pythonProcess.stdout.on('data', (d) => { const s = String(d); console.log(`[Python] ${s}`); appendLog(`PY ${s.trimEnd()}`) })
  pythonProcess.stderr.on('data', (d) => { const s = String(d); console.error(`[Python] ${s}`); appendLog(`PYERR ${s.trimEnd()}`) })
  pythonProcess.on('close', (c) => {
    console.log(`[Python] exited with code ${c}`)
    pythonProcess = null
  })
}

// Handle renderer request to quit the app
ipcMain.on('quit-app', async () => {
  await shutdownPython()
  app.quit()
})

// Renderer asks (synchronously, at preload time) which port the backend is on.
ipcMain.on('get-api-port', (e) => { e.returnValue = API_PORT })

// Renderer forwards caught errors here to be persisted to the diagnostics log.
ipcMain.on('log-error', (_e, payload) => {
  try { appendLog(`RENDERER ${JSON.stringify(payload)}`) } catch { appendLog('RENDERER <unserializable payload>') }
})

// Open a link in the user's real browser rather than inside the app window —
// only http(s) URLs are allowed, since this is reachable from the renderer.
ipcMain.on('open-external', (_e, url) => {
  try {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url)
  } catch { /* best-effort */ }
})

// Same renderer bundle the main window loads, but with a `?popout=<page>`
// query param (plus optional sub-tab state — see open-popout below) the
// renderer reads at startup to (a) boot straight into that page/tab instead
// of the default 'roster' view and (b) skip the main-window-only
// backend-shutdown-on-close wiring (see App.tsx) — a popout is just another
// view onto the same already-running backend, closing it must not tear that
// down for the main window still open next to it.
function rendererUrl(popoutPage, extra) {
  const qs = new URLSearchParams({ popout: popoutPage, ...extra })
  return isDev ? `http://localhost:5173/?${qs}` : `app://bundle/index.html?${qs}`
}

// A pinned, independently resizable/movable window showing a single page —
// lets the user keep e.g. the roster or champions list visible while
// booking on the main window. Frameless (frame: false), same as the main
// window, so it reads as part of this app rather than a generic OS window —
// the renderer draws its own titlebar (see PopoutTitleBar.tsx) with a drag
// region and minimize/maximize/close buttons wired to the IPC handlers
// below, since frame:false gives up all of that native chrome.
//
// `rosterTab`/`creativeTab`/`storylinesSubTab` are the sub-tab a
// currentPage-level page can be showing (e.g. WORKER_LIST_PAGE_ID's Full
// Roster/Developmental/Teams & Stables/Champions, or the Booking page's own
// tab strip) — that state lives in UIContext, not in `currentPage` itself,
// so it has to be threaded through separately for the popout to open on the
// exact same tab the user was looking at rather than always resetting to
// that page's default sub-tab.
//
// `focusedFedUid` is the company the opening window's TopBar switcher had
// selected. Most top-level pages (Roster, Champions, Teams & Stables, ...)
// are scoped to that fed, not always the player's own — without forwarding
// it, a popout's own fresh DataProvider falls back to the player's fed by
// default, so e.g. popping out Champions while browsing a rival promotion
// silently showed the player's own promotion's belts instead.
ipcMain.on('open-popout', (_e, { page, title, rosterTab, creativeTab, storylinesSubTab, focusedFedUid } = {}) => {
  if (typeof page !== 'string' || !page) return
  const extra = {}
  if (rosterTab) extra.rosterTab = rosterTab
  if (creativeTab) extra.creativeTab = creativeTab
  if (storylinesSubTab) extra.storylinesSubTab = storylinesSubTab
  if (focusedFedUid != null) extra.focusedFedUid = String(focusedFedUid)
  if (title) extra.title = title
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 480,
    minHeight: 360,
    title: title ? `TEW Tracker — ${title}` : 'TEW Tracker',
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  popoutWindows.add(win)
  win.on('closed', () => popoutWindows.delete(win))
  applyZoom(win)
  win.webContents.once('did-finish-load', () => applyZoom(win))
  win.loadURL(rendererUrl(page, extra))
})

// Popout windows draw their own titlebar (PopoutTitleBar.tsx) since
// frame:false gives up the OS's minimize/maximize/close buttons — these
// resolve the *sending* window via event.sender rather than a single
// tracked reference, so several popouts open at once each control only
// themselves. `close` is a plain window close (not quit-app/shutdownPython)
// — a popout is just a view onto the shared backend, see App.tsx.
ipcMain.on('popout-window-control', (e, action) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  if (action === 'minimize') win.minimize()
  else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize()
  else if (action === 'close') win.close()
})

async function createWindow() {
  // Clear GPU/disk cache from any prior unclean shutdown
  const cacheDir = path.join(app.getPath('userData'), 'Cache')
  const gpuCacheDir = path.join(app.getPath('userData'), 'GPUCache')
  try { fs.rmSync(cacheDir, { recursive: true, force: true }) } catch {}
  try { fs.rmSync(gpuCacheDir, { recursive: true, force: true }) } catch {}

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TEW Tracker',
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  applyZoom(mainWindow)
  mainWindow.webContents.once('did-finish-load', () => applyZoom(mainWindow))

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    if (!process.env.TEW_PROD) {
      API_PORT = await findFreePort(API_PORT)
      startPythonBackend()
    }
    API_BASE = `http://127.0.0.1:${API_PORT}`
    console.log(`[Electron] Using backend port ${API_PORT}`)
    try {
      await waitForHealth()
      console.log('[Electron] Python backend is ready')
    } catch (e) {
      console.error('[Electron] Failed to start Python backend:', e.message)
    }
    // Serve the built SPA over app:// from dist/ (bundled into the asar). fs
    // reads work transparently inside the asar; an explicit MIME map keeps ES
    // modules executable (Chromium refuses modules served as octet-stream).
    const distDir = path.join(__dirname, '..', 'dist')
    protocol.handle('app', (request) => {
      const { pathname } = new URL(request.url)
      let rel = decodeURIComponent(pathname)
      if (rel === '/' || rel === '') rel = '/index.html'
      const filePath = path.normalize(path.join(distDir, rel))
      if (!filePath.startsWith(distDir)) return new Response('Forbidden', { status: 403 })
      try {
        const data = fs.readFileSync(filePath)
        const ext = path.extname(filePath).toLowerCase()
        return new Response(data, { headers: { 'content-type': MIME_TYPES[ext] || 'application/octet-stream' } })
      } catch {
        // SPA fallback: unknown non-asset path resolves to the app shell.
        try {
          return new Response(fs.readFileSync(path.join(distDir, 'index.html')), { headers: { 'content-type': 'text/html' } })
        } catch {
          return new Response('Not found', { status: 404 })
        }
      }
    })
    mainWindow.loadURL('app://bundle/index.html')
    // Check on every launch, a few seconds after startup so it never
    // competes with the backend-connect/first-paint work above for CPU/network.
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => appendLog(`UPDATER startup check failed: ${err?.message || err}`))
    }, 5000)
  }
  // F12 to toggle DevTools
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
  })
  mainWindow.maximize()
}

// A second launch (e.g. double-clicking the exe again while the app is
// already open) would spawn its own Python backend and try to open the same
// .mdb save file the first instance already has open — Access's own file
// locking (the .ldb sidecar) means that second connection can corrupt state
// or just fail confusingly. Refuse the second instance's app.whenReady()
// entirely and instead just refocus the window the first instance already
// has open.
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    registerDisplayWatcher()
    return createWindow()
  })

  app.on('window-all-closed', async () => {
    await shutdownPython()
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('before-quit', async () => {
    await shutdownPython()
  })
}
