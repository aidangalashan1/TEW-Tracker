import React, { useEffect } from 'react'
import { ModuleRenderProps } from '../types'
import { Worker } from '../../api'
import { useApp } from '../../context/AppContext'
import { WorkerListColumnTable } from './WorkerListTable'
import { WorkerImg } from '../../components/WorkerImg'
import { calcCurrentScore, starsFromScore } from '../../lib/scoring'
import faceIcon from '../../assets/UI icons/face.png'
import heelIcon from '../../assets/UI icons/heel.png'

function WorkerDot({ w }: { w: Worker }) {
  const { navigateToEntity } = useApp()
  const score = calcCurrentScore(w)
  const stars = score ? starsFromScore(score) : 0
  const isFace = w.contract?.face
  return (
    <div className="flex-col items-center cursor-pointer min-w-0" style={{ flex: '0 0 44px' }} onClick={() => navigateToEntity('worker', w.uid)}>
      <div className="relative">
        <WorkerImg worker={w} size={28} clickable={false} />
        {isFace != null && (
          <span style={{ position: 'absolute', bottom: -2, right: -2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: isFace ? '#22c55e' : '#ef4444', border: '1px solid var(--bg-primary)' }}
            data-tooltip={isFace ? 'Face' : 'Heel'}>
            <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#fff', mask: `url(${isFace ? faceIcon : heelIcon}) center/contain no-repeat`, WebkitMask: `url(${isFace ? faceIcon : heelIcon}) center/contain no-repeat` }} />
          </span>
        )}
      </div>
      <span className="text-xxs text-primary text-center truncate w-full mt-1">{w.short_name || w.name}</span>
      {stars > 0 && <span className="text-xxs leading-none mt-1" data-tooltip={`${Math.round(stars * 2)}/10`} style={{ color: stars >= 4 ? '#60a5fa' : stars >= 3 ? '#22c55e' : stars >= 2 ? '#f59e0b' : '#ef4444' }}>{'★'.repeat(Math.round(stars))}</span>}
    </div>
  )
}

function WorkerRow({ w, compact }: { w: Worker; compact?: boolean }) {
  const { navigateToEntity } = useApp()
  const score = calcCurrentScore(w)
  const stars = score ? starsFromScore(score) : 0
  const filled = Math.round(stars)
  const isFace = w.contract?.face
  return (
    <div className="flex items-center gap-2 p-1 bg-secondary rounded border-default cursor-pointer" onClick={() => navigateToEntity('worker', w.uid)}>
      <WorkerImg worker={w} size={compact ? 22 : 28} clickable={false} />
      <span className="text-xs text-primary flex-1 truncate">{w.name}</span>
      {!compact && <span className="text-xxs text-secondary w-24 text-right">{w.positions[0] || '—'}</span>}
      {!compact && <span className="text-xxs text-bold text-mono w-20 text-right" data-tooltip="Popularity" style={{ color: (w.pop?.pct || 0) >= 80 ? '#60a5fa' : (w.pop?.pct || 0) >= 60 ? '#22c55e' : (w.pop?.pct || 0) >= 40 ? '#f59e0b' : '#ef4444' }}>{w.pop?.pct || 0}%</span>}
      {isFace != null && (
        <span className="inline-flex items-center gap-1" data-tooltip={isFace ? 'Face' : 'Heel'}>
          <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: isFace ? '#22c55e' : '#ef4444', mask: `url(${isFace ? faceIcon : heelIcon}) center/contain no-repeat`, WebkitMask: `url(${isFace ? faceIcon : heelIcon}) center/contain no-repeat` }} />
          {!compact && <span className="text-xxs" style={{ color: isFace ? '#22c55e' : '#ef4444' }}>{isFace ? 'Face' : 'Heel'}</span>}
        </span>
      )}
      {stars > 0 && <span className="text-xs w-32 text-right flex-shrink-0" data-tooltip={`${Math.round(stars * 2)}/10`} style={{ color: stars >= 4 ? '#60a5fa' : stars >= 3 ? '#22c55e' : stars >= 2 ? '#f59e0b' : '#ef4444' }}>{'★'.repeat(filled)}</span>}
    </div>
  )
}

export function WorkerListModule({ data, tier, config, onConfigChange }: ModuleRenderProps<{fed_uid: number; workers: Worker[]}>) {
  const { setWorkerRoster } = useApp()
  const workers = data?.workers || []
  useEffect(() => {
    if (workers.length > 0) setWorkerRoster(workers.map(w => w.uid))
  }, [workers])

  if (workers.length === 0) return <div className="loading p-5 text-center text-muted">No workers</div>

  if (tier === 'card') {
    return (
      <div className="flex flex-col h-full overflow-auto p-1 gap-1">
        <div className="text-xxs text-bold text-muted text-uppercase px-1">Roster ({workers.length})</div>
        <div className="flex flex-row flex-wrap gap-1">
          {workers.map(w => <WorkerDot key={w.uid} w={w} />)}
        </div>
      </div>
    )
  }

  if (tier === 'small') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1px">
        <div className="text-xxs text-bold text-muted text-uppercase px-1 mb-1">Roster ({workers.length})</div>
        {workers.map(w => <WorkerRow key={w.uid} w={w} compact />)}
      </div>
    )
  }

  if (tier === 'medium') {
    return (
      <div className="flex flex-col h-full overflow-auto p-2 gap-1px">
        <div className="text-xs text-bold text-muted text-uppercase px-1 mb-1">Roster ({workers.length})</div>
        {workers.map(w => <WorkerRow key={w.uid} w={w} />)}
      </div>
    )
  }

  return <WorkerListColumnTable workers={workers} config={config} onConfigChange={onConfigChange} />
}
