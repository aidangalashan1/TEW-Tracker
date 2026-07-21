import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  const getFixedLeft = useCallback(() => {
    const el = ref.current
    if (!el) return undefined
    const sidebar = el.closest('[data-sidebar]')
    if (sidebar) return sidebar.getBoundingClientRect().left
    return undefined
  }, [])

  return (
    <span ref={ref} className="inline-flex"
      onMouseEnter={(e) => { setShow(true); setPos({ x: e.clientX, y: e.clientY }) }}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div style={{
          position: 'fixed',
          right: getFixedLeft() ? Math.min(window.innerWidth - getFixedLeft()! + 10, window.innerWidth - 530) : undefined,
          left: getFixedLeft() ? undefined : Math.min(pos.x + 10, window.innerWidth - 530),
          top: Math.max(pos.y - 10, 10), zIndex: 10000,
          background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
          fontSize: 11, padding: '5px 10px', borderRadius: 4,
          maxWidth: 520, whiteSpace: 'normal', lineHeight: 1.5,
          border: '1px solid var(--border-color)', pointerEvents: 'none',
        }}>{text}</div>,
        document.body
      )}
    </span>
  )
}
