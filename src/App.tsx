import { useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import { AppLayout } from './AppLayout'
import { ToastProvider } from './components/Toast'
import { UpdateBanner } from './components/UpdateBanner'
import { isPopoutWindow, popoutInitialPage, popoutInitialUI, popoutInitialFocusedFedUid } from './lib/popout'
import { initUiScale } from './lib/uiScale'

function shutdownBackend() {
  for (let i = 0; i < 3; i++) {
    try {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', 'http://127.0.0.1:8567/api/system/shutdown', false)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.send()
      return
    } catch {}
  }
}

export default function App() {
  // Every window (main or popout) is its own Electron renderer/webContents,
  // so each needs this call — applies the user's stored Settings-page zoom
  // override on top of main's own display-based auto-scale for this window.
  useEffect(() => { initUiScale() }, [])

  useEffect(() => {
    // Only the main window's close should tear down the shared backend — a
    // popout is just another view onto the same already-running Python
    // process (see lib/popout.ts), so closing one must leave it alone.
    if (isPopoutWindow) return
    // Only shut the backend down when the window is actually closing —
    // visibilitychange also fires with 'hidden' on a plain Alt-Tab or
    // minimize (e.g. switching to TEW itself), which used to kill the
    // backend on every such switch.
    window.addEventListener('beforeunload', shutdownBackend)
    return () => {
      window.removeEventListener('beforeunload', shutdownBackend)
    }
  }, [])

  return (
    <AppProvider initialPage={popoutInitialPage} initialUI={popoutInitialUI} initialFocusedFedUid={popoutInitialFocusedFedUid}>
      <ToastProvider>
        {!isPopoutWindow && <UpdateBanner />}
        <AppLayout popout={isPopoutWindow} />
      </ToastProvider>
    </AppProvider>
  )
}
