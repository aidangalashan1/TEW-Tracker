import { useState, useEffect } from 'react'
import { api } from '../api'

interface Profile {
  id: string; name: string; mdbPath: string; imagePath: string;
}

interface ProfileManagerProps {
  onSwitch: () => void
}

export function ProfileManager({ onSwitch }: ProfileManagerProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')

  const refresh = () => {
    setLoading(true)
    api.profiles.list().then(r => { setProfiles(r.profiles); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const handleAdd = async () => {
    if (!newName.trim() || !newPath.trim()) return
    try {
      await api.profiles.create(newName.trim(), newPath.trim())
      setNewName(''); setNewPath('')
      refresh()
    } catch {}
  }

  const handleSwitch = async (p: Profile) => {
    try {
      await api.profiles.switch(p.id)
      if (p.imagePath) await api.images.setPath(p.imagePath)
      onSwitch()
      window.location.reload()
    } catch { alert('Failed to switch profile') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this profile?')) return
    try { await api.profiles.delete(id); refresh() } catch {}
  }

  return (
    <div>
      {profiles.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Saved Games</div>
          {profiles.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 4, background: 'var(--bg-secondary)', borderRadius: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.mdbPath}</div>
              </div>
              <button className="btn primary" onClick={() => handleSwitch(p)} style={{ padding: '4px 10px', fontSize: 11 }}>Load</button>
              <button className="btn" onClick={() => handleDelete(p.id)} style={{ padding: '4px 10px', fontSize: 11, color: '#e55' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Profile name..." style={{
          flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)', color: '#fff', fontSize: 13, outline: 'none',
        }} />
        <input value={newPath} onChange={e => setNewPath(e.target.value)} placeholder="Full path to .mdb file..." style={{
          flex: 2, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)', color: '#fff', fontSize: 13, outline: 'none',
        }} />
        <button className="btn primary" onClick={handleAdd}>Save</button>
      </div>
    </div>
  )
}
