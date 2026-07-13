import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Storyline, PlannedStoryline, Worker } from '../../api'
import { api } from '../../api'
import { useToast } from '../../components/Toast'
import { fmtDate } from '../../lib/dates'
import type { ModuleRenderProps } from '../types'
import plusIcon from '../../assets/UI icons/plus.png'
import closeIcon from '../../assets/UI icons/close.png'

function CreatePlannedModal({ onClose }: { onClose: () => void }) {
  const { showToast } = useToast()
  const ref = useRef<HTMLDivElement>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roster, setRoster] = useState<Worker[]>([])
  const [assigned, setAssigned] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.roster.list().then(r => setRoster(r.workers)).catch(() => {})
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    setTimeout(() => { document.addEventListener('mousedown', handler); document.addEventListener('keydown', keyHandler) }, 0)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [onClose])

  const toggleWorker = (uid: number) => { setAssigned(prev => { const n = new Set(prev); if (n.has(uid)) n.delete(uid); else n.add(uid); return n }) }

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await api.plannedStorylines.create(name.trim(), description.trim())
      const list = await api.plannedStorylines.list()
      const created = list.storylines.find(s => s.name === name.trim())
      if (created && assigned.size > 0) await api.plannedStorylines.update(created.id!, { workers: [...assigned] })
      showToast('Storyline created', 'success'); onClose()
    } catch { showToast('Failed to create storyline', 'error') }
  }

  const filtered = roster.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.short_name.toLowerCase().includes(search.toLowerCase()))

  return createPortal(
    <div className="fixed inset-0 z-1000 flex-center bg-overlay">
      <div ref={ref} className="bg-primary rounded-lg w-600 max-w-90vw max-h-85vh flex flex-col border-default">
        <div className="flex-between px-4 py-3 border-default-bottom flex-shrink-0">
          <span className="text-base text-bold text-primary">New Planned Storyline</span>
          <div onClick={onClose} className="w-28 h-28 rounded-full bg-dark-muted flex-center cursor-pointer"><img src={closeIcon} alt="" className="w-14 h-14 filter-icon-gray" /></div>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2 flex-shrink-0">
          <input className="w-full px-2 py-1 rounded-md border-default bg-darker text-primary text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Storyline name" />
          <textarea className="w-full px-2 py-1 rounded-md border-default bg-darker text-primary text-sm" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional notes..." rows={2} />
        </div>
        <div className="px-4 py-2 border-default-bottom flex-shrink-0">
          <div className="text-xs text-secondary mb-1">Workers ({assigned.size})</div>
          <input className="w-full px-2 py-1 rounded-md border-default bg-darker text-primary text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-auto px-4 py-2 flex flex-wrap gap-2">
          {filtered.map(w => {
            const sel = assigned.has(w.uid)
            return <div key={w.uid} onClick={() => toggleWorker(w.uid)} className={`px-2 py-1 rounded-md cursor-pointer text-xs ${sel ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>{sel ? '✓ ' : ''}{w.name}</div>
          })}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-default-top flex-shrink-0">
          <button onClick={onClose} className="px-3 py-1 rounded-md border-default bg-dark-muted text-secondary text-xs cursor-pointer">Cancel</button>
          <button onClick={handleCreate} className="px-3 py-1 rounded-md border-none bg-blue-400 text-white text-xs text-semibold cursor-pointer">Create</button>
        </div>
      </div>
    </div>, document.body
  )
}

function EditPlannedModal({ storyline, onClose }: { storyline: PlannedStoryline; onClose: () => void }) {
  const { showToast } = useToast()
  const ref = useRef<HTMLDivElement>(null)
  const [name, setName] = useState(storyline.name)
  const [description, setDescription] = useState(storyline.notes || '')
  const [roster, setRoster] = useState<Worker[]>([])
  const [assigned, setAssigned] = useState<Set<number>>(new Set(storyline.workers || []))
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.roster.list().then(r => setRoster(r.workers)).catch(() => {})
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    setTimeout(() => { document.addEventListener('mousedown', handler); document.addEventListener('keydown', keyHandler) }, 0)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler) }
  }, [onClose])

  const toggleWorker = (uid: number) => { setAssigned(prev => { const n = new Set(prev); if (n.has(uid)) n.delete(uid); else n.add(uid); return n }) }

  const handleUpdate = async () => {
    if (!name.trim()) return
    try {
      await api.plannedStorylines.update(storyline.id!, { name: name.trim(), notes: description.trim(), workers: [...assigned] })
      showToast('Storyline updated', 'success'); onClose()
    } catch { showToast('Failed to update storyline', 'error') }
  }

  const filtered = roster.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.short_name.toLowerCase().includes(search.toLowerCase()))

  return createPortal(
    <div className="fixed inset-0 z-1000 flex-center bg-overlay">
      <div ref={ref} className="bg-primary rounded-lg w-600 max-w-90vw max-h-85vh flex flex-col border-default">
        <div className="flex-between px-4 py-3 border-default-bottom flex-shrink-0">
          <span className="text-base text-bold text-primary">Edit Planned Storyline</span>
          <div onClick={onClose} className="w-28 h-28 rounded-full bg-dark-muted flex-center cursor-pointer"><img src={closeIcon} alt="" className="w-14 h-14 filter-icon-gray" /></div>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2 flex-shrink-0">
          <input className="w-full px-2 py-1 rounded-md border-default bg-darker text-primary text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="Storyline name" />
          <textarea className="w-full px-2 py-1 rounded-md border-default bg-darker text-primary text-sm" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional notes..." rows={2} />
        </div>
        <div className="px-4 py-2 border-default-bottom flex-shrink-0">
          <div className="text-xs text-secondary mb-1">Workers ({assigned.size})</div>
          <input className="w-full px-2 py-1 rounded-md border-default bg-darker text-primary text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-auto px-4 py-2 flex flex-wrap gap-2">
          {filtered.map(w => {
            const sel = assigned.has(w.uid)
            return <div key={w.uid} onClick={() => toggleWorker(w.uid)} className={`px-2 py-1 rounded-md cursor-pointer text-xs ${sel ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>{sel ? '✓ ' : ''}{w.name}</div>
          })}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-default-top flex-shrink-0">
          <button onClick={onClose} className="px-3 py-1 rounded-md border-default bg-dark-muted text-secondary text-xs cursor-pointer">Cancel</button>
          <button onClick={handleUpdate} className="px-3 py-1 rounded-md border-none bg-blue-400 text-white text-xs text-semibold cursor-pointer">Save</button>
        </div>
      </div>
    </div>, document.body
  )
}

function HeatBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#60a5fa' : pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-1">
      <div className="w-40 h-6 rounded-xs bg-darker overflow-hidden">
        <div className="h-full rounded-xs" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-bold text-mono" style={{ color }}>{pct}%</span>
    </div>
  )
}

export function StorylineListModule({ data, tier }: ModuleRenderProps<any>) {
  const { showToast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<PlannedStoryline | null>(null)
  const [planned, setPlanned] = useState<PlannedStoryline[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDeleting(null); setShowCreate(false); setEditing(null) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const gameStorylines: Storyline[] = data?.storylines || []
  const loadPlanned = () => { api.plannedStorylines.list().then(r => setPlanned(r.storylines)).catch(() => {}) }
  useEffect(() => { loadPlanned() }, [])

  const handleDelete = async (sid: string) => {
    try { await api.plannedStorylines.delete(sid); setDeleting(null); loadPlanned(); showToast('Storyline deleted', 'success') }
    catch { showToast('Failed to delete storyline', 'error') }
  }

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full overflow-auto p-1 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase px-1">Storylines</div>
        {gameStorylines.map(s => {
            const heatColor = s.heat.pct >= 80 ? '#60a5fa' : s.heat.pct >= 60 ? '#22c55e' : s.heat.pct >= 40 ? '#f59e0b' : '#ef4444'
            return (
              <div key={s.uid} className="flex items-center gap-1 p-1 bg-secondary rounded border-default flex-1">
                <div className="w-1 h-full rounded-xs flex-shrink-0" style={{ background: heatColor }} data-tooltip={`Heat: ${s.heat.pct}%`} />
                <span className="text-xxs text-primary flex-1 truncate">{s.name}</span>
                <span className={`text-xxs px-1 py-0 rounded-xs text-bold ${s.furthered ? 'bg-green' : 'bg-yellow'} text-white`}>{s.furthered ? 'On' : 'Off'}</span>
              </div>
            )
          })}
          {gameStorylines.length === 0 && <span className="text-xxs text-muted p-1">No active storylines</span>}
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase mb-1">Storylines</div>
        {gameStorylines.map(s => (
          <div key={s.uid} className="flex items-center gap-2 p-1 bg-secondary rounded border-default">
            <span className="text-xs text-primary flex-1 truncate">{s.name}</span>
            <div className="w-30 h-4 rounded-xs bg-darker overflow-hidden flex-shrink-0">
              <div className="h-full rounded-xs" style={{ width: `${s.heat.pct}%`, background: s.heat.pct >= 80 ? '#60a5fa' : s.heat.pct >= 60 ? '#22c55e' : s.heat.pct >= 40 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <span className="text-xxs text-bold text-mono w-24 text-right" style={{ color: s.heat.pct >= 80 ? '#60a5fa' : s.heat.pct >= 60 ? '#22c55e' : s.heat.pct >= 40 ? '#f59e0b' : '#ef4444' }}>{s.heat.pct}%</span>
          </div>
        ))}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-2">
        <div className="text-xs text-bold text-muted text-uppercase">Storylines</div>
        {gameStorylines.map(s => (
          <div key={s.uid} className="bg-secondary rounded-lg border-default p-2 flex items-center gap-2">
            <span className="text-sm text-bold text-primary flex-1 truncate">{s.name}</span>
            <div className="flex items-center gap-1">
              <div className="w-40 h-5 rounded-xs bg-darker overflow-hidden">
                <div className="h-full rounded-xs" style={{ width: `${s.heat.pct}%`, background: s.heat.pct >= 80 ? '#60a5fa' : s.heat.pct >= 60 ? '#22c55e' : s.heat.pct >= 40 ? '#f59e0b' : '#ef4444' }} />
              </div>
              <span className="text-xs text-bold text-mono w-20 text-right" style={{ color: s.heat.pct >= 80 ? '#60a5fa' : s.heat.pct >= 60 ? '#22c55e' : s.heat.pct >= 40 ? '#f59e0b' : '#ef4444' }}>{s.heat.pct}%</span>
            </div>
            <span className={`text-xxs px-1 py-0 rounded-sm text-bold ${s.furthered ? 'bg-green text-white' : 'bg-yellow text-dark-333'}`}>{s.furthered ? 'Active' : 'Dormant'}</span>
            {s.start_date && <span className="text-xxs text-secondary">{fmtDate(s.start_date)}</span>}
          </div>
        ))}
        {planned.length > 0 && (
          <>
            <div className="text-xs text-bold text-muted text-uppercase mt-2">Planned</div>
            {planned.map(s => (
              <div key={s.id} className="bg-secondary rounded-lg border-default p-2 flex items-center gap-2 opacity-70">
                <span className="text-xs px-1 py-0 rounded-xs bg-purple text-white text-bold">Planned</span>
                <span className="text-sm text-bold text-primary flex-1 truncate">{s.name}</span>
                <span className="text-xxs text-secondary">{(s.workers || []).length} workers</span>
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-secondary">{gameStorylines.length} active · {planned.length} planned</span>
        <div className="ml-auto">
          <button onClick={() => setShowCreate(true)} className="items-center gap-1 px-2 py-1 rounded-md border-none bg-blue-400 text-white text-xs text-semibold cursor-pointer">
            <img src={plusIcon} alt="" className="w-12 h-12 filter-white" /> New
          </button>
        </div>
      </div>

      {gameStorylines.map(s => (
        <div key={`game-${s.uid}`} className="bg-secondary rounded-lg border-default p-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-bold text-primary flex-1 truncate">{s.name}</span>
            <span className={`text-xs px-2 py-0 rounded-sm text-bold ${s.furthered ? 'bg-green text-white' : 'bg-yellow text-dark-333'}`}>{s.furthered ? 'Active' : 'Dormant'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-secondary">
            <HeatBar pct={s.heat.pct} />
            {s.start_date && <span>Started {fmtDate(s.start_date)}</span>}
          </div>
        </div>
      ))}

      {planned.map(s => (
        <div key={`planned-${s.id}`} className="bg-secondary rounded-lg border-default p-3 flex flex-col gap-1 opacity-70">
          <div className="flex items-center gap-2">
            <span className="text-xs px-1 py-0 rounded-xs bg-purple text-white text-bold">Planned</span>
            <span className="text-sm text-bold text-primary flex-1 truncate">{s.name}</span>
            <span onClick={() => setEditing(s)} className="cursor-pointer w-20 h-20 rounded-sm bg-dark-muted flex-center" title="Edit"><span className="text-xs text-secondary">✎</span></span>
            <span onClick={() => setDeleting(s.id!)} className="cursor-pointer w-20 h-20 rounded-sm bg-delete flex-center" title="Delete"><img src={closeIcon} alt="" className="w-12 h-12 filter-red" /></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-secondary">
            <span>{(s.workers || []).length > 0 ? `${s.workers!.length} worker${s.workers!.length !== 1 ? 's' : ''}` : '0 workers'}</span>
            {s.created && <span>· Created {fmtDate(s.created)}</span>}
          </div>
        </div>
      ))}

      {gameStorylines.length === 0 && planned.length === 0 && (
        <div className="text-center text-muted text-sm p-5">No storylines found</div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-1001 flex-center bg-overlay">
          <div className="bg-primary rounded-lg p-3 border-default text-center">
            <div className="text-base text-primary mb-3">Delete this planned storyline?</div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDeleting(null)} className="px-3 py-1 rounded-md border-default bg-dark-muted text-secondary text-xs cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(deleting)} className="px-3 py-1 rounded-md border-none bg-red text-white text-xs text-semibold cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreatePlannedModal onClose={() => { setShowCreate(false); loadPlanned() }} />}
      {editing && <EditPlannedModal storyline={editing} onClose={() => { setEditing(null); loadPlanned() }} />}
    </div>
  )
}
