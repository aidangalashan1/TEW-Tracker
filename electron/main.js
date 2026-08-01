const { app, BrowserWindow, ipcMain, protocol, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const net = require('net')
const fs = require('fs')

let pythonProcess = null
let mainWindow = null

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
  }
  // F12 to toggle DevTools
  mainWindow.webContents.on('before-input-event', (e, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
  })
  mainWindow.maximize()
}

app.whenReady().then(createWindow)

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
