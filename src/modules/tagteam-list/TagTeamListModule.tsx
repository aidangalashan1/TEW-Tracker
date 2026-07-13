import { useState, useMemo } from 'react'
import { TagTeam } from '../../api'
import { useApp } from '../../context/AppContext'
import type { ModuleRenderProps } from '../types'
import { RatingBadge } from '../../components/RatingDisplay'

function WorkerPortrait({ uid, name, picture, img, navigateToEntity }: {
  uid: number; name: string; picture: string;
  img: (p: string) => string; navigateToEntity: (t: string, id: number) => void
}) {
  const url = picture ? img('People/' + picture) : ''
  const [err, setErr] = useState(false)
  return (
    <div className="flex-col items-center gap-1 cursor-pointer" onClick={() => navigateToEntity('worker', uid)}>
      {url && !err ? (
        <img src={url} alt="" className="w-70 h-70 object-cover rounded-lg" onError={() => setErr(true)} />
      ) : (
        <div className="w-70 h-70 bg-darker rounded-lg" />
      )}
      <span className="text-xs text-primary text-center lh-1-2 truncate w-70">{name}</span>
    </div>
  )
}

export function TagTeamListModule({ data, tier }: ModuleRenderProps<{teams: TagTeam[]}>) {
  const { img, navigateToEntity } = useApp()
  const teams = useMemo(() => data?.teams || [], [data])
  const [showInactive, setShowInactive] = useState(false)
  const [sortKey, setSortKey] = useState<'experience' | 'pop' | 'name'>('experience')

  const filtered = useMemo(() => {
    const list = showInactive ? teams : teams.filter(t => t.active)
    return [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'pop') return (b.pop || 0) - (a.pop || 0)
      return (b.experience || 0) - (a.experience || 0)
    })
  }, [teams, showInactive, sortKey])

  if (!data) return <div className="loading p-5 text-center text-muted">Loading...</div>
  if (teams.length === 0) return <div className="p-5 text-center text-muted">No tag teams found</div>

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full overflow-auto p-1 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase px-1">Tag Teams</div>
        {filtered.map(t => (
          <div key={t.uid} className="flex items-center gap-1 p-1 bg-secondary rounded border-default cursor-pointer" onClick={() => navigateToEntity('worker', t.worker1)}>
            <span className="text-xs text-primary flex-1 truncate">{t.name}</span>
            <span className="text-xxs text-muted truncate">{t.worker1_name}/{t.worker2_name}</span>
            <span className="text-xxs text-bold text-mono w-20 text-right">{t.experience}</span>
          </div>
        ))}
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1">
        <div className="flex items-center gap-2 px-1 text-xxs text-bold text-muted text-uppercase mb-1">
          <span className="flex-1">Team</span>
          <span className="w-40 text-center">Exp</span>
          <span className="w-40 text-center">Pop</span>
        </div>
        {filtered.map(t => (
          <div key={t.uid} className="flex items-center gap-2 p-1 bg-secondary rounded border-default text-xs text-primary">
            <span className="flex-1 truncate">{t.name}</span>
            <span className="w-40 text-center text-secondary">{t.experience}</span>
            <span className="w-40 text-center text-secondary">{t.pop > 0 ? `${Math.round(t.pop / 10)}%` : '—'}</span>
          </div>
        ))}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-3 gap-2">
        <div className="flex items-center gap-2 px-1 text-xxs text-muted">
          <span className="flex-1">Name</span>
          <span className="w-50 text-center">Members</span>
          <span className="w-36 text-center">Exp</span>
          <span className="w-36 text-center">Pop</span>
          <span className="w-36 text-center">Momentum</span>
        </div>
        {filtered.map(t => (
          <div key={t.uid} className="flex items-center gap-2 px-1 py-1 bg-secondary rounded border-default text-xs text-primary">
            <span className="flex-1 truncate">{t.name}</span>
            <span className="w-50 text-center text-xxs text-secondary truncate">{t.worker1_name}/{t.worker2_name}</span>
            <span className="w-36 text-center text-secondary">{t.experience}</span>
            <span className="w-36 text-center text-secondary">{t.pop > 0 ? `${Math.round(t.pop / 10)}%` : '—'}</span>
            <span className="w-36 text-center text-secondary">{t.momentum > 0 ? `${t.momentum}%` : '—'}</span>
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
        <div className="flex items-center gap-1 text-xs text-secondary ml-auto">
          {(['experience', 'pop', 'name'] as const).map(k => (
            <div key={k} onClick={() => setSortKey(k)}
              className={`px-2 py-0 rounded-md cursor-pointer ${sortKey === k ? 'bg-blue-400 text-primary' : 'bg-dark-muted text-secondary'}`}>
              {k === 'experience' ? 'Exp' : k === 'pop' ? 'Pop' : 'Name'}{sortKey === k ? ' ▼' : ''}
            </div>
          ))}
        </div>
        <span className="text-xs text-secondary">{filtered.length} team{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {filtered.map(t => (
          <div key={t.uid} className="flex-col bg-secondary rounded-lg border-default overflow-hidden" style={{ opacity: t.active ? 1 : 0.45 }}>
            <div className="flex items-center gap-3 p-3">
              <WorkerPortrait uid={t.worker1} name={t.worker1_name} picture={t.worker1_picture} img={img} navigateToEntity={navigateToEntity} />
              <div className="flex-col items-center gap-1 flex-1 min-w-0">
                <div className="text-sm text-bold text-primary text-center truncate w-full">{t.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>Exp: {t.experience}</span>
                  {t.pop > 0 && <span>Pop: {Math.round(t.pop / 10)}%</span>}
                </div>
                {t.momentum > 0 && (
                  <div className="text-xs text-muted">Momentum: <RatingBadge rating={{ raw: t.momentum * 10, pct: t.momentum, grade: '' }} /></div>
                )}
              </div>
              <WorkerPortrait uid={t.worker2} name={t.worker2_name} picture={t.worker2_picture} img={img} navigateToEntity={navigateToEntity} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
