import React from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api'
import closeIcon from '../../assets/UI icons/close.png'
import manageIcon from '../../assets/UI icons/manageview.png'
import moveUpIcon from '../../assets/UI icons/moveup.png'
import moveDownIcon from '../../assets/UI icons/movedown.png'
import plusIcon from '../../assets/UI icons/plus.png'
import confirmIcon from '../../assets/UI icons/confirm.png'
import { GROUP_ORDER, type SubgroupDef, type SubgroupFilter } from './workerListGrouping'
import type { FilterRule, DimDef } from './workerListFilters'

/** No standalone minus asset exists in the icon set (only plus.png) — drawn
 *  as a matching flat SVG so the stepper's minus button is an icon like
 *  every other control in this panel, not a unicode glyph. */
const minusIcon = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="2" rx="1"/></svg>'
)

const NUMBER_OPTIONS = Array.from({ length: 101 }, (_, i) => i)
const clampNumber = (n: number) => Math.min(100, Math.max(0, n))

/** The group-by/subgroups/custom-filter-rules modal opened from the "Filter"
 *  button. Laid out as boxed sections with grid-aligned rows (Group By /
 *  Subgroups / Custom Filters), rather than one flat flowing list, so each
 *  concern reads as its own region and multi-field rows line up. */
export function FilterPanel({
  onClose,
  orderedDims,
  selectedDim, setSelectedDim,
  groupBy, setGroupBy,
  advancedRoleFilters, setAdvancedRoleFilters,
  subgroups, activeSubgroups, setActiveSubgroups,
  selectedSg, setSelectedSg,
  setShowSgEditor, setSgLabel, setSgFilters,
  filterRules, filterDimensions,
  onConfigChange,
}: {
  onClose: () => void
  orderedDims: { id: string; label: string }[]
  selectedDim: string | null
  setSelectedDim: (id: string | null) => void
  groupBy: Set<string>
  setGroupBy: (s: Set<string>) => void
  advancedRoleFilters: Set<string>
  setAdvancedRoleFilters: (s: Set<string>) => void
  subgroups: SubgroupDef[]
  activeSubgroups: Set<string>
  setActiveSubgroups: (s: Set<string>) => void
  selectedSg: string | null
  setSelectedSg: (s: string | null) => void
  setShowSgEditor: (b: boolean) => void
  setSgLabel: (s: string) => void
  setSgFilters: (f: SubgroupFilter) => void
  filterRules: FilterRule[]
  filterDimensions: DimDef[]
  onConfigChange: (c: Record<string, any>) => void
}) {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal flex flex-col" style={{ width: 620, maxWidth: '92vw', maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="modal-header flex-shrink-0">
          <span className="modal-title">Filters</span>
          <div className="flex gap-1 ml-auto mr-2">
            <button className="manage-view-btn text-xs px-1 py-0" onClick={() => {
              const data = {
                dimOrder: orderedDims.map(d => d.id),
                groupBy: Array.from(groupBy),
                activeSubgroups: Array.from(activeSubgroups),
                advancedRoleFilters: Array.from(advancedRoleFilters),
                subgroups,
                filterRules,
              }
              api.filters.export(JSON.stringify(data, null, 2))
            }} title="Export filters to file">Export</button>
            <button className="manage-view-btn text-xs px-1 py-0" onClick={async () => {
              const res = await api.filters.import()
              if (res.ok && res.data) {
                try {
                  const parsed = JSON.parse(res.data)
                  onConfigChange(parsed)
                } catch {}
              }
            }} title="Import filters from file">Import</button>
          </div>
          <button className="modal-close" onClick={onClose}>
            <img src={closeIcon} alt="" className="w-14 h-14 filter-icon-gray" />
          </button>
        </div>
        <div className="modal-body flex-1 overflow-auto flex flex-col gap-3">

          <div className="filter-box">
            <div className="filter-box-header">Group By</div>
            <div className="flex flex-col gap-1">
              {orderedDims.flatMap((g, gIdx) => {
                const isSelected = selectedDim === g.id
                const items: React.ReactNode[] = []
                items.push(
                  <div key={g.id} className="flex items-center gap-1"
                    draggable
                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `dim-${gIdx}`) }}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={e => {
                      e.preventDefault()
                      const raw = e.dataTransfer.getData('text/plain')
                      if (!raw.startsWith('dim-')) return
                      const from = parseInt(raw.slice(4))
                      if (!isNaN(from) && from !== gIdx) {
                        const next = [...orderedDims]
                        const [moved] = next.splice(from, 1)
                        next.splice(gIdx, 0, moved)
                        onConfigChange({ dimOrder: next.map(d => d.id) })
                      }
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    {isSelected && (
                      <div className="flex flex-col flex-shrink-0 gap-1px" style={{ width: 20 }}>
                        <button className="manage-view-btn flex-center" disabled={gIdx === 0} onClick={() => {
                          const next = [...orderedDims]
                          const tmp = next[gIdx - 1]; next[gIdx - 1] = next[gIdx]; next[gIdx] = tmp
                          onConfigChange({ dimOrder: next.map(d => d.id) })
                        }} style={{ padding: '2px 4px', opacity: gIdx === 0 ? 0.3 : 1 }}>
                          <img src={moveUpIcon} alt="" style={{ width: 10, height: 10 }} />
                        </button>
                        <button className="manage-view-btn flex-center" disabled={gIdx === orderedDims.length - 1} onClick={() => {
                          const next = [...orderedDims]
                          const tmp = next[gIdx + 1]; next[gIdx + 1] = next[gIdx]; next[gIdx] = tmp
                          onConfigChange({ dimOrder: next.map(d => d.id) })
                        }} style={{ padding: '2px 4px', opacity: gIdx === orderedDims.length - 1 ? 0.3 : 1 }}>
                          <img src={moveDownIcon} alt="" style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    )}
                    {!isSelected && <div style={{ width: 20 }} />}
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`toggle-track ${groupBy.has(g.id) ? 'active' : ''}`} onClick={() => {
                        const next = new Set(groupBy)
                        if (next.has(g.id)) next.delete(g.id); else next.add(g.id)
                        setGroupBy(next)
                      }}>
                        <div className="toggle-thumb" />
                      </div>
                      <span className="text-md cursor-pointer" style={{ color: groupBy.has(g.id) ? 'var(--accent-green)' : 'var(--text-primary)' }}
                        onClick={() => setSelectedDim(isSelected ? null : g.id)}>{g.label}</span>
                    </div>
                  </div>
                )
                if (g.id === 'role' && groupBy.has('role')) {
                  items.push(
                    <div key="role-advanced" style={{ marginLeft: 52 }} className="flex flex-col gap-1">
                      <div className="text-xs text-semibold text-muted text-uppercase">Advanced</div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div className="toggle-track active">
                          <div className="toggle-thumb" />
                        </div>
                        <span className="text-md" style={{ color: 'var(--accent-green)' }}>Wrestler</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer" onClick={() => {
                        const next = new Set(advancedRoleFilters)
                        const allActive = GROUP_ORDER.role_advanced.every(p => next.has(p))
                        for (const p of GROUP_ORDER.role_advanced) {
                          if (allActive) next.delete(p); else next.add(p)
                        }
                        setAdvancedRoleFilters(next)
                      }}>
                        <div className={`toggle-track ${GROUP_ORDER.role_advanced.every(p => advancedRoleFilters.has(p)) ? 'active' : ''}`}>
                          <div className="toggle-thumb" />
                        </div>
                        <span className="text-md">Non-Wrestler</span>
                      </label>
                      <div className="ml-5 flex flex-col gap-1">
                        {GROUP_ORDER.role_advanced.map(p => (
                          <label key={p} className="flex items-center gap-2 cursor-pointer" onClick={() => {
                            const next = new Set(advancedRoleFilters)
                            if (next.has(p)) next.delete(p); else next.add(p)
                            setAdvancedRoleFilters(next)
                          }}>
                            <div className={`toggle-track ${advancedRoleFilters.has(p) ? 'active' : ''}`}>
                              <div className="toggle-thumb" />
                            </div>
                            <span className="text-md">{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                }
                return items
              })}
            </div>
          </div>

          <div className="filter-box">
            <div className="flex-between mb-2">
              <div className="filter-box-header" style={{ marginBottom: 0 }}>Subgroups</div>
              <button className="manage-view-btn text-xs" style={{ padding: '3px 10px' }}
                onClick={() => { setShowSgEditor(true); setSgLabel(''); setSgFilters({}) }}>+ New</button>
            </div>
            <div className="flex flex-col gap-1">
              {subgroups.map((sg, sgIdx) => {
                const activeDims = (Object.keys(sg.filters) as (keyof SubgroupFilter)[]).filter(k => (sg.filters[k]?.length ?? 0) > 0)
                const sub = activeDims.map(d => `${d}: ${sg.filters[d]!.join(',')}`).join(' ')
                const isSelected = selectedSg === sg.label
                return (
                  <div key={sg.label} className="flex items-center gap-1"
                    draggable
                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `sg-${sgIdx}`) }}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={e => {
                      e.preventDefault()
                      const raw = e.dataTransfer.getData('text/plain')
                      if (!raw.startsWith('sg-')) return
                      const from = parseInt(raw.slice(3))
                      if (!isNaN(from) && from !== sgIdx) {
                        const next = [...subgroups]
                        const [moved] = next.splice(from, 1)
                        next.splice(sgIdx, 0, moved)
                        onConfigChange({ subgroups: next })
                      }
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    {isSelected && (
                      <div className="flex flex-col flex-shrink-0 gap-1px" style={{ width: 20 }}>
                        <button className="manage-view-btn flex-center" disabled={sgIdx === 0} onClick={() => {
                          const next = [...subgroups]
                          const tmp = next[sgIdx - 1]; next[sgIdx - 1] = next[sgIdx]; next[sgIdx] = tmp
                          onConfigChange({ subgroups: next })
                        }} style={{ padding: '2px 4px', opacity: sgIdx === 0 ? 0.3 : 1 }}>
                          <img src={moveUpIcon} alt="" style={{ width: 10, height: 10 }} />
                        </button>
                        <button className="manage-view-btn flex-center" disabled={sgIdx === subgroups.length - 1} onClick={() => {
                          const next = [...subgroups]
                          const tmp = next[sgIdx + 1]; next[sgIdx + 1] = next[sgIdx]; next[sgIdx] = tmp
                          onConfigChange({ subgroups: next })
                        }} style={{ padding: '2px 4px', opacity: sgIdx === subgroups.length - 1 ? 0.3 : 1 }}>
                          <img src={moveDownIcon} alt="" style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    )}
                    {!isSelected && <div style={{ width: 20 }} />}
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`toggle-track ${activeSubgroups.has(sg.label) ? 'active' : ''}`} onClick={() => {
                        const next = new Set(activeSubgroups)
                        if (next.has(sg.label)) next.delete(sg.label); else next.add(sg.label)
                        setActiveSubgroups(next)
                      }}>
                        <div className="toggle-thumb" />
                      </div>
                      <span className="text-md cursor-pointer" onClick={() => setSelectedSg(isSelected ? null : sg.label)}>{sg.label}</span>
                    </div>
                    <button className="manage-view-btn flex-center" style={{ padding: '2px 4px' }}
                      onClick={() => {
                        setSgLabel(sg.label)
                        setSgFilters(sg.filters)
                        setShowSgEditor(true)
                      }} title="Edit subgroup">
                      <img src={manageIcon} alt="" style={{ width: 10, height: 10 }} />
                    </button>
                    <button className="manage-view-btn flex-center" style={{ padding: '2px 4px' }}
                      onClick={() => {
                        const next = subgroups.filter(s => s.label !== sg.label)
                        onConfigChange({ subgroups: next })
                        const nextActive = new Set(activeSubgroups)
                        nextActive.delete(sg.label)
                        setActiveSubgroups(nextActive)
                      }} title="Remove subgroup">
                      <img src={closeIcon} alt="" style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                )
              })}
              {subgroups.length === 0 && <div className="text-xs text-muted">No subgroups yet</div>}
            </div>
          </div>

          <div className="filter-box">
            <div className="flex-between mb-2">
              <div className="filter-box-header" style={{ marginBottom: 0 }}>Custom Filters</div>
              <button className="manage-view-btn text-xs" style={{ padding: '3px 10px' }}
                onClick={() => {
                  const d = filterDimensions[0]
                  if (!d) return
                  const next = [...filterRules, { dimension: d.id, operator: d.type === 'cat' ? 'is' as const : 'gte' as const, values: [], min: undefined, max: undefined }]
                  onConfigChange({ filterRules: next })
                }}>+ Add</button>
            </div>
            <div className="flex flex-col gap-2">
              {filterRules.map((rule, rIdx) => {
                const dim = filterDimensions.find(d => d.id === rule.dimension)
                if (!dim) return null
                const showConnector = rIdx > 0
                return (
                  <div key={rIdx}>
                    {showConnector && (
                      <div className="flex items-center gap-2 mb-1">
                        <select className="filter-select text-xs" value={rule.logic || 'and'} onChange={e => {
                          const next = [...filterRules]
                          next[rIdx] = { ...next[rIdx], logic: e.target.value as 'and' | 'or' }
                          onConfigChange({ filterRules: next })
                        }} style={{ padding: '2px 6px', width: 56, textTransform: 'uppercase', fontWeight: 700 }}>
                          <option value="and">AND</option>
                          <option value="or">OR</option>
                        </select>
                      </div>
                    )}
                    <div className="filter-rule-row">
                      <select className="filter-select text-sm" value={rule.dimension} onChange={e => {
                        const d = filterDimensions.find(dd => dd.id === e.target.value)
                        if (!d) return
                        const next = [...filterRules]
                        next[rIdx] = { dimension: e.target.value, operator: d.type === 'cat' ? 'is' : 'gte', values: [], min: undefined, max: undefined }
                        onConfigChange({ filterRules: next })
                      }} style={{ padding: '5px 8px', width: '100%' }}>
                        {filterDimensions.map(d => (
                          <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                      </select>
                      {dim.type === 'cat' ? (
                        <>
                          <select className="filter-select text-sm" value={rule.operator} onChange={e => {
                            const next = [...filterRules]
                            next[rIdx] = { ...next[rIdx], operator: e.target.value as any }
                            onConfigChange({ filterRules: next })
                          }} style={{ padding: '5px 8px', width: '100%' }}>
                            <option value="is">is</option>
                            <option value="is_not">is not</option>
                          </select>
                          <select className="filter-select text-sm" value={rule.values[0] || ''} onChange={e => {
                            const next = [...filterRules]
                            next[rIdx] = { ...next[rIdx], values: e.target.value ? [e.target.value] : [] }
                            onConfigChange({ filterRules: next })
                          }} style={{ padding: '5px 8px', width: '100%' }}>
                            <option value="">(value)</option>
                            {dim.options!.map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <>
                          <select className="filter-select text-sm" value={rule.operator} onChange={e => {
                            const next = [...filterRules]
                            next[rIdx] = { ...next[rIdx], operator: e.target.value as any }
                            onConfigChange({ filterRules: next })
                          }} style={{ padding: '5px 8px', width: '100%' }}>
                            <option value="gte">is at least</option>
                            <option value="lte">is at most</option>
                            <option value="between">is between</option>
                          </select>
                          <div className="flex items-center gap-1" style={{ flexWrap: 'wrap', rowGap: 4 }}>
                            <div className="stepper">
                              <select value={rule.min ?? 0} onChange={e => {
                                const next = [...filterRules]
                                next[rIdx] = { ...next[rIdx], min: Number(e.target.value) }
                                onConfigChange({ filterRules: next })
                              }}>
                                {NUMBER_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                              <button onClick={() => {
                                const next = [...filterRules]
                                next[rIdx] = { ...next[rIdx], min: clampNumber((rule.min ?? 0) - 1) }
                                onConfigChange({ filterRules: next })
                              }}><img src={minusIcon} alt="Decrease" /></button>
                              <button onClick={() => {
                                const next = [...filterRules]
                                next[rIdx] = { ...next[rIdx], min: clampNumber((rule.min ?? 0) + 1) }
                                onConfigChange({ filterRules: next })
                              }}><img src={plusIcon} alt="Increase" /></button>
                            </div>
                            {rule.operator === 'between' && <>
                              <span className="text-xs text-muted">and</span>
                              <div className="stepper">
                                <select value={rule.max ?? 0} onChange={e => {
                                  const next = [...filterRules]
                                  next[rIdx] = { ...next[rIdx], max: Number(e.target.value) }
                                  onConfigChange({ filterRules: next })
                                }}>
                                  {NUMBER_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <button onClick={() => {
                                  const next = [...filterRules]
                                  next[rIdx] = { ...next[rIdx], max: clampNumber((rule.max ?? 0) - 1) }
                                  onConfigChange({ filterRules: next })
                                }}><img src={minusIcon} alt="Decrease" /></button>
                                <button onClick={() => {
                                  const next = [...filterRules]
                                  next[rIdx] = { ...next[rIdx], max: clampNumber((rule.max ?? 0) + 1) }
                                  onConfigChange({ filterRules: next })
                                }}><img src={plusIcon} alt="Increase" /></button>
                              </div>
                            </>}
                          </div>
                        </>
                      )}
                      <button className="manage-view-btn flex-center" style={{ padding: '2px 4px' }}
                        onClick={() => {
                          const next = filterRules.filter((_, i) => i !== rIdx)
                          onConfigChange({ filterRules: next })
                        }}>
                        <img src={closeIcon} alt="" style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {filterRules.length === 0 && <div className="text-xs text-muted">No custom filters yet</div>}
            </div>
          </div>

        </div>
        <div className="flex-between border-default-top p-3 flex-shrink-0">
          <button className="manage-view-btn text-sm" onClick={() => {
            setGroupBy(new Set())
            setAdvancedRoleFilters(new Set())
            setActiveSubgroups(new Set())
            onConfigChange({ filterRules: [] })
          }}>Clear</button>
          <button className="btn primary" onClick={onClose}>
            <img src={confirmIcon} alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(1)' }} />
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
