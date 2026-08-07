import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type UpdateStatus =
  | { state: 'available'; version: string }
  | { state: 'not-available' }
  | { state: 'error'; message: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }

// Persistent (not auto-dismissing like Toast) banner surfacing electron-updater
// progress from main (see electron/main.js "Auto-update"). Only mounted for the
// main window — popouts share the same backend/app instance, so relaunching
// from a popout's own 'install' click would be confusing.
export function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const api = (window as any).electronAPI

  useEffect(() => {
    if (!api?.updates) return
    api.updates.onStatus((payload: UpdateStatus) => {
      if (payload.state === 'not-available') { setStatus(null); return }
      setStatus(payload)
    })
  }, [api])

  if (!api?.updates || !status || status.state === 'error') return null

  let label: string
  let action: { text: string; onClick: () => void } | null = null

  if (status.state === 'available') {
    label = `Update available (v${status.version})`
    action = { text: 'Download', onClick: () => api.updates.download() }
  } else if (status.state === 'downloading') {
    label = `Downloading update… ${Math.round(status.percent)}%`
  } else if (status.state === 'downloaded') {
    label = `Update ready (v${status.version})`
    action = { text: 'Restart & Install', onClick: () => api.updates.install() }
  } else {
    return null
  }

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10001,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      padding: '8px 16px', background: 'var(--accent)', color: '#fff',
      fontSize: 12, fontWeight: 600,
    }}>
      <span>{label}</span>
      {action && (
        <button
          className="btn"
          style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
          onClick={action.onClick}
        >
          {action.text}
        </button>
      )}
    </div>,
    document.body
  )
}
