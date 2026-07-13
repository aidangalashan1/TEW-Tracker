import { useRef, useState, useEffect, useCallback } from 'react'
import GridLayout from 'react-grid-layout/legacy'
import type { Layout, LayoutItem } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { getModule } from '../modules/registry'
import { getSizeTier } from '../modules/size'
import { useApp } from '../context/AppContext'
import type { LayoutItemData } from './types'
import { nextId } from './nextId'
import { ViewsDropdown } from '../components/ViewsDropdown'
import { ModuleDrawer } from '../components/ModuleDrawer'
import popoutIcon from '../assets/UI icons/popout.png'
import pageIcon from '../assets/UI icons/fullpage.png'
import plusIcon from '../assets/UI icons/plus.png'
import closeIcon from '../assets/UI icons/close.png'
import modSizeIcon from '../assets/UI icons/changemodsize.png'

const SIZE_PRESETS = [
  { label: 'Card', w: 2, h: 2 },
  { label: 'Small', w: 4, h: 4 },
  { label: 'Medium', w: 8, h: 8 },
  { label: 'Large', w: 12, h: 12 },
] as const

interface LayoutEngineProps {
  layout: LayoutItemData[]
  data: Record<string, any>
  onLayoutChange: (items: LayoutItemData[]) => void
}

export function LayoutEngine({ layout, data, onLayoutChange }: LayoutEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [popoutModule, setPopoutModule] = useState<string | null>(null)
  const { moduleDrawerOpen, setModuleDrawerOpen, navigateToEntity, currentPage } = useApp()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleLayoutChange = useCallback((gridLayout: Layout) => {
    const updated = layout.map(item => {
      const gl = (gridLayout as LayoutItem[]).find(l => l.i === item.i)
      if (gl) {
        return { ...item, x: gl.x, y: gl.y, w: gl.w, h: gl.h }
      }
      return item
    })
    onLayoutChange(updated)
  }, [layout, onLayoutChange])

  const handleRemove = useCallback((instanceId: string) => {
    const updated = layout.filter(item => item.i !== instanceId)
    onLayoutChange(updated)
  }, [layout, onLayoutChange])

  const handleResize = useCallback((instanceId: string, w: number, h: number) => {
    const updated = layout.map(item =>
      item.i === instanceId ? { ...item, w, h } : item
    )
    onLayoutChange(updated)
    setOpenMenu(null)
  }, [layout, onLayoutChange])

  const handleAddModule = useCallback((moduleId: string) => {
    const i = nextId()
    const newItem: LayoutItemData = {
      i, moduleId, x: 0, y: 0, w: 16, h: 4,
    }
    onLayoutChange([...layout, newItem])
    setModuleDrawerOpen(false)
  }, [layout, onLayoutChange, setModuleDrawerOpen])

  useEffect(() => {
    if (!openMenu) return
    const close = () => setOpenMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [openMenu])

  const handleConfigChange = useCallback((itemId: string, config: Record<string, any>) => {
    const next = layout.map(it => it.i === itemId ? { ...it, config: { ...(it.config || {}), ...config } } : it)
    onLayoutChange(next)
  }, [layout, onLayoutChange])

  const gridItems = layout.map(item => {
    const def = getModule(item.moduleId)
    if (!def) return null

    return (
      <div key={item.i} className="module-wrapper" style={{ zIndex: openMenu === item.i ? 100 : undefined }}>
        <div className="module-header">
          <span className="module-title">{def.name}</span>
          <div className="module-header-actions">
            <button
              className="module-popout-btn"
              data-tooltip="Pop out"
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()
                setPopoutModule(item.i)
              }}
            >
              <img src={popoutIcon} alt="Pop out" style={{ width: 14, height: 14 }} />
            </button>
            <button
              className="module-gear-btn"
              data-tooltip="Change size"
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()
                setOpenMenu(openMenu === item.i ? null : item.i)
              }}
            >
              <img src={modSizeIcon} alt="Resize" style={{ width: 14, height: 14 }} />
            </button>
            <button
              className="module-remove-btn"
              data-tooltip="Remove module"
              onClick={e => {
                e.stopPropagation()
                e.preventDefault()
                setConfirmRemoveId(item.i)
              }}
            >
              <img src={closeIcon} alt="Remove" style={{ width: 14, height: 14 }} />
            </button>
          </div>
          {openMenu === item.i && (
            <div className="module-size-menu" onClick={e => e.stopPropagation()}>
              {SIZE_PRESETS.filter(p => !(def.maxW && p.w > def.maxW) && !(def.maxH && p.h > def.maxH) && p.w >= def.minW && p.h >= def.minH).map(preset => (
                <button
                  key={preset.label}
                  className={`module-size-option ${item.w === preset.w && item.h === preset.h ? 'active' : ''}`}
                  onClick={e => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleResize(item.i, preset.w, preset.h)
                  }}
                >
                  <span className="size-label">{preset.label}</span>
                  <span className="size-dims">{preset.w}×{preset.h}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="module-body" key={getSizeTier(item.w, item.h)}>
          <ErrorBoundary label={`Module:${def.name}`} resetKey={item.i}>
            {def.render({
              data: data[item.moduleId],
              width: item.w,
              height: item.h,
              tier: getSizeTier(item.w, item.h),
              config: item.config ?? {},
              onConfigChange: (cfg) => handleConfigChange(item.i, cfg),
            })}
          </ErrorBoundary>
        </div>
        <button
          className="module-expand-btn"
          data-tooltip={def.supportsPageView ? "Full page" : "Pop out"}
          onClick={e => {
            e.stopPropagation()
            e.preventDefault()
            if (def.supportsPageView) navigateToEntity('module', def.id)
            else setPopoutModule(item.i)
          }}
        >
          <img src={def.supportsPageView ? pageIcon : popoutIcon} alt="Expand" style={{ width: 16, height: 16 }} />
        </button>
      </div>
    )
  })

  const gridLayout: LayoutItem[] = layout.map(item => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: getModule(item.moduleId)?.minW ?? 2,
    minH: getModule(item.moduleId)?.minH ?? 2,
    maxW: getModule(item.moduleId)?.maxW,
    maxH: getModule(item.moduleId)?.maxH,
    isDraggable: true,
    static: false,
  }))

  const popoutItem = popoutModule ? layout.find(i => i.i === popoutModule) : null
  const popoutDef = popoutItem ? getModule(popoutItem.moduleId) : null

  return (
    <div className="layout-engine" ref={containerRef}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8, paddingRight: 8, position: 'relative' }}>
        <ViewsDropdown currentPage={currentPage} onLayoutChange={onLayoutChange} />
        <button className="topbar-add-btn" onClick={() => setModuleDrawerOpen(true)} title="Add module">
          <img src={plusIcon} alt="Add" style={{ width: 16, height: 16 }} />
          Add Module
        </button>
      </div>
      <GridLayout
        className="layout-grid"
        layout={gridLayout}
        width={width}
        cols={16}
        rowHeight={Math.max(50, Math.round((width - 136) / 16))}
        margin={[8, 8]}
        containerPadding={[8, 8]}
        maxRows={Infinity}
        isDraggable={true}
        isBounded={false}
        draggableHandle=".module-header"
        draggableCancel=".react-resizable-handle, .module-gear-btn, .module-remove-btn, .module-expand-btn, button, a, input, select"
        isResizable={false}
        autoSize={true}
        onLayoutChange={handleLayoutChange}
      >
        {gridItems}
      </GridLayout>

      <ModuleDrawer open={moduleDrawerOpen} onClose={() => setModuleDrawerOpen(false)} onAdd={handleAddModule} />

      {popoutItem && popoutDef && (
        <div className="popout-overlay" onClick={() => setPopoutModule(null)}>
          <div className="popout" onClick={e => e.stopPropagation()}>
            <div className="popout-header">
              <span className="popout-title">{popoutDef.name}</span>
              <div className="module-header-actions">
                {popoutDef.supportsPageView && <button className="modal-page-btn" data-tooltip="Full page" onClick={e => { e.stopPropagation(); setPopoutModule(null); navigateToEntity('module', popoutDef.id) }}><img src={pageIcon} alt="Full page" style={{ width: 14, height: 14 }} /></button>}
                <button className="modal-close" onClick={() => setPopoutModule(null)}>✕</button>
              </div>
            </div>
            <div className="popout-body">
              {popoutDef.render({
                data: data[popoutItem.moduleId],
                width: 16,
                height: 16,
                tier: 'large',
                config: popoutItem.config ?? {},
                onConfigChange: (cfg) => handleConfigChange(popoutItem.i, cfg),
              })}
            </div>
          </div>
        </div>
      )}

      {confirmRemoveId && (
        <div className="modal-overlay" onClick={() => setConfirmRemoveId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 320, textAlign: 'center' }}>
            <div className="modal-header">
              <span className="modal-title">Remove Module?</span>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button className="btn primary" onClick={() => { handleRemove(confirmRemoveId); setConfirmRemoveId(null) }}>Yes</button>
              <button className="btn" onClick={() => setConfirmRemoveId(null)}>No</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
