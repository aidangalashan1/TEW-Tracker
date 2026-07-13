import { getAllModules } from '../modules/registry'

interface ModuleDrawerProps {
  open: boolean
  onClose: () => void
  onAdd: (moduleId: string) => void
}

export function ModuleDrawer({ open, onClose, onAdd }: ModuleDrawerProps) {
  if (!open) return null
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <span className="drawer-title">Add Module</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">
          {getAllModules().map(m => (
            <div key={m.id} className="module-picker-item" onClick={() => onAdd(m.id)}>
              <span className="module-picker-icon">{m.icon}</span>
              <div>
                <div className="module-picker-name">{m.name}</div>
                <div className="module-picker-desc">{m.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
