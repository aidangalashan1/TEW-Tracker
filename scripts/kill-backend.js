// Releases a running packaged backend (main.exe) before PyInstaller rebuilds it,
// so its output file isn't locked. Runs the same under cmd, PowerShell, or a
// POSIX shell — the previous inline `taskkill /F /IM ... & timeout /t 2` was
// cmd-only and broke whenever npm invoked the script through a different shell.
// Best-effort: a "not found" is the normal, healthy case.
const { execSync } = require('child_process')

try {
  if (process.platform === 'win32') {
    execSync('taskkill /F /IM main.exe', { stdio: 'ignore' })
  } else {
    execSync('pkill -f dist-python/main/main', { stdio: 'ignore' })
  }
  // Give the OS a moment to release the file handle after the kill. Portable
  // synchronous sleep (no cmd `timeout` / POSIX `sleep` dependency).
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500)
} catch {
  // No lingering backend to kill — nothing to wait for.
}
