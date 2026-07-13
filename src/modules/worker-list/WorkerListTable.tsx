import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Worker } from '../../api'
import { fmtDate } from '../../lib/dates'
import { useApp } from '../../context/AppContext'
import { defaultColumns, defaultColumnState } from './columns'
import type { ColumnState, ColumnDef } from './columns'
import { WorkerCompareModal } from '../../components/WorkerCompareModal'
import { NATIONALITY_FLAGS, NATIONALITY_NAMES, NATIONALITY_CODES_3 } from './nationality'
import manageIcon from '../../assets/UI icons/manageview.png'
import clearFiltersIcon from '../../assets/UI icons/clearsorts.png'
import faceIcon from '../../assets/UI icons/face.png'
import heelIcon from '../../assets/UI icons/heel.png'
import leftIcon from '../../assets/UI icons/left.png'
import rightIcon from '../../assets/UI icons/right.png'
import moveUpIcon from '../../assets/UI icons/moveup.png'
import moveDownIcon from '../../assets/UI icons/movedown.png'
import closeIcon from '../../assets/UI icons/close.png'
import filterIcon from '../../assets/UI icons/filter.png'
import { sortWorkers, type SortKey } from './workerListSort'
import { ColumnPickerPane } from './ColumnPickerPane'

export function WorkerListColumnTable({ workers, config, onConfigChange }: { workers: Worker[]; config: Record<string, any>; onConfigChange: (c: Record<string, any>) => void }) {
  const { navigateToEntity, gameInfo, focusedFed, playerFed } = useApp()
  const tableRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [contractFilter, setContractFilter] = useState('all')
  const [sorts, setSorts] = useState<{ key: SortKey; dir: 'asc' | 'desc' }[]>([{ key: 'name', dir: 'asc' }])
  const [colState, setColState] = useState<ColumnState[]>(() => config.columnState || defaultColumnState())
  const isPlayerFed = !focusedFed || focusedFed.uid === playerFed?.uid
  const visibleCols = useMemo(() => {
    if (isPlayerFed) return colState
    return colState.filter(cs => cs.id !== 'avg_duration' && cs.id !== 'total_duration' && cs.id !== 'storyline' && cs.id !== 'storyline_heat')
  }, [colState, isPlayerFed])
  const [showColPicker, setShowColPicker] = useState(false)
  const [selectedAvail, setSelectedAvail] = useState<string | null>(null)
  const [selectedSelected, setSelectedSelected] = useState<string | null>(null)
  const [dragCol, setDragCol] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [separators, setSeparators] = useState<Set<string>>(new Set())
  const [resizing, setResizing] = useState<{ id: string; colIdx: number; startX: number; startW: number } | null>(null)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showCompare, setShowCompare] = useState(false)
  const [rowCtx, setRowCtx] = useState<{ uid: number; x: number; y: number } | null>(null)
  const colStateRef = useRef(colState)
  colStateRef.current = colState

  const colMap = useMemo(() => {
    const m = new Map<string, ColumnDef>()
    for (const c of defaultColumns) m.set(c.id, c)
    return m
  }, [])

  const didAutoSize = useRef(false)

  useEffect(() => {
    if (workers.length === 0 || colState.length === 0 || didAutoSize.current) return
    didAutoSize.current = true
    const longest = workers.reduce((max, w) => Math.max(max, w.name.length), 0)
    const namePx = Math.min(Math.max(longest * 7.5 + 20, 120), 400)
    updateColState(colState.map(cs => {
      if (cs.id === 'name') return { ...cs, width: Math.round(namePx) }
      return cs
    }))
  }, [workers.length, colState.length])

  const filtered = useMemo(() => {
    let list = workers
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(w => w.name.toLowerCase().includes(q) || w.short_name.toLowerCase().includes(q))
    }
    if (positionFilter !== 'all') {
      list = list.filter(w => w.positions.includes(positionFilter))
    }
    if (genderFilter !== 'all') {
      list = list.filter(w => w.gender === genderFilter)
    }
    if (activeFilter === 'active') {
      list = list.filter(w => w.active)
    } else if (activeFilter === 'inactive') {
      list = list.filter(w => !w.active)
    }
    if (roleFilter === 'wrestler') {
      list = list.filter(w => !w.non_wrestler)
    } else if (roleFilter === 'non-wrestler') {
      list = list.filter(w => w.non_wrestler)
    }
    if (contractFilter !== 'all') {
      list = list.filter(w => w.contract_status === contractFilter)
    }
    return sortWorkers(list, sorts)
  }, [workers, search, positionFilter, genderFilter, activeFilter, roleFilter, contractFilter, sorts])

  const allPositions = useMemo(() => {
    const set = new Set<string>()
    workers.forEach(w => w.positions.forEach(p => set.add(p)))
    return ['all', ...Array.from(set).sort()]
  }, [workers])

  const allContracts = useMemo(() => {
    const set = new Set<string>()
    workers.forEach(w => { if (w.contract_status) set.add(w.contract_status) })
    return ['all', ...Array.from(set).sort()]
  }, [workers])

  const clearFilters = () => {
    setPositionFilter('all')
    setGenderFilter('all')
    setActiveFilter('all')
    setRoleFilter('all')
    setContractFilter('all')
  }

  const hasActiveFilters = positionFilter !== 'all' || genderFilter !== 'all' || activeFilter !== 'all' || roleFilter !== 'all' || contractFilter !== 'all'

  const toggleSelected = (uid: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid); else next.add(uid)
      return next
    })
  }
  const selectAll = () => {
    if (selected.size === filtered.length) { setSelected(new Set()); return }
    setSelected(new Set(filtered.map(w => w.uid)))
  }

  const toggleSort = (key: string) => {
    const sk = key
    setSorts(prev => {
      const idx = prev.findIndex(s => s.key === sk)
      if (idx >= 0) {
        if (prev[idx].dir === 'asc') {
          const next = [...prev]
          next[idx] = { ...next[idx], dir: 'desc' }
          return next
        } else {
          return prev.filter(s => s.key !== sk)
        }
      } else {
        return [...prev, { key: sk, dir: 'asc' }]
      }
    })
  }

  const sortIndicator = (key: string) => {
    const idx = sorts.findIndex(s => s.key === key)
    if (idx < 0) return ''
    return ` ${idx + 1}${sorts[idx].dir === 'desc' ? '▼' : '▲'}`
  }

  const updateColState = (next: ColumnState[]) => {
    setColState(next)
    onConfigChange({ columnState: next })
  }

  const addColumn = (id: string) => {
    if (!colState.some(c => c.id === id)) {
      const def = defaultColumns.find(c => c.id === id)
      if (def) updateColState([...colState, { id: def.id, width: def.width }])
    }
  }

  const removeColumn = (id: string) => {
    updateColState(colState.filter(c => c.id !== id))
  }

  const moveColumn = (id: string, dir: -1 | 1) => {
    const idx = colState.findIndex(c => c.id === id)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= colState.length) return
    const next = [...colState]
    const [moved] = next.splice(idx, 1)
    next.splice(target, 0, moved)
    updateColState(next)
  }

  const hideContextColumn = (id: string) => {
    updateColState(colState.filter(c => c.id !== id))
    setCtxMenu(null)
  }

  const autoSizeColumn = (id: string) => {
    const def = colMap.get(id)
    if (!def) { setCtxMenu(null); return }
    const total = colState.reduce((s, c) => s + c.width, 0)
    let maxW = def.label.length * 7 + 16
    const measureEl = document.createElement('div')
    measureEl.style.cssText = 'position:fixed;visibility:hidden;left:-9999px;font-size:12px;white-space:nowrap;padding:4px 6px'
    document.body.appendChild(measureEl)
    for (const w of filtered) {
      const rendered = def.render(w)
      if (typeof rendered === 'string') {
        measureEl.textContent = rendered
      } else if (rendered && typeof rendered === 'object' && 'props' in rendered) {
        const el = rendered as React.ReactElement & { props: { children?: React.ReactNode } }
        if (typeof el.props?.children === 'string') {
          measureEl.textContent = el.props.children
        }
      } else {
        measureEl.textContent = def.label
      }
      const contentW = measureEl.scrollWidth
      if (contentW > maxW) maxW = contentW
    }
    document.body.removeChild(measureEl)
    const container = tableRef.current
    const cw = container?.clientWidth || 800
    const newWeight = Math.round((maxW + 8) / cw * total)
    updateColState(colState.map(cs => cs.id === id ? { ...cs, width: newWeight } : cs))
    setCtxMenu(null)
  }

  const openColPicker = () => {
    setShowColPicker(true)
    setCtxMenu(null)
  }

  const toggleSeparator = (id: string) => {
    const next = new Set(separators)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSeparators(next)
    localStorage.setItem('tew-worker-separators', JSON.stringify([...next]))
    setCtxMenu(null)
  }

  const onResizeStart = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const colIdx = colState.findIndex(c => c.id === id)
    if (colIdx < 0) return
    const cs = colState[colIdx]
    setResizing({ id, colIdx, startX: e.clientX, startW: cs.width })
  }

  useEffect(() => {
    if (!resizing) return
    const container = tableRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const indicator = document.createElement('div')
    indicator.style.cssText = 'position:fixed;top:' + containerRect.top + 'px;height:' + containerRect.height + 'px;width:2px;background:var(--accent);z-index:9999;pointer-events:none'
    document.body.appendChild(indicator)
    const onMove = (e: MouseEvent) => {
      const state = colStateRef.current
      let colLeft = containerRect.left
      for (let i = 0; i < resizing.colIdx; i++) {
        colLeft += state[i].width
      }
      const newPixelW = Math.max(10, e.clientX - colLeft)
      const newState = state.map(cs => cs.id === resizing.id ? { ...cs, width: Math.round(newPixelW) } : cs)
      colStateRef.current = newState
      indicator.style.left = e.clientX + 'px'
    }
    const onUp = () => {
      setColState(colStateRef.current)
      onConfigChange({ columnState: colStateRef.current })
      setResizing(null)
      document.body.removeChild(indicator)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (indicator.parentNode) document.body.removeChild(indicator)
    }
  }, [resizing])

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragCol(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDropTarget(id)
  }
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!dragCol || dragCol === targetId) return
    const idx = colState.findIndex(c => c.id === dragCol)
    const target = colState.findIndex(c => c.id === targetId)
    if (idx === -1 || target === -1) return
    const next = [...colState]
    const [moved] = next.splice(idx, 1)
    next.splice(target, 0, moved)
    updateColState(next)
    setDragCol(null)
    setDropTarget(null)
  }
  const onDragEnd = () => {
    setDragCol(null)
    setDropTarget(null)
  }

  return (
    <div className="module-full">
      {ctxMenu && createPortal(
        <>
          <div className="fixed inset-0 z-1000" onClick={() => setCtxMenu(null)} onContextMenu={e => { e.preventDefault(); setCtxMenu(null) }} />
          <div className="fixed bg-secondary border-default rounded-md p-1 min-w-130 text-sm" style={{ left: ctxMenu.x, top: ctxMenu.y, zIndex: 1000 }}>
            <div className="px-2 py-1 text-semibold text-muted text-xs text-uppercase">{colMap.get(ctxMenu.id)?.label || ctxMenu.id}</div>
            <div className="context-menu-item" onClick={() => openColPicker()}>Add column</div>
            <div className="context-menu-item" onClick={() => hideContextColumn(ctxMenu.id)}>Remove column</div>
            <div className={`context-menu-item${ctxMenu.id === 'img' || ctxMenu.id === 'status' ? ' disabled' : ''}`} onClick={() => { if (ctxMenu.id !== 'img' && ctxMenu.id !== 'status') autoSizeColumn(ctxMenu.id) }}>Auto-size</div>
            <div className="context-menu-item" onClick={() => toggleSeparator(ctxMenu.id)}>Toggle separator</div>
          </div>
        </>,
        document.body
      )}
      <div className="filter-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search workers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={positionFilter}
          onChange={e => setPositionFilter(e.target.value)}
        >
          {allPositions.map(p => (
            <option key={p} value={p}>{p === 'all' ? 'All Positions' : p}</option>
          ))}
        </select>
        <div className="ml-auto items-center gap-6px">
          <button className="manage-view-btn" onClick={() => setShowFilterPanel(p => !p)}>
            <img src={filterIcon} alt="Filter" className="w-16 h-16" />
            Filter{hasActiveFilters ? ` (${[positionFilter !== 'all', genderFilter !== 'all', activeFilter !== 'all', roleFilter !== 'all', contractFilter !== 'all'].filter(Boolean).length})` : ''}
          </button>
          <button className="manage-view-btn" onClick={() => setShowColPicker(p => !p)}>
            <img src={manageIcon} alt="Manage" className="w-16 h-16" />
            Manage View
          </button>
          {showColPicker && createPortal(
            <div className="modal-overlay" onClick={() => setShowColPicker(false)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 640, maxWidth: '90vw' }}>
                <div className="modal-header">
                  <span className="modal-title">Manage View — Columns</span>
                  <button className="modal-close" onClick={() => setShowColPicker(false)}><img src={closeIcon} alt="Close" className="w-14 h-14" /></button>
                </div>
                <div className="modal-body flex min-h-0 gap-3" style={{ padding: 12, minHeight: 440, height: 440 }}>
                  {/* Left: Available columns */}
                  <ColumnPickerPane
                    colState={colState}
                    selectedAvail={selectedAvail}
                    onSelectAvail={setSelectedAvail}
                    onAdd={addColumn}
                  />
                  {/* Center: Add/Remove buttons */}
                  <div className="flex flex-col justify-center flex-shrink-0 gap-2">
                    <button                       className="manage-view-btn flex-center text-sm gap-1"
                      onClick={() => {
                        if (selectedAvail) { addColumn(selectedAvail); setSelectedAvail(null) }
                      }}
                      style={{ padding: '6px 14px', opacity: selectedAvail ? 1 : 0.4 }}
                    >Add<img src={rightIcon} alt="" className="w-12 h-12" /></button>
                    <button className="manage-view-btn flex-center text-sm gap-1"
                      onClick={() => {
                        if (selectedSelected && selectedSelected !== 'img' && selectedSelected !== 'status') {
                          removeColumn(selectedSelected); setSelectedSelected(null)
                        }
                      }}
                      style={{ padding: '6px 14px', opacity: (selectedSelected && selectedSelected !== 'img' && selectedSelected !== 'status') ? 1 : 0.4 }}
                    ><img src={leftIcon} alt="" className="w-12 h-12" />Remove</button>
                  </div>
                  {/* Right: Selected columns */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="text-muted text-semibold mb-1 text-sm">Selected</div>
                    <div className="flex-1 overflow-auto border-default rounded-sm p-1">
                {visibleCols.map((cs, idx) => {
                        const def = colMap.get(cs.id)
                        if (!def) return null
                        const locked = cs.id === 'img' || cs.id === 'status'
                        return (
                          <div key={cs.id}
                            onClick={() => setSelectedSelected(selectedSelected === cs.id ? null : cs.id)}
                              className="items-center cursor-pointer rounded-xs text-md"
                            style={{
                            gap: 4,
                            padding: '4px 6px',
                            background: selectedSelected === cs.id ? 'var(--accent)' : 'var(--bg-secondary)',
                            color: selectedSelected === cs.id ? '#fff' : undefined,
                            marginBottom: 2,
                          }}>
                            <span className="flex-1 ws-nowrap truncate">
                              {def.label || cs.id}
                            </span>
                            <div className="flex flex-shrink-0 gap-3px">
                              <button
                                className="manage-view-btn flex-center"
                                disabled={idx === 0}
                                onClick={(e) => { e.stopPropagation(); moveColumn(cs.id, -1) }}
                                style={{ padding: '2px 4px', opacity: idx === 0 ? 0.3 : 1 }}
                              ><img src={moveUpIcon} alt="Up" style={{ width: 10, height: 10 }} /></button>
                              <button
                                className="manage-view-btn flex-center"
                                disabled={idx === colState.length - 1}
                                onClick={(e) => { e.stopPropagation(); moveColumn(cs.id, 1) }}
                                style={{ padding: '2px 4px', opacity: idx === colState.length - 1 ? 0.3 : 1 }}
                              ><img src={moveDownIcon} alt="Down" style={{ width: 10, height: 10 }} /></button>
                              {!locked && (
                                <button
                                  className="manage-view-btn flex-center"
                                  onClick={(e) => { e.stopPropagation(); removeColumn(cs.id) }}
                                  style={{ padding: '2px 4px', marginLeft: 2 }}
                                ><img src={closeIcon} alt="Remove" style={{ width: 10, height: 10 }} /></button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {colState.length === 0 && <div className="text-muted text-sm p-2 text-center">No columns selected</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
          <button className="manage-view-btn ml-2" onClick={() => setSorts([])}>
            <img src={clearFiltersIcon} alt="Clear" className="w-16 h-16" />
            Clear Sorts
          </button>
        </div>
      </div>

      {showFilterPanel && (
        <div className="absolute flex flex-col border-default-left z-50" style={{ right: 0, top: 0, bottom: 0, width: 280, background: 'var(--bg-secondary)' }}>
          <div className="flex-between border-default-bottom p-3 px-2">
            <span className="text-semibold text-sm text-primary">Filters</span>
            <button className="btn" onClick={() => setShowFilterPanel(false)} style={{ padding: '2px 6px', lineHeight: 0 }}>
              <img src={closeIcon} alt="" className="w-14 h-14 filter-icon-gray" />
            </button>
          </div>
          <div className="flex-1 p-3 overflow-auto text-sm">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-xs text-semibold text-secondary mb-1 text-uppercase">Gender</div>
                <div className="flex gap-1">
                  {['all', 'Male', 'Female'].map(g => (
                    <div key={g} onClick={() => setGenderFilter(g)}
                      className={`px-2 py-0 rounded-md text-xs cursor-pointer ${genderFilter === g ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
                      {g === 'all' ? 'All' : g}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-semibold text-secondary mb-1 text-uppercase">Status</div>
                <div className="flex gap-1">
                  {['all', 'active', 'inactive'].map(a => (
                    <div key={a} onClick={() => setActiveFilter(a)}
                      className={`px-2 py-0 rounded-md text-xs cursor-pointer ${activeFilter === a ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
                      {a === 'all' ? 'All' : a.charAt(0).toUpperCase() + a.slice(1)}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-semibold text-secondary mb-1 text-uppercase">Role</div>
                <div className="flex gap-1">
                  {['all', 'wrestler', 'non-wrestler'].map(r => (
                    <div key={r} onClick={() => setRoleFilter(r)}
                      className={`px-2 py-0 rounded-md text-xs cursor-pointer ${roleFilter === r ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
                      {r === 'all' ? 'All' : r === 'non-wrestler' ? 'Non-Wrestler' : 'Wrestler'}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-semibold text-secondary mb-1 text-uppercase">Contract</div>
                <select className="filter-select w-full" value={contractFilter} onChange={e => setContractFilter(e.target.value)}>
                  {allContracts.map(c => (
                    <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn text-xs text-center mt-2" style={{ padding: '4px 12px' }}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {rowCtx && createPortal(
        <>
          <div className="fixed inset-0 z-1000" onClick={() => setRowCtx(null)} onContextMenu={e => { e.preventDefault(); setRowCtx(null) }} />
          <div className="fixed bg-secondary border-default rounded-md p-1 min-w-130 text-sm" style={{ left: rowCtx.x, top: rowCtx.y, zIndex: 1000 }}>
            <div className="px-2 py-1 text-semibold text-muted text-xs text-uppercase">Worker #{rowCtx.uid}</div>
            <div className="context-menu-item" onClick={() => { navigateToEntity('worker', rowCtx.uid); setRowCtx(null) }}>View Worker</div>
            <div className="context-menu-item" onClick={() => { navigator.clipboard?.writeText(String(rowCtx.uid)); setRowCtx(null) }}>Copy UID</div>
          </div>
        </>,
        document.body
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-400 text-white text-xs text-semibold sticky" style={{ bottom: 0, zIndex: 10 }}>
          <span>{selected.size} worker{selected.size !== 1 ? 's' : ''} selected</span>
          <button className="btn text-xs text-white px-2 py-0 rounded-sm" style={{ background: 'rgba(255,255,255,0.2)' }} onClick={() => { if (selected.size === 1) navigateToEntity('worker', [...selected][0]) }}>
            View
          </button>
          {selected.size >= 2 && (
            <button className="btn text-xs text-white px-2 py-0 rounded-sm" style={{ background: 'rgba(255,255,255,0.2)' }} onClick={() => setShowCompare(true)}>
              Compare
            </button>
          )}
          <button className="btn text-xs text-white px-2 py-0 rounded-sm ml-auto" style={{ background: 'rgba(255,255,255,0.2)' }} onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {showCompare && (
        <WorkerCompareModal workers={filtered.filter(w => selected.has(w.uid))} onClose={() => setShowCompare(false)} />
      )}

      <div className="data-table-wrapper overflow-auto" ref={tableRef} style={{ maxHeight: selected.size > 0 ? 'calc(100% - 32px)' : undefined }}>
        <div className="data-table flex flex-col" style={{ width: 'fit-content', minWidth: '100%' }}>
          <div className="flex border-default-bottom sticky top-0" style={{ zIndex: 5, background: 'var(--bg-secondary)' }}>
            <div className="data-table-cell data-header-cell flex-center" style={{ flex: 'none', width: 30, position: 'sticky', left: 0, zIndex: 8, background: 'var(--bg-secondary)', cursor: 'pointer' }} onClick={selectAll}>
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} readOnly className="cursor-pointer" />
            </div>
            {visibleCols.map((cs, idx) => {
              const def = colMap.get(cs.id)!
              const isSorted = sorts.some(s => s.key === def.sortKey)
              const pw = Number(cs.width) || 32
              return (
                  <div key={cs.id}
                    draggable={cs.id !== 'img' && cs.id !== 'status'}
                    onDragStart={e => onDragStart(e, cs.id)}
                    onDragOver={e => onDragOver(e, cs.id)}
                    onDrop={e => onDrop(e, cs.id)}
                    onDragEnd={onDragEnd}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ id: cs.id, x: e.clientX, y: e.clientY }) }}
                    onClick={() => def.sortKey && toggleSort(def.sortKey)}
                    className="data-table-cell data-header-cell"
                    style={{
                      flex: 'none', width: pw,
                      cursor: (def.sortKey && cs.id !== 'img' && cs.id !== 'status') ? 'pointer' : 'default',
                      position: 'relative',
                      opacity: dragCol === cs.id ? 0.5 : 1,
                      borderLeft: idx > 0 && separators.has(cs.id) ? '2px solid var(--accent)' : undefined,
                      borderTop: dropTarget === cs.id ? '2px solid var(--accent)' : undefined,
                      ...(cs.id === 'img' || cs.id === 'status' || cs.id === 'name' ? {
                        position: 'sticky', zIndex: 7,
                        left: 30 + visibleCols.slice(0, idx).reduce((sum, c) => sum + (c.id === 'img' || c.id === 'status' || c.id === 'name' ? Number(c.width) : 0), 0),
                        background: 'var(--bg-secondary)',
                      } : {}),
                      ...(cs.id === 'img' ? { padding: 0 } : {}),
                      ...(cs.id === 'status' ? { padding: 0, justifyContent: 'center', overflow: 'visible' } : {}),
                      ...(cs.id === 'gender' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'role' ? { justifyContent: 'center', overflow: 'visible' } : {}),
                      ...(cs.id === 'nat' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'dispo' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'condition' || cs.id.startsWith('cond') ? { justifyContent: 'center' } : {}),
                      ...(def.filterGroup === 'stats' || def.filterGroup === 'popularity' || def.filterGroup === 'creative' ? { justifyContent: 'center' } : {}),
                    }}
                    >
                  {pw < def.label.length * 7 && def.abbrev ? def.abbrev : def.label}{isSorted ? sortIndicator(def.sortKey!) : ''}
                  {cs.id !== 'img' && cs.id !== 'status' && (
                    <span
                      onMouseDown={e => onResizeStart(e, cs.id)}
                      style={{ position: 'absolute', right: -2, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 2 }}
                    />
                  )}
                </div>
              )
            })}
          </div>
          {filtered.map((w, rowIdx) => (
            <div key={w.uid} className="worker-list-row flex border-bottom-row"
              style={{ background: rowIdx % 2 === 1 ? 'rgba(255,255,255,0.02)' : undefined }}
              onContextMenu={e => { e.preventDefault(); setRowCtx({ uid: w.uid, x: e.clientX, y: e.clientY }) }}>
              <div className="flex-center" style={{ flex: 'none', width: 30, position: 'sticky', left: 0, zIndex: 6, background: 'inherit' }} onClick={e => { e.stopPropagation(); toggleSelected(w.uid) }}>
                <input type="checkbox" checked={selected.has(w.uid)} onChange={() => {}} className="cursor-pointer" />
              </div>
              {colState.map((cs, idx) => {
                const def = colMap.get(cs.id)!
              const pw = Number(cs.width) || 32
                const cellContent = def.render(w)
                return (
                  <div key={cs.id} className="data-table-cell text-md" style={{
                    flex: 'none', width: pw,
                    borderLeft: idx > 0 && separators.has(cs.id) ? '2px solid var(--accent)' : undefined,
                    padding: cs.id === 'img' ? 0 : (cs.id === 'status' ? 0 : '4px 6px'),
                    ...(cs.id === 'status' ? { justifyContent: 'center', overflow: 'visible' } : {}),
                    ...(cs.id === 'gender' ? { justifyContent: 'center' } : {}),
                    ...(cs.id === 'role' ? { justifyContent: 'center', overflow: 'visible' } : {}),
                    ...(cs.id === 'nat' ? { justifyContent: 'center' } : {}),
                    ...(cs.id === 'condition' || cs.id.startsWith('cond') ? { justifyContent: 'center', overflow: 'visible' } : {}),
                    ...(def.filterGroup === 'stats' || def.filterGroup === 'popularity' || def.filterGroup === 'creative' ? { justifyContent: 'center' } : {}),
                    ...(cs.id === 'dispo' ? { justifyContent: 'center' } : {}),
                    ...(cs.id === 'img' || cs.id === 'status' || cs.id === 'name' ? {
                      position: 'sticky', zIndex: 6, background: 'inherit',
                      left: 30 + visibleCols.slice(0, idx).reduce((sum, c) => sum + (c.id === 'img' || c.id === 'status' || c.id === 'name' ? Number(c.width) : 0), 0),
                    } : {}),
                  }}
                  >
                    {cs.id === 'img'
                      ? <span className="items-center cursor-pointer" style={{ height: '100%' }} onClick={e => { e.stopPropagation(); navigateToEntity('worker', w.uid) }}>{cellContent}</span>
                        : cs.id === 'age'
                          ? <span className="text-md" style={{ lineHeight: 1.3 }}>
                              <div>{w.age}</div>
                              {pw >= 90 && <div className="text-muted text-xs">{(w as any).Birthday ? fmtDate((w as any).Birthday) : ''}</div>}
                            </span>
                          : cs.id === 'expiry'
                            ? (() => {
                                const expDate = w.contract && gameInfo?.current_date
                                  ? (() => {
                                      const d = new Date(gameInfo.current_date)
                                      d.setDate(d.getDate() + w.contract.days_left)
                                      return fmtDate(d.toISOString().split('T')[0])
                                    })()
                                  : null
                                return <span className="text-md" style={{ lineHeight: 1.3 }}>
                                  <div>{expDate || `${w.contract?.days_left ?? 0}d`}</div>
                                  {pw >= 90 && expDate && <div className="text-muted text-xs">{w.contract ? `${w.contract.days_left}d remaining` : ''}</div>}
                                </span>
                              })()
                        : cs.id === 'dispo' && w.contract
                          ? (() => {
                              const color = w.contract.face ? 'var(--accent-green)' : '#ef4444'
                              const icon = w.contract.face ? faceIcon : heelIcon
                              return <div className="items-center h-full gap-3px">
                                <span className="inline-block w-14 h-14 flex-shrink-0" style={{
                                  backgroundColor: color,
                                  mask: `url(${icon}) center/contain no-repeat`,
                                  WebkitMask: `url(${icon}) center/contain no-repeat`,
                                }} />
                                {pw >= 65 && <span className="text-sm text-bold" style={{ color }}>{w.contract.face ? 'Face' : 'Heel'}</span>}
                              </div>
                            })()
                          : cs.id === 'nat'
                            ? (() => {
                                const code = NATIONALITY_FLAGS[w.nationality]
                                const code3 = NATIONALITY_CODES_3[w.nationality]
                                const name = NATIONALITY_NAMES[w.nationality]
                                if (!code) return <span className="text-muted text-xs">—</span>
                                const flagUrl = new URL(`../../assets/flag-icons-main/flags/4x3/${code}.svg`, import.meta.url).href
                                return <div className="items-center h-full cursor-pointer gap-1" onClick={e => { e.stopPropagation(); navigateToEntity('worker', w.uid) }}>
                                  <img src={flagUrl} alt="" className="w-20 h-15 object-cover rounded-xs" />
                                  {pw >= 60 && <span className="text-sm text-medium text-primary ws-nowrap">{code3 || code.toUpperCase()}</span>}
                                  {pw >= 100 && <span className="text-sm text-secondary">{name}</span>}
                                </div>
                              })()
                          : cellContent}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
