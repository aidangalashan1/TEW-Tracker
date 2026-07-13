import { useApp } from '../context/AppContext'

interface NavChipProps {
  type: 'worker' | 'belt' | 'fed' | 'tagteam'
  id: number
  label: string
  style?: React.CSSProperties
}

export function NavChip({ type, id, label, style }: NavChipProps) {
  const { navigateToEntity } = useApp()
  return (
    <span
      className="nav-chip"
      onClick={e => { e.stopPropagation(); navigateToEntity(type, id) }}
      style={{ cursor: 'pointer', outline: 'none', ...style }}
    >
      {label}
    </span>
  )
}
