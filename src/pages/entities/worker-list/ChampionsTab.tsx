import { useState, useEffect, useMemo } from 'react'
import { api } from '../../../api'
import { useApp } from '../../../context/AppContext'
import type { Worker, Belt } from '../../../api-types'

function HolderChip({ worker }: { worker: Worker | undefined }) {
  const { img, navigateToEntity } = useApp()
  if (!worker) return null
  return (
    <div className="items-center gap-2 cursor-pointer" style={{ padding: '4px 8px' }} onClick={() => navigateToEntity('worker', worker.uid)}>
      {worker.picture ? (
        <img src={img('People/' + worker.picture)} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} />
      ) : (
        <div style={{ width: 32, height: 32, background: 'var(--bg-tertiary)', borderRadius: 6 }} />
      )}
      <span className="text-md">{worker.name}</span>
    </div>
  )
}

/** Champions tab on the Worker List page. holder1/holder2 on a Belt are raw
 *  worker uids — the backend doesn't resolve them to names, so this builds
 *  its own uid lookup from the roster already fetched for the Workers tab
 *  rather than re-fetching the whole roster again. */
export function ChampionsTab({ fedUid, workers }: { fedUid: number; workers: Worker[] }) {
  const { img } = useApp()
  const [belts, setBelts] = useState<Belt[] | null>(null)

  useEffect(() => {
    setBelts(null)
    api.fed.belts(fedUid).then(r => setBelts(r.belts)).catch(() => setBelts([]))
  }, [fedUid])

  const workerMap = useMemo(() => new Map(workers.map(w => [w.uid, w])), [workers])

  if (belts === null) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  return (
    <div className="flex flex-col gap-1" style={{ padding: 20, overflow: 'auto' }}>
      {belts.length === 0 && <div className="text-muted text-sm">No belts</div>}
      {belts.map(b => {
        const isMultiHolder = b.style === 'Tag Team' || b.style === 'Trios'
        const holder1 = workerMap.get(b.holder1)
        const holder2 = workerMap.get(b.holder2)
        const vacant = b.holder1 === 0 && (!isMultiHolder || b.holder2 === 0)
        return (
          <div key={b.uid} className="flex items-center gap-3 flex-wrap" style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px' }}>
            {b.picture && <img src={img('Belts/' + b.picture)} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />}
            <span className="text-md text-semibold" style={{ minWidth: 220 }}>{b.name}</span>
            <span className="text-xs text-muted" style={{ minWidth: 80 }}>{b.style}</span>
            {vacant ? (
              <span className="text-sm text-muted">Vacant</span>
            ) : (
              <>
                <HolderChip worker={holder1} />
                {isMultiHolder && <HolderChip worker={holder2} />}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
