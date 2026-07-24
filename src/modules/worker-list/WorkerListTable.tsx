import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Worker } from '../../api'
import { useApp } from '../../context/AppContext'
import { defaultColumns, defaultColumnState, renderCell } from './columns'

import manageIcon from '../../assets/UI icons/manageview.png'
import clearFiltersIcon from '../../assets/UI icons/clearsorts.png'
import leftIcon from '../../assets/UI icons/left.png'
import rightIcon from '../../assets/UI icons/right.png'
import closeIcon from '../../assets/UI icons/close.png'
import filterIcon from '../../assets/UI icons/filter.png'
import confirmIcon from '../../assets/UI icons/confirm.png'
import { api } from '../../api'
import { sortWorkers, type SortKey } from './workerListSort'
import { useColumnState } from './useColumnState'
import { ColumnPickerPane } from './ColumnPickerPane'
import { SelectedColumnsList } from './SelectedColumnsList'
import { FilterPanel } from './FilterPanel'
import { SubgroupEditor } from './SubgroupEditor'
import { loadPages } from '../../pages/pageStorage'
import { loadLayout, getActiveViewId, setActiveViewId } from '../../layout/storage'
import {
  getAllPositions, getAllContracts, getAllBrands, buildFilterDimensions, filterWorkers,
  type FilterRule, type DimDef,
} from './workerListFilters'
import {
  buildDimOptions, orderDims, computeGroups,
  type SubgroupFilter, type SubgroupDef,
} from './workerListGrouping'

export function WorkerListColumnTable({ workers, config, onConfigChange }: { workers: Worker[]; config: Record<string, any>; onConfigChange: (c: Record<string, any>) => void }) {
  const { navigateToEntity, gameInfo, focusedFed, playerFed, currentPage } = useApp()
  const tableRef = useRef<HTMLDivElement>(null)
  // Position is the only basic dropdown filter; gender/status/type/contract are
  // handled by the filterRules system (see buildFilterDimensions).
  const [positionFilter, setPositionFilter] = useState('all')
  // Persisted via config (like subgroups/filterRules below) rather than local
  // useState, so group-by/active-subgroup/advanced-role selections survive a
  // reload instead of resetting to empty every time the module remounts.
  const LS = (key: string) => { try { return JSON.parse(localStorage.getItem('tew-wl-' + key) || 'null') } catch { return null } }
  const groupBy = useMemo(() => new Set<string>(config.groupBy || LS('groupBy') || []), [config.groupBy])
  const setGroupBy = (s: Set<string>) => { localStorage.setItem('tew-wl-groupBy', JSON.stringify(Array.from(s))); onConfigChange({ groupBy: Array.from(s) }) }
  const activeSubgroups = useMemo(() => new Set<string>(config.activeSubgroups || LS('activeSubgroups') || []), [config.activeSubgroups])
  const setActiveSubgroups = (s: Set<string>) => { localStorage.setItem('tew-wl-activeSubgroups', JSON.stringify(Array.from(s))); onConfigChange({ activeSubgroups: Array.from(s) }) }
  const advancedRoleFilters = useMemo(() => new Set<string>(config.advancedRoleFilters || []), [config.advancedRoleFilters])
  const setAdvancedRoleFilters = (s: Set<string>) => onConfigChange({ advancedRoleFilters: Array.from(s) })

  const subgroups = useMemo<SubgroupDef[]>(() => config.subgroups || LS('subgroups') || [], [config.subgroups])
  useEffect(() => { localStorage.setItem('tew-wl-subgroups', JSON.stringify(subgroups)) }, [subgroups])
  const [selectedDim, setSelectedDim] = useState<string | null>(null)
  const [selectedSg, setSelectedSg] = useState<string | null>(null)
  const [showSgEditor, setShowSgEditor] = useState(false)
  const [sgLabel, setSgLabel] = useState('')
  const [sgFilters, setSgFilters] = useState<SubgroupFilter>({})

  const filterRules = useMemo<FilterRule[]>(() => config.filterRules || [], [config.filterRules])
  const [sorts, setSorts] = useState<{ key: SortKey; dir: 'asc' | 'desc' }[]>(() => {
    try {
      const raw = localStorage.getItem('tew-worker-sorts')
      if (raw) return JSON.parse(raw)
    } catch {}
    return [{ key: 'name', dir: 'asc' }]
  })
  const isPlayerFed = !focusedFed || focusedFed.uid === playerFed?.uid
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [rowCtx, setRowCtx] = useState<{ uid: number; x: number; y: number } | null>(null)
  const snapTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const onScroll = () => {
      if (snapTimer.current) clearTimeout(snapTimer.current)
      snapTimer.current = setTimeout(() => {
        const cells = el.querySelectorAll('.data-table > div:first-child > .data-table-cell')
        const scrollLeft = el.scrollLeft
        const maxScroll = el.scrollWidth - el.clientWidth
        if (scrollLeft <= 0 || scrollLeft >= maxScroll) return
        let best = scrollLeft
        let bestDist = Infinity
        for (const cell of cells) {
          const left = (cell as HTMLElement).offsetLeft
          const dist = Math.abs(left - scrollLeft)
          if (dist < bestDist) {
            bestDist = dist
            best = left
          }
        }
        if (best !== scrollLeft) el.scrollTo({ left: best, behavior: 'smooth' })
      }, 120)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    localStorage.setItem('tew-worker-sorts', JSON.stringify(sorts))
  }, [sorts])

  const allPositions = useMemo(() => getAllPositions(workers), [workers])
  const allContracts = useMemo(() => getAllContracts(workers), [workers])
  const allBrands = useMemo(() => getAllBrands(workers), [workers])
  const FILTER_DIMENSIONS: DimDef[] = useMemo(() => buildFilterDimensions(allContracts, allBrands), [allContracts, allBrands])

  const filtered = useMemo(
    () => filterWorkers(workers, { search: '', positionFilter }, filterRules, FILTER_DIMENSIONS),
    [workers, positionFilter, filterRules, FILTER_DIMENSIONS]
  )

  const dimOptions = useMemo(() => buildDimOptions(allBrands), [allBrands])
  const dimOrder: string[] = config.dimOrder || dimOptions.map(d => d.id)
  const orderedDims = useMemo(() => orderDims(dimOrder, dimOptions), [dimOrder, dimOptions])

  const groups = useMemo(
    () => computeGroups(filtered, { groupBy, subgroups, activeSubgroups, advancedRoleFilters, sorts }),
    [groupBy, filtered, advancedRoleFilters, subgroups, activeSubgroups, sorts]
  )

  const hasActiveFilters = positionFilter !== 'all'

  const toggleSort = (key: string) => {
    const sk = key as SortKey
    setSorts(prev => {
      let filtered = prev
      if (sk !== 'name') {
        filtered = prev.filter(s => s.key !== 'name')
      }
      const idx = filtered.findIndex(s => s.key === sk)
      if (idx >= 0) {
        if (filtered[idx].dir === 'asc') {
          const next = [...filtered]
          next[idx] = { ...next[idx], dir: 'desc' }
          return next
        } else {
          return filtered.filter(s => s.key !== sk)
        }
      } else {
        return [{ key: sk, dir: 'asc' }, ...filtered]
      }
    })
  }

  const sortIndicator = (key: string) => {
    const idx = sorts.findIndex(s => s.key === key)
    if (idx < 0) return null
    return <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>{idx + 1}{sorts[idx].dir === 'desc' ? '▼' : '▲'}</span>
  }

  const {
    colState, visibleCols, colMap,
    updateColState, addColumn, removeColumn, moveColumn, hideContextColumn,
    autoSizeColumn, autoSizeAll,
    showColPicker, setShowColPicker,
    selectedAvail, setSelectedAvail,
    selectedSelected, setSelectedSelected,
    dragCol, dropTarget, onDragStart, onDragOver, onDrop, onDragEnd,
    ctxMenu, setCtxMenu, openColPicker,
    separators, sepHas, toggleSeparator,
    onResizeStart, justResizedRef,
    selectedCols, onHeaderPointerDown, dragSelectRef,
  } = useColumnState({
    workers, filtered, isPlayerFed, onConfigChange, tableRef,
    initialColumnState: config.columnState || defaultColumnState(),
  })

  // Pins this page's current layout (incl. this column config) into a named
  // View so it's reloaded whenever the user returns here (see DynamicPage's
  // "pinned view" effect) — without Confirm, changes still survive a reload
  // via the ambient per-page autosave, they just never touch a named view.
  const handleConfirmView = async () => {
    const pageInfo = loadPages().find(p => p.id === currentPage)
    const layoutItems = loadLayout(currentPage).items
    const snapshot = {
      id: currentPage,
      label: pageInfo?.label || currentPage,
      layout: layoutItems,
      moduleConfigs: {},
    }
    const activeViewId = getActiveViewId()
    if (activeViewId) {
      try {
        const full = await api.views.get(activeViewId)
        const nextPages = full.pages.some(p => p.id === currentPage)
          ? full.pages.map(p => p.id === currentPage ? snapshot : p)
          : [...full.pages, snapshot]
        await api.views.update(activeViewId, { pages: nextPages })
      } catch {}
    } else {
      try {
        const r = await api.views.create('Default')
        await api.views.update(r.view.id, { pages: [snapshot] })
        setActiveViewId(r.view.id)
      } catch {}
    }
    setShowColPicker(false)
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
            <div className="context-menu-item" onClick={autoSizeAll}>Auto-size all</div>
            <div className="context-menu-separator" />
            <div className="context-menu-item" onClick={() => toggleSeparator(ctxMenu.id, 'left')}>{sepHas(ctxMenu.id, 'left') ? 'Remove' : 'Add'} left separator</div>
            <div className="context-menu-item" onClick={() => toggleSeparator(ctxMenu.id, 'right')}>{sepHas(ctxMenu.id, 'right') ? 'Remove' : 'Add'} right separator</div>
            <div className="context-menu-item" onClick={() => toggleSeparator(ctxMenu.id, 'both')}>{sepHas(ctxMenu.id, 'left') || sepHas(ctxMenu.id, 'right') ? 'Remove' : 'Add'} both separators</div>
          </div>
        </>,
        document.body
      )}
      <div className="filter-bar">
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
            <img src={filterIcon} alt="Filter" className="w-14 h-14" />
            Filter{hasActiveFilters ? ' (1)' : ''}
          </button>
          <button className="manage-view-btn" onClick={() => setShowColPicker(p => !p)}>
            <img src={manageIcon} alt="Manage" className="w-14 h-14" />
            Manage View
          </button>
          {showColPicker && createPortal(
            <div className="modal-overlay" onClick={() => setShowColPicker(false)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 640, maxWidth: '90vw' }}>
                <div className="modal-header">
                  <span className="modal-title">Manage View</span>
                  <div className="flex gap-1 ml-auto mr-2">
                    <button className="manage-view-btn text-xs px-1 py-0" onClick={() => {
                      api.columns.export(JSON.stringify(colState, null, 2))
                    }} title="Export columns to file">Export</button>
                    <button className="manage-view-btn text-xs px-1 py-0" onClick={async () => {
                      const res = await api.columns.import()
                      if (res.ok && res.data) {
                        try {
                          const parsed = JSON.parse(res.data)
                          if (Array.isArray(parsed)) updateColState(parsed)
                        } catch {}
                      }
                    }} title="Import columns from file">Import</button>
                    <button className="manage-view-btn text-xs px-1 py-0" onClick={() => {
                      updateColState(defaultColumnState())
                    }} title="Reset to defaults">Reset</button>
                  </div>
                  <button className="modal-close" onClick={() => setShowColPicker(false)}><img src={closeIcon} alt="Close" className="w-14 h-14 filter-icon-gray" /></button>
                </div>
                <div className="modal-body flex min-h-0 gap-3" style={{ padding: 12, minHeight: 440, height: 440 }}>
                  {/* Left: Available columns */}
                  <ColumnPickerPane
                    colState={colState}
                    selectedAvail={selectedAvail}
                    onSelectAvail={setSelectedAvail}
                    onAdd={(id) => {
                      addColumn(id)
                      const all = defaultColumns.filter(c => !colState.some(x => x.id === c.id) && c.id !== id)
                      const nextIdx = all.findIndex(c => c.id === id)
                      if (nextIdx >= 0 && nextIdx + 1 < all.length) setSelectedAvail(new Set([all[nextIdx + 1].id]))
                      else if (all.length > 0) setSelectedAvail(new Set([all[0].id]))
                      else setSelectedAvail(new Set())
                    }}
                  />
                  {/* Center: Add/Remove buttons */}
                  <div className="flex flex-col justify-center flex-shrink-0 gap-2">
                    <button className="manage-view-btn flex-center text-sm gap-1"
                      onClick={() => {
                        if (selectedAvail.size === 0) return
                        const toAdd = [...selectedAvail].filter(id => !colState.some(c => c.id === id))
                        for (const id of toAdd) addColumn(id)
                        const all = defaultColumns.filter(c => !colState.some(x => x.id === c.id) && !toAdd.includes(c.id))
                        if (all.length > 0) setSelectedAvail(new Set([all[0].id]))
                        else setSelectedAvail(new Set())
                      }}
                      style={{ padding: '6px 14px', opacity: selectedAvail.size > 0 ? 1 : 0.4 }}
                    >Add<img src={rightIcon} alt="" className="w-12 h-12" /></button>
                    <button className="manage-view-btn flex-center text-sm gap-1"
                      onClick={() => {
                        if (selectedSelected.size === 0) return
                        for (const id of selectedSelected) {
                          if (id !== 'img' && id !== 'status') removeColumn(id)
                        }
                        setSelectedSelected(new Set())
                      }}
                      style={{ padding: '6px 14px', opacity: selectedSelected.size > 0 ? 1 : 0.4 }}
                    ><img src={leftIcon} alt="" className="w-12 h-12" />Remove</button>
                  </div>
                  {/* Right: Selected columns */}
                  <SelectedColumnsList
                    visibleCols={visibleCols}
                    colMap={colMap}
                    colState={colState}
                    selectedSelected={selectedSelected}
                    setSelectedSelected={setSelectedSelected}
                    moveColumn={moveColumn}
                    removeColumn={removeColumn}
                  />
                </div>
                <div className="justify-end border-default-top p-3 flex-shrink-0">
                  <button className="btn primary" onClick={handleConfirmView} title="Pin this view so it's always loaded on returning to this page">
                    <img src={confirmIcon} alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(1)' }} />
                    Confirm
                  </button>
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
        <FilterPanel
          onClose={() => setShowFilterPanel(false)}
          orderedDims={orderedDims}
          selectedDim={selectedDim} setSelectedDim={setSelectedDim}
          groupBy={groupBy} setGroupBy={setGroupBy}
          advancedRoleFilters={advancedRoleFilters} setAdvancedRoleFilters={setAdvancedRoleFilters}
          subgroups={subgroups} activeSubgroups={activeSubgroups} setActiveSubgroups={setActiveSubgroups}
          selectedSg={selectedSg} setSelectedSg={setSelectedSg}
          setShowSgEditor={setShowSgEditor} setSgLabel={setSgLabel} setSgFilters={setSgFilters}
          filterRules={filterRules} filterDimensions={FILTER_DIMENSIONS}
          onConfigChange={onConfigChange}
        />
      )}

      {showSgEditor && (
        <SubgroupEditor
          onClose={() => setShowSgEditor(false)}
          sgLabel={sgLabel} setSgLabel={setSgLabel}
          sgFilters={sgFilters} setSgFilters={setSgFilters}
          subgroups={subgroups} onConfigChange={onConfigChange}
          allBrands={allBrands}
        />
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



      <div className="data-table-wrapper overflow-auto" ref={tableRef}>
        <div className="data-table flex flex-col" style={{ width: 'fit-content', minWidth: '100%' }}>
          <div className="flex border-default-bottom sticky top-0" style={{ zIndex: 5, background: 'var(--bg-secondary)' }}>
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
                    data-col-id={cs.id}
                    onPointerDown={e => onHeaderPointerDown(e, cs.id)}
                    onContextMenu={e => { e.preventDefault(); setCtxMenu({ id: cs.id, x: e.clientX, y: e.clientY }) }}
                    onClick={e => { if (justResizedRef.current || dragSelectRef.current?.started) return; if (!e.shiftKey && !e.ctrlKey && !e.metaKey) { if (def.sortKey) toggleSort(def.sortKey) } }}
                    className="data-table-cell data-header-cell"
                    style={{
                      flex: 'none', width: pw,
                      cursor: (def.sortKey && cs.id !== 'img' && cs.id !== 'status') ? 'pointer' : 'default',
                      position: 'relative',
                      opacity: dragCol === cs.id ? 0.5 : 1,
                      borderRight: '1px solid rgba(128,128,128,0.12)',
                      color: '#fff',
                      fontWeight: 700,
                      boxShadow: separators[cs.id]?.left && separators[cs.id]?.right
                        ? 'inset 2px 0 0 var(--accent), inset -2px 0 0 var(--accent)'
                        : separators[cs.id]?.left ? 'inset 2px 0 0 var(--accent)'
                        : separators[cs.id]?.right ? 'inset -2px 0 0 var(--accent)'
                        : undefined,
                      borderTop: dropTarget === cs.id ? '2px solid var(--accent)' : undefined,
                      ...(cs.id === 'img' || cs.id === 'status' || cs.id === 'name' ? {
                        position: 'sticky', zIndex: 7,
                        left: visibleCols.slice(0, idx).reduce((sum, c) => sum + (c.id === 'img' || c.id === 'status' || c.id === 'name' ? Number(c.width) : 0), 0),
                        background: 'var(--bg-secondary)',
                      } : {}),
                      ...(cs.id === 'img' ? { padding: 0 } : {}),
                      ...(cs.id === 'status' ? { justifyContent: 'center', overflow: 'visible' } : {}),
                      ...(cs.id === 'gender' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'role' ? { justifyContent: 'center', overflow: 'visible' } : {}),
                      ...(cs.id === 'nat' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'dispo' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'condition' || cs.id.startsWith('cond') ? { justifyContent: 'center' } : {}),
                      ...(def.filterGroup === 'stats' || def.filterGroup === 'popularity' || def.filterGroup === 'creative' ? { justifyContent: 'center' } : {}),
                      ...(selectedCols.has(cs.id) ? { background: 'rgba(233,69,96,0.12)', boxShadow: 'inset 0 -2px 0 var(--accent)' } : {}),
                    }}
                    >
                  <span className="flex items-center" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="truncate">{pw < def.label.length * 7 && def.abbrev ? def.abbrev : def.label}</span>
                    {isSorted ? sortIndicator(def.sortKey!) : null}
                  </span>
                  <span
                    className="resize-handle"
                    onMouseDown={e => { e.stopPropagation(); onResizeStart(e, cs.id) }}
                    onDoubleClick={() => autoSizeColumn(cs.id)}
                    style={{ position: 'absolute', right: -4, top: 0, bottom: 0, width: 14, cursor: 'col-resize', zIndex: 2 }}
                  />
                </div>
              )
            })}
          </div>
          {(() => {
            const renderRow = (w: Worker, rowIdx: number, secondary?: boolean) => (
              <div key={w.uid} className="worker-list-row flex border-bottom-row"
                style={{ background: rowIdx % 2 === 1 ? 'rgba(255,255,255,0.02)' : undefined, opacity: secondary ? 0.4 : undefined }}
                onContextMenu={e => { e.preventDefault(); setRowCtx({ uid: w.uid, x: e.clientX, y: e.clientY }) }}>
                {colState.map((cs, idx) => {
                  const def = colMap.get(cs.id)!
                  const pw = Number(cs.width) || 32
                  const cellContent = def.render(w)
                  return (
                    <div key={cs.id} className="data-table-cell text-md" style={{
                      flex: 'none', width: pw,
                      boxShadow: separators[cs.id]?.left && separators[cs.id]?.right
                        ? 'inset 2px 0 0 var(--accent), inset -2px 0 0 var(--accent)'
                        : separators[cs.id]?.left ? 'inset 2px 0 0 var(--accent)'
                        : separators[cs.id]?.right ? 'inset -2px 0 0 var(--accent)'
                        : undefined,
                      padding: cs.id === 'img' ? 0 : (cs.id === 'status' ? 0 : '4px 6px'),
                      ...(cs.id === 'img' ? { overflow: 'hidden' } : {}),
                      ...(cs.id === 'status' ? { justifyContent: 'center', overflow: 'visible' } : {}),
                      ...(cs.id === 'gender' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'role' ? { justifyContent: 'center', overflow: 'visible' } : {}),
                      ...(cs.id === 'nat' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'condition' || cs.id.startsWith('cond') ? { justifyContent: 'center', overflow: 'visible' } : {}),
                      ...(cs.id === 'age' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'storyline_with' || cs.id === 'tag_team' || cs.id === 'stable' ? { whiteSpace: 'normal', overflow: 'visible' } : {}),
                      ...(def.filterGroup === 'stats' || def.filterGroup === 'popularity' || def.filterGroup === 'creative' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'dispo' ? { justifyContent: 'center' } : {}),
                      ...(cs.id === 'img' || cs.id === 'status' || cs.id === 'name' ? {
                        position: 'sticky', zIndex: 6,
                        background: rowIdx % 2 === 1 ? 'linear-gradient(0deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02)), var(--bg-secondary)' : 'var(--bg-secondary)',
                        left: visibleCols.slice(0, idx).reduce((sum, c) => sum + (c.id === 'img' || c.id === 'status' || c.id === 'name' ? Number(c.width) : 0), 0),
                      } : {}),
                    }}
                    >
                      {renderCell({ cs, w, pw, cellContent, currentDate: gameInfo?.current_date, onNavigate: uid => navigateToEntity('worker', uid) })}
                    </div>
                  )
                })}
              </div>
            )
            if (groups) {
              return groups.flatMap(([key, groupWorkers]) => [
                <div key={`group-${key}`} className="group-header flex items-center border-default-top"
                  style={{ background: 'var(--bg-tertiary)', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <span>{key}</span>
                  <span className="text-xxs ml-2" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{groupWorkers.length}</span>
                </div>,
                ...groupWorkers.map((entry: any, i: number) => renderRow(entry.worker ?? entry, i, entry.secondary)),
              ])
            }
            const sorted = sorts.length > 0 ? sortWorkers(filtered, sorts) : filtered
            return sorted.map((w, rowIdx) => renderRow(w, rowIdx))
          })()}
        </div>
      </div>
    </div>
  )
}
