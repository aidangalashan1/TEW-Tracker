import { useState, useEffect } from 'react'
import { api } from '../../../api'
import { useApp } from '../../../context/AppContext'
import type { Worker, TagTeam, Stable } from '../../../api-types'

function MemberChip({ uid, name, picture, tag }: { uid: number; name: string; picture: string; tag?: string }) {
  const { img, navigateToEntity } = useApp()
  return (
    <div className="items-center gap-2 cursor-pointer" style={{ padding: '4px 8px' }} onClick={() => navigateToEntity('worker', uid)}>
      {picture ? (
        <img src={img('People/' + picture)} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} />
      ) : (
        <div style={{ width: 32, height: 32, background: 'var(--bg-tertiary)', borderRadius: 6 }} />
      )}
      <span className="text-md">{name}</span>
      {tag && <span className="text-xs text-muted">{tag}</span>}
    </div>
  )
}

/** Tag teams / stables / managers tab on the Worker List page. Tag teams and
 *  stables already come fully resolved (names/pictures) from the backend;
 *  "managerial clients" has no data path anywhere in the save-file queries
 *  today, so this only lists WHO is a manager, not who they manage. */
export function TeamsStablesTab({ fedUid, workers }: { fedUid: number; workers: Worker[] }) {
  const [tagTeams, setTagTeams] = useState<TagTeam[] | null>(null)
  const [stables, setStables] = useState<Stable[] | null>(null)

  useEffect(() => {
    setTagTeams(null)
    setStables(null)
    api.tagteams.list(fedUid).then(r => setTagTeams(r.teams)).catch(() => setTagTeams([]))
    api.stables.list(fedUid).then(r => setStables(r.stables)).catch(() => setStables([]))
  }, [fedUid])

  const managers = workers.filter(w => w.positions.includes('Manager'))

  if (tagTeams === null || stables === null) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  return (
    <div className="flex flex-col gap-4" style={{ padding: 20, overflow: 'auto' }}>
      <div>
        <div className="section-label mb-2">Tag Teams</div>
        {tagTeams.length === 0 && <div className="text-muted text-sm">No tag teams</div>}
        <div className="flex flex-col gap-1">
          {tagTeams.map(t => (
            <div key={t.uid} className="flex items-center gap-3" style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px' }}>
              <span className="text-md text-semibold" style={{ minWidth: 160 }}>{t.name}</span>
              <MemberChip uid={t.worker1} name={t.worker1_name} picture={t.worker1_picture} />
              <MemberChip uid={t.worker2} name={t.worker2_name} picture={t.worker2_picture} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="section-label mb-2">Stables</div>
        {stables.length === 0 && <div className="text-muted text-sm">No stables</div>}
        <div className="flex flex-col gap-1">
          {stables.map(s => (
            <div key={s.uid} className="flex items-center gap-3 flex-wrap" style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px' }}>
              <span className="text-md text-semibold" style={{ minWidth: 160 }}>{s.name}</span>
              {s.members.map(m => (
                <MemberChip key={m.uid} uid={m.uid} name={m.name} picture={m.picture} tag={m.leader ? 'Leader' : undefined} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="section-label mb-2">Managers</div>
        {managers.length === 0 && <div className="text-muted text-sm">No managers</div>}
        <div className="flex items-center gap-3 flex-wrap">
          {managers.map(m => (
            <MemberChip key={m.uid} uid={m.uid} name={m.name} picture={m.picture} />
          ))}
        </div>
      </div>
    </div>
  )
}
