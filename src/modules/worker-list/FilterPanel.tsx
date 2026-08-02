import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../api'
import closeIcon from '../../assets/UI icons/close.png'
import manageIcon from '../../assets/UI icons/manageview.png'
import moveUpIcon from '../../assets/UI icons/moveup.png'
import moveDownIcon from '../../assets/UI icons/movedown.png'
import leftIcon from '../../assets/UI icons/left.png'
import rightIcon from '../../assets/UI icons/right.png'
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
  dimLevels,
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
  dimLevels?: number[]
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
  const [dragState, setDragState] = useState<{
    draggingId: string | null
    dropIndex: number | null
    dropLevel: number | null
    mouseX: number | null
  }>({ draggingId: null, dropIndex: null, dropLevel: null, mouseX: null })

  // Track the order in which dimensions are toggled on
  const [toggleOrder, setToggleOrder] = useState<string[]>([])

  const INDENT = 20
  const MAX_LEVEL = 3

  // Validate and adjust a level to ensure proper tree structure
  const validateLevel = (dimId: string, requestedLevel: number, currentOrder: string[], currentLevels: number[]): number => {
    if (requestedLevel === 0) return 0
    
    // Find the position of this dimension in the order
    const dimIndex = currentOrder.indexOf(dimId)
    if (dimIndex === -1) return 0
    
    // Find the maximum level available before this position
    let maxAvailableLevel = 0
    for (let i = 0; i < dimIndex; i++) {
      maxAvailableLevel = Math.max(maxAvailableLevel, currentLevels[i])
    }
    
    // The requested level can be at most maxAvailableLevel + 1
    // This allows for flexible nesting: if user drags into L2 or L3 zone but only L1 is available,
    // it will snap to L2 (maxAvailableLevel + 1)
    const maxValidLevel = Math.min(MAX_LEVEL, maxAvailableLevel + 1)
    
    // If requested level is valid, use it; otherwise snap to the maximum valid level
    return requestedLevel <= maxValidLevel ? requestedLevel : maxValidLevel
  }

  const handleToggle = (dimId: string) => {
    const next = new Set(groupBy)
    if (next.has(dimId)) {
      // Turning off
      next.delete(dimId)
      setToggleOrder(prev => prev.filter(id => id !== dimId))
      setGroupBy(next)
    } else {
      // Turning on - auto-assign level based on toggle order
      next.add(dimId)
      const newToggleOrder = [...toggleOrder, dimId]
      setToggleOrder(newToggleOrder)
      
      // Auto-assign levels: first toggle = L0, second = L1, etc.
      const newLevels = [...(dimLevels || orderedDims.map(() => 0))]
      const dimIndex = orderedDims.findIndex(d => d.id === dimId)
      
      // Update dimOrder: active dims in toggle order first, then inactive dims in original order
      const activeDims = newToggleOrder
        .map(id => orderedDims.find(d => d.id === id))
        .filter((d): d is typeof orderedDims[0] => d !== undefined)
      const inactiveDims = orderedDims.filter(d => !next.has(d.id))
      
      // Combine without duplicates
      const seen = new Set<string>()
      const newOrder = [...activeDims, ...inactiveDims].filter(d => {
        if (seen.has(d.id)) return false
        seen.add(d.id)
        return true
      })
      
      const newOrderIds = newOrder.map(d => d.id)
      
      if (dimIndex !== -1) {
        // Auto-assign based on toggle order, then validate
        const requestedLevel = Math.min(newToggleOrder.length - 1, MAX_LEVEL)
        newLevels[dimIndex] = validateLevel(dimId, requestedLevel, newOrderIds, newLevels)
      }
      
      onConfigChange({
        dimOrder: newOrderIds,
        dimLevels: newLevels
      })
      setGroupBy(next)
    }
  }

  const handleDragStart = (e: React.DragEvent, dimId: string) => {
    setDragState({ draggingId: dimId, dropIndex: null, dropLevel: null, mouseX: null })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', dimId)
  }

  const handleDragOver = (e: React.DragEvent, itemIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragState.draggingId) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const x = e.clientX - rect.left

    // Determine if dropping above or below this item
    const dropPosition = y < rect.height / 2 ? itemIndex : itemIndex + 1

    // Get the level of the item being dragged over
    const activeDims = orderedDims.filter(d => groupBy.has(d.id))
    const targetItem = activeDims[itemIndex]
    const targetLevel = targetItem ? (dimLevels?.[orderedDims.findIndex(d => d.id === targetItem.id)] ?? 0) : 0

    // Divide the width into 4 equal zones (25% each)
    const zoneWidth = rect.width / 4
    const zone = Math.min(3, Math.floor(x / zoneWidth))

    // Map zones to levels based on the target item's level
    // Zone 0 = one level up, Zone 1 = same level, Zone 2 = one level down, Zone 3 = two levels down
    let newLevel = targetLevel + (zone - 1)
    
    // When demoting (moving to a lower level), allow dragging into the target level or lower
    // and snap to the nearest valid level
    if (zone >= 2) {
      // User is trying to demote - find the maximum valid level at this position
      const maxLevel = Math.min(MAX_LEVEL, targetLevel + 2)
      newLevel = Math.max(targetLevel, Math.min(maxLevel, newLevel))
    } else {
      // Normal logic for promoting or staying at same level
      newLevel = Math.max(0, Math.min(MAX_LEVEL, newLevel))
    }

    // Special case: dropping at position 0 (top) should default to L0
    if (dropPosition === 0) {
      newLevel = 0
    }

    setDragState({
      draggingId: dragState.draggingId,
      dropIndex: dropPosition,
      dropLevel: newLevel,
      mouseX: e.clientX
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragState.draggingId || dragState.dropIndex === null || dragState.dropLevel === null) {
      setDragState({ draggingId: null, dropIndex: null, dropLevel: null, mouseX: null })
      return
    }

    const activeDims = orderedDims.filter(d => groupBy.has(d.id))
    const draggedIndex = activeDims.findIndex(d => d.id === dragState.draggingId)
    
    if (draggedIndex === -1) {
      setDragState({ draggingId: null, dropIndex: null, dropLevel: null, mouseX: null })
      return
    }

    // Get current level of dragged dimension
    const draggedDimIndex = orderedDims.findIndex(d => d.id === dragState.draggingId)
    const currentLevel = dimLevels?.[draggedDimIndex] ?? 0

    // Reorder active dimensions
    const newActiveOrder = [...activeDims]
    const [moved] = newActiveOrder.splice(draggedIndex, 1)
    
    // Adjust drop index if we're moving down
    let adjustedDropIndex = dragState.dropIndex
    if (draggedIndex < dragState.dropIndex) {
      adjustedDropIndex--
    }
    
    newActiveOrder.splice(adjustedDropIndex, 0, moved)

    // Update levels
    const newLevels = [...(dimLevels || orderedDims.map(() => 0))]
    const targetLevel = dragState.dropLevel

    // If promoting (moving to a higher level), swap with the dimension at that level
    if (targetLevel < currentLevel) {
      // Find the dimension currently at the target level
      const targetLevelDimIndex = orderedDims.findIndex((d, idx) => 
        newLevels[idx] === targetLevel && d.id !== dragState.draggingId
      )
      
      if (targetLevelDimIndex !== -1) {
        // Swap levels
        newLevels[targetLevelDimIndex] = currentLevel
        newLevels[draggedDimIndex] = targetLevel
      } else {
        // No dimension at target level, just promote
        newLevels[draggedDimIndex] = targetLevel
      }
    } else {
      // Demoting or staying at same level - use normal validation
      newLevels[draggedDimIndex] = validateLevel(dragState.draggingId, targetLevel, newActiveOrder.map(d => d.id), newLevels)
    }

    // Rebuild full dimOrder: active dims in new order, then inactive dims
    const inactiveDims = orderedDims.filter(d => !groupBy.has(d.id))
    
    // Combine without duplicates
    const seen = new Set<string>()
    const newDimOrder = [...newActiveOrder, ...inactiveDims].filter(d => {
      if (seen.has(d.id)) return false
      seen.add(d.id)
      return true
    })

    const newDimOrderIds = newDimOrder.map(d => d.id)

    // Update toggle order to match new active order
    setToggleOrder(newActiveOrder.map(d => d.id))

    onConfigChange({
      dimOrder: newDimOrderIds,
      dimLevels: newLevels
    })

    setDragState({ draggingId: null, dropIndex: null, dropLevel: null, mouseX: null })
  }

  const handleDragEnd = () => {
    setDragState({ draggingId: null, dropIndex: null, dropLevel: null, mouseX: null })
  }

  const handleLevelSelect = (level: number) => {
    if (!dragState.draggingId || dragState.dropIndex === null) return
    setDragState({
      ...dragState,
      dropLevel: level
    })
  }
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
            
            {/* Inactive Dimension Toggles */}
            {orderedDims.filter(g => !groupBy.has(g.id)).length > 0 && (
              <div className="flex flex-col gap-1" style={{ marginBottom: 12 }}>
                {orderedDims.filter(g => !groupBy.has(g.id)).map((g) => (
                  <div key={g.id} className="flex items-center gap-2">
                    <div className={`toggle-track ${groupBy.has(g.id) ? 'active' : ''}`} onClick={() => handleToggle(g.id)}>
                      <div className="toggle-thumb" />
                    </div>
                    <span className="text-md" style={{ color: groupBy.has(g.id) ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                      {g.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Drag-and-Drop Tree */}
            {groupBy.size > 0 && (
              <div 
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 6,
                  padding: 12,
                  border: '1px solid var(--border-color)',
                  minHeight: 100,
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Drag to arrange hierarchy
                </div>
                
                {/* Level Selector Bar */}
                {dragState.draggingId && (
                  <div style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 8, alignSelf: 'center' }}>
                      Drop at level:
                    </div>
                    {Array.from({ length: MAX_LEVEL + 1 }, (_, i) => i).map(level => (
                      <button
                        key={level}
                        onClick={() => handleLevelSelect(level)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 4,
                          border: '1px solid var(--border-color)',
                          background: dragState.dropLevel === level ? 'var(--accent)' : 'var(--bg-primary)',
                          color: dragState.dropLevel === level ? '#fff' : 'var(--text-primary)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        Level {level}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Tree Items */}
                <div style={{ position: 'relative' }}>
                  {/* L0 Drop Zone - Top */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!dragState.draggingId) return
                      setDragState({
                        ...dragState,
                        dropIndex: 0,
                        dropLevel: 0
                      })
                    }}
                    onDrop={handleDrop}
                    style={{
                      height: dragState.dropIndex === 0 && dragState.dropLevel === 0 ? 50 : 20,
                      background: dragState.dropIndex === 0 && dragState.dropLevel === 0 ? 'var(--accent)' : 'var(--bg-tertiary)',
                      borderRadius: 4,
                      boxShadow: dragState.dropIndex === 0 && dragState.dropLevel === 0 ? '0 0 12px var(--accent)' : 'none',
                      transition: 'all 0.15s',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    {dragState.dropIndex === 0 && dragState.dropLevel === 0 ? (
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, position: 'relative', zIndex: 1 }}>↓ Drop at Level 0 ↓</span>
                    ) : null}
                  </div>
                  
                  {/* Vertical guide line */}
                  {dragState.draggingId && dragState.dropLevel !== null && (
                    <div style={{
                      position: 'absolute',
                      left: dragState.dropLevel * INDENT + 6,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: 'var(--accent)',
                      opacity: 0.3,
                      pointerEvents: 'none',
                      zIndex: 1
                    }} />
                  )}
                  
                  {orderedDims.filter(d => groupBy.has(d.id)).map((d, idx) => {
                    const dimIndex = orderedDims.findIndex(od => od.id === d.id)
                    const level = dimLevels?.[dimIndex] ?? 0
                    const isDragging = dragState.draggingId === d.id
                    const isDropTarget = dragState.dropIndex !== null && dragState.dropIndex === idx
                    const isAbove = dragState.dropIndex !== null && dragState.dropIndex === idx && dragState.dropLevel !== null
                    
                    return (
                      <div key={d.id} style={{ position: 'relative' }}>
                        {/* Drop zone indicator - above */}
                        {isAbove && (
                          <div style={{
                            height: 3,
                            background: 'var(--accent)',
                            marginLeft: (dragState.dropLevel || 0) * INDENT,
                            marginRight: 0,
                            borderRadius: 2,
                            marginBottom: 4,
                            boxShadow: '0 0 8px var(--accent)',
                            transition: 'all 0.15s'
                          }} />
                        )}
                        
                        {/* Item */}
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, d.id)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                          style={{ 
                            position: 'relative', 
                            paddingLeft: level * INDENT,
                            marginBottom: 4,
                            opacity: isDragging ? 0.3 : 1,
                            cursor: 'grab',
                            transition: 'opacity 0.15s'
                          }}
                        >
                          {/* Level zone indicators when dragging */}
                          {dragState.draggingId && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              display: 'flex',
                              pointerEvents: 'none',
                              zIndex: 0
                            }}>
                              {[0, 1, 2, 3].map(zoneLevel => (
                                <div
                                  key={zoneLevel}
                                  style={{
                                    flex: 1,
                                    borderLeft: zoneLevel > 0 ? '1px dashed var(--border-color)' : 'none',
                                    background: dragState.dropLevel === zoneLevel && dragState.dropIndex === idx + 1
                                      ? zoneLevel === 0 ? 'hsla(210, 60%, 40%, 0.15)' :
                                        zoneLevel === 1 ? 'hsla(150, 60%, 40%, 0.15)' :
                                        zoneLevel === 2 ? 'hsla(45, 60%, 40%, 0.15)' :
                                        'hsla(280, 60%, 40%, 0.15)'
                                      : 'transparent',
                                    transition: 'background 0.1s'
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {/* Tree connectors */}
                          {level > 0 && (
                            <>
                              <div style={{
                                position: 'absolute',
                                left: (level - 1) * INDENT + 6,
                                top: -8,
                                bottom: '50%',
                                width: 2,
                                background: 'var(--border-color)'
                              }} />
                              <div style={{
                                position: 'absolute',
                                left: (level - 1) * INDENT + 6,
                                top: '50%',
                                width: 10,
                                height: 2,
                                background: 'var(--border-color)'
                              }} />
                            </>
                          )}
                          
                          {/* Item content */}
                          <div style={{
                            padding: '8px 12px',
                            background: level === 0 ? 'hsla(210, 30%, 25%, 0.3)' : 
                                       level === 1 ? 'hsla(150, 30%, 25%, 0.3)' :
                                       level === 2 ? 'hsla(45, 30%, 25%, 0.3)' :
                                       'hsla(280, 30%, 25%, 0.3)',
                            borderRadius: 4,
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            userSelect: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <div 
                              className="toggle-track active"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggle(d.id)
                              }}
                              style={{ flexShrink: 0 }}
                            >
                              <div className="toggle-thumb" />
                            </div>
                            <span style={{ flex: 1 }}>{d.label}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Drop zone at the end */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!dragState.draggingId) return
                      
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX - rect.left
                      const targetLevel = Math.min(
                        Math.max(0, Math.floor(x / INDENT)),
                        MAX_LEVEL
                      )
                      
                      setDragState({
                        draggingId: dragState.draggingId,
                        dropIndex: orderedDims.filter(d => groupBy.has(d.id)).length,
                        dropLevel: targetLevel,
                        mouseX: e.clientX
                      })
                    }}
                    onDrop={handleDrop}
                    style={{
                      height: dragState.dropIndex === orderedDims.filter(d => groupBy.has(d.id)).length ? 3 : 20,
                      background: dragState.dropIndex === orderedDims.filter(d => groupBy.has(d.id)).length ? 'var(--accent)' : 'transparent',
                      marginLeft: dragState.dropIndex === orderedDims.filter(d => groupBy.has(d.id)).length ? (dragState.dropLevel || 0) * INDENT : 0,
                      borderRadius: 2,
                      boxShadow: dragState.dropIndex === orderedDims.filter(d => groupBy.has(d.id)).length ? '0 0 8px var(--accent)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Advanced Role Filters */}
            {groupBy.has('role') && (
              <div style={{ marginTop: 12 }}>
                <div className="text-xs text-semibold text-muted text-uppercase" style={{ marginBottom: 8 }}>Advanced Role Filters</div>
                <div className="flex flex-col gap-1">
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
              </div>
            )}
          </div>

          <div className="filter-box">
            <div className="flex-between mb-2">
              <div className="filter-box-header" style={{ marginBottom: 0 }}>Subgroups</div>
              <button className="manage-view-btn text-xs" style={{ padding: '3px 10px' }}
                onClick={() => { setShowSgEditor(true); setSgLabel(''); setSgFilters({}) }}>+ New</button>
            </div>
            <div className="flex flex-col gap-1">
              {subgroups.map((sg, sgIdx) => {
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
