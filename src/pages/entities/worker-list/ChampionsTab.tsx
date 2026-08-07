import { useMemo } from 'react'
import { api } from '../../../api'
import { useApp } from '../../../context/AppContext'
import useSWR from '../../../hooks/useApi'
import { usePersistedState } from '../../../hooks/usePersistedState'
import type { Worker, Belt, BeltHistoryGroup } from '../../../api-types'
import { fmtFlexibleDateOrdinal, daysBetweenFlexible } from '../../../lib/dates'
import { MemberCard } from './MemberCard'

const fmtDate = fmtFlexibleDateOrdinal
const daysBetween = daysBetweenFlexible

function HistoryCard({ group }: { group: BeltHistoryGroup }) {
  const { img } = useApp()
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px', marginTop: 6 }}>
      <div className="mb-1" style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
        Last 5 Champions
      </div>
      <div className="flex flex-col gap-1">
        {group.entries.map((e, i) => (
          <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, padding: '3px 4px', borderRadius: 4, background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
            <div className="flex items-center gap-1" style={{ minWidth: 0, flex: 1 }}>
              {e.holders.filter(h => h.name).map(h => (
                <span key={h.uid}>
                  {h.picture && <img src={img('People/' + h.picture)} alt="" style={{ width: 20, height: 20, objectFit: 'cover', borderRadius: 4, verticalAlign: 'middle' }} />}
                </span>
              ))}
              <span className="text-semibold" style={{ color: 'var(--text-primary)' }}>
                {e.team_name || e.holders.filter(h => h.name).map(h => h.name).join(' & ')}
              </span>
            </div>
            <span className="text-xs" style={{ whiteSpace: 'nowrap', color: '#fff' }}>
              {e.captured && e.lost ? `${daysBetween(e.captured, e.lost)} days ` : ''}
              {e.captured ? fmtDate(e.captured) : '?'}
              {' - '}
              {e.lost ? fmtDate(e.lost) : 'Present'}
            </span>
            {e.defences != null && <span className="text-xs" style={{ whiteSpace: 'nowrap', color: '#fff' }}>{e.defences} def.</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Champions tab on the Worker List page. */
export function ChampionsTab({ fedUid, workers }: { fedUid: number; workers: Worker[] }) {
  const { img, navigateToEntity } = useApp()
  const { data: beltsData, isLoading: beltsLoading } = useSWR('fed-belts-' + fedUid, () => api.fed.belts(fedUid))
  const { data: historyData, isLoading: historyLoading } = useSWR('belt-history-' + fedUid, () => api.fed.beltHistory(fedUid))
  const belts: Belt[] | null = beltsData?.belts ?? null
  const history: BeltHistoryGroup[] | null = historyData?.history ?? null
  const [activeOnly, setActiveOnly] = usePersistedState('tew-champions-activeOnly', true)

  const workerMap = useMemo(() => new Map(workers.map(w => [w.uid, w])), [workers])

  const historyMap = useMemo(() => {
    if (!history) return new Map<number, BeltHistoryGroup>()
    return new Map(history.map(g => [g.belt_uid, g]))
  }, [history])

  const visibleBelts = useMemo(() => {
    if (!belts) return null
    const list = activeOnly ? belts.filter(b => b.active) : [...belts]
    if (!activeOnly) {
      list.sort((a, b) => {
        if (a.active && !b.active) return -1
        if (!a.active && b.active) return 1
        return 0
      })
    }
    return list
  }, [belts, activeOnly])

  if (beltsLoading || historyLoading || belts === null || history === null) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  return (
    <div style={{ height: '100%', padding: 20, overflow: 'auto', boxSizing: 'border-box' }}>
      <div className="flex justify-end items-center mb-2">
        <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, userSelect: 'none' }}
          onClick={() => setActiveOnly(p => !p)}>
          <div className={`toggle-track ${activeOnly ? 'active' : ''}`}>
            <div className="toggle-thumb" />
          </div>
          <span>Active only</span>
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
        {visibleBelts && visibleBelts.length === 0 && <div className="text-muted text-sm">No belts</div>}
        {visibleBelts && visibleBelts.map(b => {
          const isMultiHolder = b.style === 'Tag Team' || b.style === 'Trios'
          const holder1 = workerMap.get(b.holder1)
          const holder2 = workerMap.get(b.holder2)
          const vacant = b.holder1 === 0 && (!isMultiHolder || b.holder2 === 0)
          const beltHistory = historyMap.get(b.uid)
          return (
            <div key={b.uid}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px', display: 'flex', flexDirection: 'column', opacity: b.active ? undefined : 0.4 }}>
                <div className="text-center mb-1">
                  <div className="text-lg text-bold cursor-pointer" onClick={() => navigateToEntity('belt', b.uid)}>{b.name}</div>
                  <div className="text-xs text-muted">{b.style}</div>
                </div>
                {b.picture && <div className="text-center mb-2 cursor-pointer" onClick={() => navigateToEntity('belt', b.uid)}><img src={img('Belts/' + b.picture)} alt="" style={{ objectFit: 'contain' }} /></div>}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
                  {vacant ? (
                    <span className="text-sm text-muted">Vacant</span>
                  ) : (
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <MemberCard worker={holder1!} />
                      {isMultiHolder && holder2 && <MemberCard worker={holder2} />}
                    </div>
                  )}
                </div>
              </div>
              {beltHistory && beltHistory.entries.length > 0 && <HistoryCard group={beltHistory} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
