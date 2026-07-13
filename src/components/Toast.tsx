import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { COLOR_FACE, COLOR_HEEL, COLOR_MALE } from '../lib/colors'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding: '10px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: t.type === 'success' ? COLOR_FACE : t.type === 'error' ? COLOR_HEEL : COLOR_MALE,
              color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'opacity 0.2s', pointerEvents: 'auto',
              maxWidth: 320, wordWrap: 'break-word',
            }}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
