import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { Worker } from '../../api'
import { defaultColumns } from './columns'
import type { ColumnState, ColumnDef } from './columns'

function extractTextFromReactNode(node: React.ReactNode): string | null {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) {
    for (const n of node) {
      const t = extractTextFromReactNode(n)
      if (t) return t
    }
    return null
  }
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as React.ReactElement
    if (typeof el.props?.children === 'string') return el.props.children
    if (el.props?.children) {
      const t = extractTextFromReactNode(el.props.children)
      if (t) return t
    }
    if (typeof el.props?.label === 'string') return el.props.label
    if (typeof el.props?.name === 'string') return el.props.name
    if (typeof el.props?.title === 'string') return el.props.title
    if (typeof el.props?.text === 'string') return el.props.text
  }
  return null
}

/** Bundles column add/remove/reorder/resize/auto-size state and handlers for
 *  WorkerListColumnTable. `filtered` (not `workers`) is used for width
 *  measurement of an individual/all columns since that's what's on screen;
 *  `workers` (the full unfiltered set) is used for the one-time auto-size
 *  pass on initial mount, matching the pre-extraction behavior. */
export function useColumnState(opts: {
  workers: Worker[]
  filtered: Worker[]
  initialColumnState: ColumnState[]
  isPlayerFed: boolean
  onConfigChange: (c: Record<string, any>) => void
  tableRef: React.RefObject<HTMLDivElement>
}) {
  const { workers, filtered, initialColumnState, isPlayerFed, onConfigChange, tableRef } = opts

  const [colState, setColState] = useState<ColumnState[]>(() => initialColumnState)
  const visibleCols = useMemo(() => {
    if (isPlayerFed) return colState
    return colState.filter(cs => cs.id !== 'avg_duration' && cs.id !== 'total_duration' && cs.id !== 'storyline' && cs.id !== 'storyline_heat')
  }, [colState, isPlayerFed])
  const [showColPicker, setShowColPicker] = useState(false)
  const [selectedAvail, setSelectedAvail] = useState<Set<string>>(new Set())
  const [selectedSelected, setSelectedSelected] = useState<Set<string>>(new Set())
  const [dragCol, setDragCol] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [separators, setSeparators] = useState<Record<string, { left: boolean; right: boolean }>>(() => {
    try {
      const raw = localStorage.getItem('tew-worker-separators')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const m: Record<string, { left: boolean; right: boolean }> = {}
          for (const id of parsed) m[id] = { left: true, right: false }
          return m
        }
        return parsed
      }
    } catch {}
    return {}
  })
  const [resizing, setResizing] = useState<{ id: string; colIdx: number; colLeft: number } | null>(null)
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
    const measureEl = document.createElement('div')
    measureEl.style.cssText = 'position:fixed;visibility:hidden;left:-9999px;font-size:12px;white-space:nowrap;padding:4px 6px;font-family:inherit'
    document.body.appendChild(measureEl)
    const next = colState.map(cs => {
      if (cs.id === 'img' || cs.id === 'status') return cs
      const def = colMap.get(cs.id)
      if (!def) return cs
      let maxW = (def.label.length || 4) * 8 + 24
      for (const w of workers) {
        const rendered = def.render(w)
        let text = ''
        if (typeof rendered === 'string') {
          text = rendered
        } else if (rendered && typeof rendered === 'object' && 'props' in rendered) {
          const t = extractTextFromReactNode(rendered)
          if (t) text = t
        }
        if (text) {
          measureEl.textContent = text
          const contentW = measureEl.scrollWidth
          if (contentW > maxW) maxW = contentW
        }
      }
      return { ...cs, width: Math.min(Math.round(maxW + 4), 400) }
    })
    document.body.removeChild(measureEl)
    updateColState(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workers, colState.length])

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

  const measureColumnWidth = (id: string): number | null => {
    const def = colMap.get(id)
    if (!def) return null
    let maxW = (def.label.length || 4) * 8 + 24
    const measureEl = document.createElement('div')
    measureEl.style.cssText = 'position:fixed;visibility:hidden;left:-9999px;font-size:12px;white-space:nowrap;padding:4px 6px;font-family:inherit'
    document.body.appendChild(measureEl)
    for (const w of filtered) {
      const rendered = def.render(w)
      let text = ''
      if (typeof rendered === 'string') {
        text = rendered
      } else if (rendered && typeof rendered === 'object' && 'props' in rendered) {
        const t = extractTextFromReactNode(rendered)
        if (t) text = t
      }
      if (text) {
        measureEl.textContent = text
        const contentW = measureEl.scrollWidth
        if (contentW > maxW) maxW = contentW
      }
    }
    document.body.removeChild(measureEl)
    return Math.min(Math.round(maxW + 4), 400)
  }

  const autoSizeColumn = (id: string) => {
    const w = measureColumnWidth(id)
    if (w != null) updateColState(colState.map(cs => cs.id === id ? { ...cs, width: w } : cs))
    setCtxMenu(null)
  }

  const autoSizeAll = () => {
    const updates: { id: string; width: number }[] = []
    for (const cs of colState) {
      if (cs.id === 'img' || cs.id === 'status') continue
      const w = measureColumnWidth(cs.id)
      if (w != null) updates.push({ id: cs.id, width: w })
    }
    if (updates.length > 0) {
      const updateMap = new Map(updates.map(u => [u.id, u.width]))
      updateColState(colState.map(cs => updateMap.has(cs.id) ? { ...cs, width: updateMap.get(cs.id)! } : cs))
    }
    setCtxMenu(null)
  }

  const openColPicker = () => {
    setShowColPicker(true)
    setCtxMenu(null)
  }

  const sepHas = (id: string, side: 'left' | 'right') => !!separators[id]?.[side]

  const toggleSeparator = (id: string, side: 'left' | 'right' | 'both') => {
    const cur = separators[id] || { left: false, right: false }
    const next = { ...separators }
    if (side === 'both') {
      const active = cur.left && cur.right
      next[id] = { left: !active, right: !active }
    } else {
      next[id] = { ...cur, [side]: !cur[side] }
    }
    setSeparators(next)
    localStorage.setItem('tew-worker-separators', JSON.stringify(next))
    setCtxMenu(null)
  }

  const onResizeStart = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const colIdx = colState.findIndex(c => c.id === id)
    if (colIdx < 0) return
    let colLeft = 0
    const headerRow = tableRef.current?.querySelector('.data-table > div:first-child')
    if (headerRow) {
      const cells = headerRow.querySelectorAll('[class*="data-table-cell"]')
      const visIdx = visibleCols.findIndex(c => c.id === id)
      if (visIdx >= 0 && visIdx < cells.length) {
        const cell = cells[visIdx]
        if (cell) colLeft = cell.getBoundingClientRect().left
      }
    }
    if (!colLeft) {
      const container = tableRef.current
      if (container) {
        const containerRect = container.getBoundingClientRect()
        colLeft = containerRect.left - container.scrollLeft
        for (let i = 0; i < colIdx; i++) {
          colLeft += colState[i].width
        }
      }
    }
    setResizing({ id, colIdx, colLeft })
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
      const newPixelW = Math.max(10, e.clientX - resizing.colLeft)
      const newState = colStateRef.current.map(cs => cs.id === resizing.id ? { ...cs, width: newPixelW } : cs)
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

  return {
    colState, visibleCols, colMap,
    updateColState, addColumn, removeColumn, moveColumn, hideContextColumn,
    measureColumnWidth, autoSizeColumn, autoSizeAll,
    showColPicker, setShowColPicker,
    selectedAvail, setSelectedAvail,
    selectedSelected, setSelectedSelected,
    dragCol, dropTarget, onDragStart, onDragOver, onDrop, onDragEnd,
    ctxMenu, setCtxMenu, openColPicker,
    separators, sepHas, toggleSeparator,
    resizing, onResizeStart,
  }
}
