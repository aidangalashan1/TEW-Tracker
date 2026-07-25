import { createPortal } from 'react-dom'
import closeIcon from '../../assets/UI icons/close.png'
import { PERCEPTION_LABELS } from '../../lib/labels'
import { GROUP_ORDER, type SubgroupDef, type SubgroupFilter } from './workerListGrouping'

/** The subgroup-creation/edit modal opened from "+ New" or a subgroup's edit
 *  icon in FilterPanel. Portaled and styled the same way as FilterPanel
 *  (.modal-overlay/.modal/.filter-box) rather than an inline absolute-
 *  positioned drawer, so it renders correctly above FilterPanel's own
 *  portaled overlay instead of being hidden behind it. */
export function SubgroupEditor({
  onClose,
  sgLabel, setSgLabel,
  sgFilters, setSgFilters,
  subgroups, onConfigChange,
  allBrands,
}: {
  onClose: () => void
  sgLabel: string
  setSgLabel: (s: string) => void
  sgFilters: SubgroupFilter
  setSgFilters: (f: SubgroupFilter) => void
  subgroups: SubgroupDef[]
  onConfigChange: (c: Record<string, any>) => void
  allBrands: number[]
}) {
  const isExisting = !!subgroups.find(s => s.label === sgLabel.trim())

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal flex flex-col" style={{ width: 420, maxWidth: '92vw', maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-header flex-shrink-0">
          <span className="modal-title">{isExisting ? 'Edit Subgroup' : 'New Subgroup'}</span>
          <button className="modal-close" onClick={onClose}>
            <img src={closeIcon} alt="" className="w-14 h-14 filter-icon-gray" />
          </button>
        </div>
        <div className="modal-body flex-1 overflow-auto flex flex-col gap-3">
          <div>
            <div className="text-xs text-semibold text-secondary mb-1">Label</div>
            <input className="input w-full" value={sgLabel} onChange={e => setSgLabel(e.target.value)} placeholder="e.g. Male Faces" />
          </div>

          <div className="filter-box">
            <div className="filter-box-header">Role</div>
            <div className="flex flex-col gap-1">
              {['Wrestler', ...GROUP_ORDER.role_advanced].map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer" onClick={() => {
                  const next = { ...sgFilters, role: sgFilters.role?.includes(p) ? sgFilters.role.filter(r => r !== p) : [...(sgFilters.role || []), p] }
                  setSgFilters(next)
                }}>
                  <div className={`toggle-track ${sgFilters.role?.includes(p) ? 'active' : ''}`}>
                    <div className="toggle-thumb" />
                  </div>
                  <span className="text-md">{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-box">
            <div className="filter-box-header">Gender</div>
            <div className="flex flex-col gap-1">
              {['Male', 'Female'].map(g => (
                <label key={g} className="flex items-center gap-2 cursor-pointer" onClick={() => {
                  const next = { ...sgFilters, gender: sgFilters.gender?.includes(g) ? sgFilters.gender.filter(x => x !== g) : [...(sgFilters.gender || []), g] }
                  setSgFilters(next)
                }}>
                  <div className={`toggle-track ${sgFilters.gender?.includes(g) ? 'active' : ''}`}>
                    <div className="toggle-thumb" />
                  </div>
                  <span className="text-md">{g}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-box">
            <div className="filter-box-header">Disposition</div>
            <div className="flex flex-col gap-1">
              {['Face', 'Heel'].map(d => (
                <label key={d} className="flex items-center gap-2 cursor-pointer" onClick={() => {
                  const next = { ...sgFilters, disposition: sgFilters.disposition?.includes(d) ? sgFilters.disposition.filter(x => x !== d) : [...(sgFilters.disposition || []), d] }
                  setSgFilters(next)
                }}>
                  <div className={`toggle-track ${sgFilters.disposition?.includes(d) ? 'active' : ''}`}>
                    <div className="toggle-thumb" />
                  </div>
                  <span className="text-md">{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-box">
            <div className="filter-box-header">Perception</div>
            <div className="flex flex-col gap-1">
              {Object.entries(PERCEPTION_LABELS).filter(([k]) => Number(k) > 0).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 cursor-pointer" onClick={() => {
                  const p = Number(k)
                  const next = { ...sgFilters, perception: sgFilters.perception?.includes(p) ? sgFilters.perception.filter(x => x !== p) : [...(sgFilters.perception || []), p] }
                  setSgFilters(next)
                }}>
                  <div className={`toggle-track ${sgFilters.perception?.includes(Number(k)) ? 'active' : ''}`}>
                    <div className="toggle-thumb" />
                  </div>
                  <span className="text-md">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {allBrands.length > 1 && (
            <div className="filter-box">
              <div className="filter-box-header">Brand</div>
              <div className="flex flex-col gap-1">
                {allBrands.map(b => (
                  <label key={b} className="flex items-center gap-2 cursor-pointer" onClick={() => {
                    const next = { ...sgFilters, brand: sgFilters.brand?.includes(b) ? sgFilters.brand.filter(x => x !== b) : [...(sgFilters.brand || []), b] }
                    setSgFilters(next)
                  }}>
                    <div className={`toggle-track ${sgFilters.brand?.includes(b) ? 'active' : ''}`}>
                      <div className="toggle-thumb" />
                    </div>
                    <span className="text-md">Brand {b}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-between border-default-top p-3 flex-shrink-0">
          <button className="manage-view-btn text-sm" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!sgLabel.trim()}
            onClick={() => {
              const cleaned: SubgroupFilter = {}
              for (const [k, v] of Object.entries(sgFilters)) {
                if (v && v.length > 0) (cleaned as any)[k] = v
              }
              const next = isExisting
                ? subgroups.map(s => s.label === sgLabel.trim() ? { ...s, filters: cleaned } : s)
                : [...subgroups, { label: sgLabel.trim(), filters: cleaned }]
              onConfigChange({ subgroups: next })
              onClose()
            }}>{isExisting ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
