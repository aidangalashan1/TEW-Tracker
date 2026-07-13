import { useState, useMemo } from 'react'
import { Stable } from '../../api'
import { useApp } from '../../context/AppContext'
import type { ModuleRenderProps } from '../types'

function MemberCard({ uid, name, picture, leader, img, navigateToEntity }: {
  uid: number; name: string; picture: string; leader: boolean;
  img: (p: string) => string; navigateToEntity: (t: string, id: number) => void
}) {
  const url = picture ? img('People/' + picture) : ''
  const [err, setErr] = useState(false)
  return (
    <div className="flex-col items-center gap-1 cursor-pointer" style={{ width: 64 }}
      onClick={() => navigateToEntity('worker', uid)}>
      {url && !err ? (
        <img src={url} alt="" className="w-52 h-52 object-cover rounded-lg" onError={() => setErr(true)} />
      ) : (
        <div className="w-52 h-52 bg-darker rounded-lg" />
      )}
      <span className="text-xxs text-primary text-center lh-1-2 truncate w-60">
        {name}{leader ? <span className="text-yellow text-bold ml-1">(L)</span> : ''}
      </span>
    </div>
  )
}

export function StableListModule({ data, tier }: ModuleRenderProps<{stables: Stable[]}>) {
  const { img, navigateToEntity } = useApp()
  const stables = useMemo(() => data?.stables || [], [data])
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    if (showInactive) return stables
    return stables.filter(s => s.active)
  }, [stables, showInactive])

  if (!data) return <div className="loading p-5 text-center text-muted">Loading...</div>
  if (stables.length === 0) return <div className="p-5 text-center text-muted">No stables found</div>

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full overflow-auto p-1 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase px-1">Stables ({filtered.length})</div>
        {filtered.map(s => (
          <div key={s.uid} className="flex items-center gap-2 p-1 bg-secondary rounded border-default text-xs text-primary">
            <span className="flex-1 truncate">{s.name}</span>
            <span className="text-xxs text-secondary">{s.members.length} members</span>
          </div>
        ))}
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase mb-1 px-1">Stables ({filtered.length})</div>
        {filtered.map(s => (
          <div key={s.uid} className="flex items-center gap-2 p-1 bg-secondary rounded border-default text-xs text-primary">
            <span className="flex-1 truncate">{s.name}</span>
            <span className="text-xxs text-secondary">{s.members.length} members</span>
            <span className={`text-xxs px-1 py-0 rounded-xs text-bold ${s.active ? 'bg-green text-white' : 'bg-dark-muted text-secondary'}`}>{s.active ? 'Active' : 'Inactive'}</span>
          </div>
        ))}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-2">
        <div className="text-xs text-bold text-muted text-uppercase mb-1">Stables</div>
        {filtered.map(s => (
          <div key={s.uid} className="bg-secondary rounded-lg border-default overflow-hidden">
            <div className="bg-darker px-3 py-2 border-default-bottom flex items-center">
              <span className="text-sm text-bold text-primary flex-1">{s.name}</span>
              <span className="text-xxs text-secondary">{s.members.length} members</span>
            </div>
            <div className="flex flex-wrap gap-1 p-2 justify-center">
              {s.members.slice(0, 6).map(m => (
                <div key={m.uid} className="flex-col items-center cursor-pointer min-w-40" onClick={() => navigateToEntity('worker', m.uid)}>
                  {m.picture ? <img src={img('People/' + m.picture)} alt="" className="w-36 h-36 object-cover rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} /> : <div className="w-36 h-36 bg-darker rounded" />}
                  <span className="text-xxs text-primary text-center truncate w-40">{m.name}{m.leader ? ' (L)' : ''}</span>
                </div>
              ))}
              {s.members.length > 6 && <span className="text-xxs text-muted w-full text-center py-1">+{s.members.length - 6} more</span>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto p-3 gap-3">
      <div className="flex items-center gap-2">
        <label className="items-center gap-1 text-sm cursor-pointer user-select-none">
          <span className={`toggle-track${showInactive ? ' active' : ''}`} onClick={() => setShowInactive(p => !p)}>
            <span className="toggle-thumb" />
          </span>
          Show inactive
        </label>
        <span className="text-xs text-secondary ml-auto">{filtered.length} stable{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {filtered.map(s => (
          <div key={s.uid} className="flex-col bg-secondary rounded-lg border-default overflow-hidden" style={{ opacity: s.active ? 1 : 0.45 }}>
            <div className="bg-darker px-3 py-2 border-default-bottom">
              <div className="text-sm text-bold text-primary text-center">{s.name}</div>
              <div className="text-xxs text-secondary text-center">{s.members.length} member{s.members.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="flex flex-wrap gap-2 p-3 justify-center">
              {s.members.map(m => (
                <MemberCard key={m.uid} uid={m.uid} name={m.name} picture={m.picture} leader={m.leader} img={img} navigateToEntity={navigateToEntity} />
              ))}
              {s.members.length === 0 && <span className="text-sm text-muted p-2">No members</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
