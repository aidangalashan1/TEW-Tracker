import { ReactNode } from 'react'

export function SectionCard({ header, children, style }: { header?: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="bg-secondary rounded p-3 px-4" style={{ ...style }}>
      {header && <div className="text-sm text-semibold text-primary mb-2 letter-spacing-0-5">{header}</div>}
      {children}
    </div>
  )
}
