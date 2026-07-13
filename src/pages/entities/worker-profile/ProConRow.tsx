import { ReactNode } from 'react'

export function ProConRow({ icon, label, color }: { icon: ReactNode; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12, color: color || 'var(--text-secondary)' }}>
      {icon}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  )
}
