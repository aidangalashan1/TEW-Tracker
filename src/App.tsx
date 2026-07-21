import { useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import { AppLayout } from './AppLayout'
import { ToastProvider } from './components/Toast'

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
  useEffect(() => {
    window.addEventListener('beforeunload', shutdownBackend)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') shutdownBackend()
    })
    return () => {
      window.removeEventListener('beforeunload', shutdownBackend)
    }
  }, [])

  return (
    <AppProvider>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </AppProvider>
  )
}
