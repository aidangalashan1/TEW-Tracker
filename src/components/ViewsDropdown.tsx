import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { loadPages } from '../pages/pageStorage'
import { loadLayout, saveLayout, defaultLayout } from '../layout/storage'
import { ViewManager } from './ViewManager'
import manageViewIcon from '../assets/UI icons/manageview.png'

interface ViewsDropdownProps {
  currentPage: string
  onLayoutChange: (items: any[]) => void
}

export function ViewsDropdown({ currentPage, onLayoutChange }: ViewsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [viewManagerOpen, setViewManagerOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const handleSaveView = useCallback(async () => {
    setOpen(false)
    const name = prompt('Name this view:')
    if (!name?.trim()) return
    try {
      const r = await api.views.create(name.trim())
      const pages = loadPages()
      const layouts: Record<string, any> = {}
      for (const p of pages) layouts[p.id] = loadLayout(p.id)
      const viewPages = pages.map(p => ({
        id: p.id, label: p.label,
        layout: (layouts[p.id]?.items || []).map((item: any) => ({
          i: item.i, moduleId: item.moduleId,
          x: item.x, y: item.y, w: item.w, h: item.h,
          config: item.config || {},
        })),
        moduleConfigs: {},
      }))
      await api.views.update(r.view.id, { pages: viewPages })
    } catch {}
  }, [])

  const handleResetDefaults = useCallback(() => {
    setOpen(false)
    const def = defaultLayout(currentPage)
    onLayoutChange(def.items)
    saveLayout(currentPage, def)
  }, [currentPage, onLayoutChange])

  const handleClearPage = useCallback(() => {
    setOpen(false)
    const layout = loadLayout(currentPage)
    if (layout.items.length === 0) return
    if (!confirm('Remove all modules from this page?')) return
    onLayoutChange([])
  }, [currentPage, onLayoutChange])

  return (
    <>
      <button className="topbar-add-btn" onClick={e => { e.stopPropagation(); setOpen(v => !v) }} title="Manage views">
        <img src={manageViewIcon} alt="" style={{ width: 16, height: 16 }} />
        Views
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 148, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 8, padding: 4, minWidth: 180, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }} onClick={e => e.stopPropagation()}>
          <div className="context-menu-item" onClick={handleSaveView}>Save Current View</div>
          <div className="context-menu-item" onClick={() => { setOpen(false); setViewManagerOpen(true) }}>Load a View...</div>
          <div className="context-menu-item" onClick={handleResetDefaults}>Reset to Default View</div>
          <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 8px' }} />
          <div className="context-menu-item" onClick={handleClearPage} style={{ color: '#e55' }}>Clear Current Page</div>
        </div>
      )}
      {viewManagerOpen && <ViewManager onClose={() => setViewManagerOpen(false)} onLoad={() => {}} />}
    </>
  )
}
