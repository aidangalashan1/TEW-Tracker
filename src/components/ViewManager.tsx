import { useState, useEffect, useRef } from 'react'
import { api, ViewSummary } from '../api'
import { loadPages, savePages } from '../pages/pageStorage'
import { loadLayout, saveLayout, setActiveViewId } from '../layout/storage'

interface ViewManagerProps {
  onClose: () => void
  onLoad: () => void
}

export function ViewManager({ onClose, onLoad }: ViewManagerProps) {
  const [views, setViews] = useState<ViewSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = () => {
    setLoading(true)
    api.views.list().then(r => { setViews(r.views); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const handleSaveAs = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const r = await api.views.create(newName.trim(), newDesc.trim())
      const viewId = r.view.id
      const pages = loadPages()
      const layouts: Record<string, any> = {}
      for (const p of pages) {
        layouts[p.id] = loadLayout(p.id)
      }
      const viewPages = pages.map(p => ({
        id: p.id,
        label: p.label,
        layout: (layouts[p.id]?.items || []).map((item: any) => ({
          i: item.i, moduleId: item.moduleId,
          x: item.x, y: item.y, w: item.w, h: item.h,
          config: item.config || {},
        })),
        moduleConfigs: {},
      }))
      await api.views.update(viewId, { pages: viewPages })
      setNewName('')
      setNewDesc('')
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (v: ViewSummary) => {
    try {
      const full = await api.views.get(v.id)
      savePages(full.pages.map(p => ({ id: p.id, label: p.label })))
      for (const p of full.pages) {
        saveLayout(p.id, { page: p.id, items: p.layout })
      }
      setActiveViewId(v.id)
      onLoad()
      onClose()
      window.location.reload()
    } catch { }
  }

  const handleResetDefaults = async (v: ViewSummary) => {
    if (!confirm(`Reset "${v.name}" module configs to defaults?`)) return
    try {
      const full = await api.views.get(v.id)
      for (const p of full.pages) {
        for (const item of p.layout) {
          (item as any).config = {}
        }
      }
      await api.views.update(v.id, { pages: full.pages })
      refresh()
    } catch { }
  }

  const handleDelete = async (v: ViewSummary) => {
    if (!confirm(`Delete "${v.name}"?`)) return
    try {
      await api.views.delete(v.id)
      refresh()
    } catch { }
  }

  const handleExport = async (v: ViewSummary) => {
    try {
      const full = await api.views.get(v.id)
      const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${v.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.view.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch { }
  }

  const handleImport = () => {
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const view = JSON.parse(text)
      if (!view.id || !view.name || !view.pages) {
        alert('Invalid view file')
        return
      }
      const r = await api.views.create(view.name, view.description || '')
      await api.views.update(r.view.id, { pages: view.pages })
      refresh()
    } catch {
      alert('Failed to import view')
    }
    e.target.value = ''
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-primary)', borderRadius: 12,
        width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>View Manager</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: '4px 8px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading...</div>
          ) : views.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No saved views yet.</div>
          ) : (
            views.map(v => (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', marginBottom: 6,
                background: 'var(--bg-secondary)', borderRadius: 8,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {v.pageCount} page{v.pageCount !== 1 ? 's' : ''}
                    {v.updated ? ` · ${new Date(v.updated).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <button onClick={() => handleLoad(v)} style={btnStyle}>Load</button>
                <button onClick={() => handleExport(v)} style={btnStyle}>Export</button>
                <button onClick={() => handleResetDefaults(v)} style={btnStyle}>Defaults</button>
                <button onClick={() => handleDelete(v)} style={{ ...btnStyle, color: '#e55' }}>Delete</button>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="View name..."
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)', color: '#fff', fontSize: 13, outline: 'none',
            }}
            onKeyDown={e => e.key === 'Enter' && handleSaveAs()}
          />
          <button onClick={handleSaveAs} disabled={!newName.trim() || saving} style={{
            ...btnStyle, background: 'var(--accent)', color: '#fff',
            opacity: !newName.trim() || saving ? 0.5 : 1,
          }}>Save</button>
          <button onClick={handleImport} style={btnStyle}>Import</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
  padding: '4px 10px', borderRadius: 5, whiteSpace: 'nowrap',
}
