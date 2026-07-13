import React, { useState, useMemo, useRef, useEffect } from 'react'
import { defaultColumns, FILTER_GROUPS } from './columns'
import type { ColumnState, ColumnDef } from './columns'

export function ColumnPickerPane({
  colState,
  selectedAvail,
  onSelectAvail,
  onAdd,
}: {
  colState: ColumnState[]
  selectedAvail: string | null
  onSelectAvail: (id: string | null) => void
  onAdd: (id: string) => void
}) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const available = useMemo(() => {
    const shown = defaultColumns.filter(c => {
      if (!c.filterGroup) return false
      if (activeFilter && c.filterGroup !== activeFilter) return false
      return true
    })
    const groups = new Map<string, ColumnDef[]>()
    for (const c of shown) {
      const g = activeFilter || c.filterGroup
      const arr = groups.get(g) || []
      arr.push(c)
      groups.set(g, arr)
    }
    return groups
  }, [activeFilter])

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="mb-1 relative flex justify-end" ref={filterRef}>
        <button
          className="manage-view-btn text-sm"
          onClick={() => setFilterOpen(p => !p)}
          style={{ padding: '3px 8px' }}
        >
          {activeFilter ? FILTER_GROUPS.find(g => g.id === activeFilter)?.label || activeFilter : 'Filter'}
          <span className="ml-1">{filterOpen ? '▲' : '▼'}</span>
        </button>
        {filterOpen && (
          <div className="absolute bg-secondary border-default rounded-sm p-1 min-w-130" style={{ top: '100%', right: 0, zIndex: 10 }}>
            <div
              className="context-menu-item"
              style={!activeFilter ? { background: 'var(--accent)', color: '#fff' } : {}}
              onClick={() => { setActiveFilter(null); setFilterOpen(false) }}
            >All</div>
            {FILTER_GROUPS.map(g => (
              <div
                key={g.id}
                className="context-menu-item"
                style={activeFilter === g.id ? { background: 'var(--accent)', color: '#fff' } : {}}
                onClick={() => { setActiveFilter(g.id); setFilterOpen(false) }}
              >{g.label}</div>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto border-default rounded-sm p-1">
        {[...available.entries()]
          .sort((a, b) => {
            const ia = FILTER_GROUPS.findIndex(g => g.id === a[0])
            const ib = FILTER_GROUPS.findIndex(g => g.id === b[0])
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
          })
          .map(([group, cols]) => (
          <div key={group}>
            {!activeFilter && (
              <div className="text-xs text-bold text-accent text-uppercase" style={{ padding: '4px 6px 2px' }}>
                {FILTER_GROUPS.find(g => g.id === group)?.label || group}
              </div>
            )}
            {cols.map(def => {
              const inState = colState.some(c => c.id === def.id)
              const isSelected = selectedAvail === def.id
              return (
                <div
                  key={def.id}
                  onClick={() => {
                    if (inState) return
                    if (isSelected) { onSelectAvail(null); return }
                    onSelectAvail(def.id)
                  }}
                  onDoubleClick={() => { if (!inState) { onAdd(def.id); onSelectAvail(null) } }}
                  className="items-center truncate cursor-pointer rounded-xs text-md"
                  style={{
                    gap: 4, padding: '3px 6px',
                    opacity: inState ? 0.4 : 1,
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? '#fff' : undefined,
                  }}
                  onMouseEnter={e => { if (!inState && !isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {def.label || def.id}
                  {inState && <span className="text-accent text-xs ml-auto">✓</span>}
                </div>
              )
            })}
          </div>
        ))}
        {available.size === 0 && <div className="text-muted text-sm p-2 text-center">No columns</div>}
      </div>
    </div>
  )
}
