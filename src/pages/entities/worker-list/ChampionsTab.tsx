import { useState, useEffect, useMemo } from 'react'
import { api } from '../../../api'
import { useApp } from '../../../context/AppContext'
import type { Worker, Belt, BeltHistoryGroup } from '../../../api-types'
import faceIcon from '../../../assets/UI icons/face.png'
import heelIcon from '../../../assets/UI icons/heel.png'
import starIcon from '../../../assets/UI icons/star.png'
import { COLOR_FACE, COLOR_HEEL } from '../../../lib/colors'

function parseDate(s: string): Date | null {
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]))
  const dmy2 = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (dmy2) return new Date(2000 + parseInt(dmy2[3]), parseInt(dmy2[2]) - 1, parseInt(dmy2[1]))
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))
  return null
}

function daysBetween(from: string, to: string): number {
  const a = parseDate(from)
  const b = parseDate(to)
  if (!a || !b) return 0
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function fmtDate(dd: string): string {
  const dt = parseDate(dd)
  if (!dt) return dd
  const d = dt.getDate(), m = dt.getMonth() + 1, y = dt.getFullYear()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const suffix = d >= 11 && d <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][d % 10]
  return `${d}${suffix} ${months[m - 1]} ${y}`
}

function HolderCard({ worker }: { worker: Worker }) {
  const { img, navigateToEntity } = useApp()
  const isFace = worker.contract?.face
  const picUrl = (worker.contract?.picture || worker.picture)
    ? img('People/' + (worker.contract?.picture || worker.picture))
    : ''
  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer" style={{ width: 120 }} onClick={() => navigateToEntity('worker', worker.uid)}>
      {picUrl ? (
        <img src={picUrl} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
      ) : (
        <div style={{ width: 100, height: 100, background: 'var(--bg-tertiary)', borderRadius: 8 }} />
      )}
      <span className="text-xs text-semibold text-center" style={{ lineHeight: 1.2 }}>{worker.name}</span>
      {isFace != null && (
        <div className="flex items-center gap-1">
          <span className="inline-block" style={{ width: 12, height: 12, backgroundColor: isFace ? COLOR_FACE : COLOR_HEEL, mask: `url(${isFace ? faceIcon : heelIcon}) center/contain no-repeat`, WebkitMask: `url(${isFace ? faceIcon : heelIcon}) center/contain no-repeat` }} />
          <span className="text-xs" style={{ color: isFace ? COLOR_FACE : COLOR_HEEL }}>{isFace ? 'Face' : 'Heel'}</span>
        </div>
      )}
      {worker.current_stars > 0 && (() => {
        const iw = !worker.retired && (worker.positions.includes('Wrestler') || worker.positions.includes('Occasional'))
        const cls = iw ? 'filter-star-gold' : 'filter-star-silver'
        return (
          <span className="inline-flex items-center" style={{ gap: 1 }}>
            {Array.from({ length: 5 }, (_, i) => {
              const remainder = worker.current_stars - i
              if (remainder >= 1) return <img key={i} src={starIcon} alt="" className={`w-14 h-14 ${cls}`} />
              if (remainder >= 0.5) return (
                <span key={i} className="relative inline-block" style={{ width: 14, height: 14 }}>
                  <img src={starIcon} alt="" className="w-14 h-14 absolute inset-0 filter-dark-30" />
                  <span className="absolute inset-0 overflow-hidden flex items-center" style={{ width: '50%' }}>
                    <img src={starIcon} alt="" className={`w-14 h-14 ${cls}`} />
                  </span>
                </span>
              )
              return <img key={i} src={starIcon} alt="" className="w-14 h-14 filter-dark-30" />
            })}
          </span>
        )
      })()}
    </div>
  )
}

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
              {e.captured && e.lost ? `${daysBetween(e.captured, e.lost)}d ` : ''}
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
  const [belts, setBelts] = useState<Belt[] | null>(null)
  const [history, setHistory] = useState<BeltHistoryGroup[] | null>(null)
  const [activeOnly, setActiveOnly] = useState(true)

  useEffect(() => {
    setBelts(null)
    setHistory(null)
    api.fed.belts(fedUid).then(r => setBelts(r.belts)).catch(() => setBelts([]))
    api.fed.beltHistory(fedUid).then(r => setHistory(r.history)).catch(() => setHistory([]))
  }, [fedUid])

  const workerMap = useMemo(() => new Map(workers.map(w => [w.uid, w])), [workers])

  const historyMap = useMemo(() => {
    if (!history) return new Map<number, BeltHistoryGroup>()
    return new Map(history.map(g => [g.belt_uid, g]))
  }, [history])

  const visibleBelts = useMemo(() => {
    if (!belts) return null
    let list = activeOnly ? belts.filter(b => b.active) : [...belts]
    if (!activeOnly) {
      list.sort((a, b) => {
        if (a.active && !b.active) return -1
        if (!a.active && b.active) return 1
        return 0
      })
    }
    return list
  }, [belts, activeOnly])

  if (belts === null || history === null) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

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
                      <HolderCard worker={holder1!} />
                      {isMultiHolder && holder2 && <HolderCard worker={holder2} />}
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
