import { useState, useMemo, useRef, useEffect } from 'react'
import { ModuleRenderProps } from '../types'
import { Worker } from '../../api'
import type { Belt } from '../../api'
import { RatingBadge } from '../../components/RatingDisplay'
import { WorkerImg } from '../../components/WorkerImg'
import { NavChip } from '../../components/NavChip'
import { useApp } from '../../context/AppContext'
import { fmtMoney } from '../../lib/money'
import { COLOR_HEEL } from '../../lib/colors'

function getEntertainmentAvg(w: Worker): number {
  const s = w.skills
  if (!s) return 0
  return Math.round((s.charisma.pct + s.mic.pct + s.acting.pct + s.star.pct) / 4)
}

function getPrimaryAvg(w: Worker): number {
  const s = w.skills
  if (!s) return 0
  return Math.round((s.brawl.pct + s.puroresu.pct + s.hardcore.pct + s.technical.pct + s.air.pct) / 5)
}

function getTalentScore(w: Worker): number {
  return Math.round((getEntertainmentAvg(w) + getPrimaryAvg(w)) / 2)
}

function sortWorkers(workers: Worker[]): Worker[] {
  return [...workers].sort((a, b) => {
    const popDiff = b.pop.pct - a.pop.pct
    if (popDiff !== 0) return popDiff
    return getTalentScore(b) - getTalentScore(a)
  })
}

function calcExpiry(gameDate: string | null, daysLeft: number): string {
  if (!gameDate || !daysLeft) return ''
  const d = new Date(gameDate)
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + daysLeft)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PRIMARY_STATS = [
  ['Brawling', 'brawl'],
  ['Puroresu', 'puroresu'],
  ['Hardcore', 'hardcore'],
  ['Technical', 'technical'],
  ['Aerial', 'air'],
] as const

function getHighestPrimary(w: Worker): { label: string; pct: number } | null {
  const s = w.skills
  if (!s) return null
  let best: { label: string; pct: number } | null = null
  for (const [label, key] of PRIMARY_STATS) {
    const val = s[key]?.pct ?? 0
    if (!best || val > best.pct) best = { label, pct: val }
  }
  return best
}



function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="items-center gap-1 text-xs">
      <span className="text-muted" style={{ minWidth: 48 }}>{label}</span>
      {children}
    </div>
  )
}

export function TopWorkersModule({ data, tier }: ModuleRenderProps<{ workers: Worker[]; belts: Belt[] }>) {
  const { gameInfo } = useApp()
  const [wrestlersOnly, setWrestlersOnly] = useState(true)
  const workers = useMemo(() => data?.workers || [], [data])
  const belts = useMemo(() => data?.belts || [], [data])
  const champMap = useMemo(() => {
    const m = new Map<number, { name: string; picture: string; uid: number }>()
    for (const b of belts) {
      if (b.holder1) m.set(b.holder1, { name: b.name, picture: b.picture, uid: b.uid })
      if (b.holder2) m.set(b.holder2, { name: b.name, picture: b.picture, uid: b.uid })
    }
    return m
  }, [belts])

  const ranked = useMemo(() => {
    let list = sortWorkers(workers)
    if (wrestlersOnly) list = list.filter(w => !w.non_wrestler && !w.retired && w.active)
    return list
  }, [workers, wrestlersOnly])

  const toggle = (
    <label className="items-center gap-1 text-sm cursor-pointer user-select-none" style={{ padding: '0 0 6px 0' }}>
      <span className={`toggle-track${wrestlersOnly ? ' active' : ''}`}
        onClick={() => setWrestlersOnly(p => !p)}
      >
        <span className="toggle-thumb" />
      </span>
      Wrestlers Only
    </label>
  )

  switch (tier) {
    case 'card':
      return <TopWorkersCard workers={ranked} />
    case 'small':
      return <TopWorkersSmall workers={ranked} wrestlersToggle={toggle} champMap={champMap} />
    case 'medium':
    case 'large':
      return <TopWorkersMedium workers={ranked} wrestlersToggle={toggle} gameDate={gameInfo?.current_date ?? null} champMap={champMap} />
    default:
      return null
  }
}

function TopWorkersCard({ workers }: { workers: Worker[] }) {
  const wrestlers = useMemo(() => workers.filter(w => !w.non_wrestler && !w.retired && w.active), [workers])
  const top4 = wrestlers.slice(0, 4)
  const { navigateToEntity } = useApp()
  const ref = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(10)
  const [imgSize, setImgSize] = useState(36)
  const maxNameLen = useMemo(() => Math.max(...top4.map(w => w.name.length), 1), [top4])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const calc = () => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (cw <= 0 || ch <= 0) return
      const itemW = Math.max(10, (cw - 1) / 2 - 6)
      const rowH = Math.max(10, (ch - 1) / 2 - 2)
      const img = Math.max(16, Math.min(Math.round(rowH * 0.55), Math.round(itemW * 0.55)))
      setImgSize(img)
      const fs = Math.max(8, Math.min(14, Math.floor(itemW / maxNameLen * 2.4)))
      setFontSize(fs)
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxNameLen])

  return (
    <div ref={ref} className="module-full flex flex-col gap-1px p-1">
      {[0, 1].map(row => (
        <div key={row} className="flex flex-1 gap-1px">
          {top4.slice(row * 2, row * 2 + 2).map(w => (
            <div key={w.uid} className="flex-1 flex-col flex-center bg-secondary rounded-lg border-default cursor-pointer min-w-0" style={{ padding: 3 }}
              onClick={() => navigateToEntity('worker', w.uid)}>
              <WorkerImg worker={w} size={imgSize} clickable={false} />
              <span className="text-semibold lh-1-15 text-primary text-center" style={{ fontSize, overflow: 'hidden', wordBreak: 'break-word', marginTop: 2 }}>{w.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function TopWorkersSmall({ workers, wrestlersToggle, champMap }: { workers: Worker[]; wrestlersToggle: React.ReactNode; champMap: Map<number, { name: string; picture: string; uid: number }> }) {
  const faces = useMemo(() => workers.filter(w => w.contract?.face).slice(0, 4), [workers])
  const heels = useMemo(() => workers.filter(w => w.contract && !w.contract.face).slice(0, 4), [workers])

  return (
    <div className="module-full">
      {wrestlersToggle}
      <div className="flex flex-row gap-2 flex-1 overflow-hidden">
        <StatColumn label="Babyfaces" accent="var(--accent-green)" bg="rgba(0,200,100,0.06)" workers={faces} imgSize={90} champMap={champMap} />
        <StatColumn label="Heels" accent="var(--accent)" bg="rgba(200,50,50,0.06)" workers={heels} imgSize={90} champMap={champMap} />
      </div>
    </div>
  )
}

function StatColumn({ label, accent, bg, workers, imgSize, champMap }: { label: string; accent: string; bg: string; workers: Worker[]; imgSize: number; champMap: Map<number, { name: string; picture: string; uid: number }> }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col rounded" style={{ background: bg, padding: '4px 6px' }}>
      <div className="text-semibold text-center text-md" style={{ color: accent, padding: '0 0 6px 0' }}>{label}</div>
      <div className="flex-1 overflow-auto flex flex-col gap-6px">
        {workers.map(w => <WorkerStatCard key={w.uid} worker={w} imgSize={imgSize} champ={champMap.get(w.uid)} />)}
      </div>
    </div>
  )
}

function WorkerStatCard({ worker, imgSize, champ }: { worker: Worker; imgSize: number; champ?: { name: string; picture: string; uid: number } }) {
  const primary = getHighestPrimary(worker)
  const ent = getEntertainmentAvg(worker)
  const { img, navigateToEntity } = useApp()
  const [beltErr, setBeltErr] = useState(false)
  const wl = worker.win_loss
  const showWl = wl != null
  const w = wl ?? { wins: 0, losses: 0 }
  const hasRecord = wl != null && wl.wins + wl.losses > 0
  return (
    <div className="bg-secondary rounded flex gap-6px" style={{ padding: 4 }}>
      <WorkerImg worker={worker} size={imgSize} />
      <div className="flex-1 min-w-0 flex flex-col gap-1px">
        <div className="truncate" style={{ marginBottom: 1 }}>
          <NavChip type="worker" id={worker.uid} label={worker.name} style={{ fontSize: 12, fontWeight: 600 }} />
        </div>
        {primary && <StatRow label="Primary"><RatingBadge rating={{ raw: primary.pct * 10, pct: primary.pct, grade: '' }} /></StatRow>}
        <StatRow label="Ent"><RatingBadge rating={{ raw: ent * 10, pct: ent, grade: '' }} /></StatRow>
        <StatRow label="Pop"><RatingBadge rating={worker.pop} /></StatRow>
      </div>
      {(showWl || champ) && (
        <div className="flex-col flex-center border-left min-w-80 gap-1" style={{ padding: '0 2px' }}>
          {showWl && (
            <div className="flex-col items-center">
              <span className="text-extrabold lh-1-1" style={{ fontSize: 14, color: hasRecord ? (w.wins > w.losses ? 'var(--accent-green)' : COLOR_HEEL) : 'var(--text-secondary)' }}>{w.wins}-{w.losses}</span>
              {hasRecord && <span className="text-muted text-micro">{Math.round(w.wins / (w.wins + w.losses) * 100)}%</span>}
            </div>
          )}
          {champ && (
            <div className="flex-col items-center cursor-pointer" onClick={() => navigateToEntity('belt', champ.uid)}>
              {champ.picture && !beltErr && <img src={img('Belts/' + champ.picture)} alt="" className="w-24 h-24 object-contain" onError={() => setBeltErr(true)} />}
              <span className="text-accent text-bold text-center lh-1-1 truncate text-micro" style={{ maxWidth: 56 }}>{champ.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TopWorkersMedium({ workers, wrestlersToggle, gameDate, champMap }: { workers: Worker[]; wrestlersToggle: React.ReactNode; gameDate: string | null; champMap: Map<number, { name: string; picture: string; uid: number }> }) {
  const faces = useMemo(() => workers.filter(w => w.contract?.face).slice(0, 8), [workers])
  const heels = useMemo(() => workers.filter(w => w.contract && !w.contract.face).slice(0, 8), [workers])

  return (
    <div className="module-full">
      {wrestlersToggle}
      <div className="flex flex-row gap-3 flex-1 overflow-hidden">
        <MediumColumn label="Babyfaces" accent="var(--accent-green)" bg="rgba(0,200,100,0.06)" workers={faces} gameDate={gameDate} champMap={champMap} />
        <MediumColumn label="Heels" accent="var(--accent)" bg="rgba(200,50,50,0.06)" workers={heels} gameDate={gameDate} champMap={champMap} />
      </div>
    </div>
  )
}

function MediumColumn({ label, accent, bg, workers, gameDate, champMap }: { label: string; accent: string; bg: string; workers: Worker[]; gameDate: string | null; champMap: Map<number, { name: string; picture: string; uid: number }> }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col rounded" style={{ background: bg, padding: '4px 6px' }}>
      <div className="text-semibold text-center text-md" style={{ color: accent, padding: '0 0 6px 0' }}>{label}</div>
      <div className="flex-1 overflow-auto flex flex-col gap-6px">
        {workers.map((w, i) => <MediumRow key={w.uid} worker={w} rank={i + 1} gameDate={gameDate} champName={champMap.get(w.uid)} />)}
      </div>
    </div>
  )
}

function MediumRow({ worker, rank, gameDate, champName }: { worker: Worker; rank: number; gameDate: string | null; champName?: { name: string; picture: string; uid: number } }) {
  const primary = getHighestPrimary(worker)
  const ent = getEntertainmentAvg(worker)
  const expiry = worker.contract ? calcExpiry(gameDate, worker.contract.days_left) : ''
  const { img, navigateToEntity } = useApp()
  const [beltErr, setBeltErr] = useState(false)
  const beltUrl = champName?.picture ? img('Belts/' + champName.picture) : ''
  const wl = worker.win_loss
  const hasRecord = wl != null && wl.wins + wl.losses > 0
  const showRecord = wl != null
  const w = wl ? wl : { wins: 0, losses: 0, draws: 0 }
  return (
    <div className="flex gap-6px" style={{ alignItems: 'stretch' }}>
      <div className="flex-center min-w-28">
        <span className="text-extrabold text-primary lh-1-1" style={{ fontSize: 20 }}>#{rank}</span>
      </div>
      <div className="flex-1 bg-secondary flex min-w-0 gap-2" style={{ padding: 6, borderRadius: 10 }}>
        <WorkerImg worker={worker} size={100} />
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1px">
          <div className="truncate">
            <NavChip type="worker" id={worker.uid} label={worker.name} style={{ fontSize: 13, fontWeight: 600 }} />
          </div>
          <div className="flex flex-col mt-1 gap-1px">
            {primary && <StatRow label="Primary"><RatingBadge rating={{ raw: primary.pct * 10, pct: primary.pct, grade: '' }} /></StatRow>}
            <StatRow label="Ent"><RatingBadge rating={{ raw: ent * 10, pct: ent, grade: '' }} /></StatRow>
            <StatRow label="Pop"><RatingBadge rating={worker.pop} /></StatRow>
          </div>
          <div className="items-center gap-2 text-sm text-secondary mt-1">
            {worker.contract && <span>Pay {fmtMoney(worker.contract.amount)}/mo</span>}
            {expiry && <span>Exp {expiry}</span>}
          </div>
        </div>
        {champName && (
          <div className="flex-col flex-center border-left cursor-pointer gap-1" style={{ minWidth: 80, padding: '0 4px' }} onClick={() => navigateToEntity('belt', champName.uid)}>
            {beltUrl && !beltErr && <img src={beltUrl} alt="" className="w-52 h-52 object-contain" onError={() => setBeltErr(true)} />}
            <span className="text-accent text-bold text-center lh-1-2 truncate text-xxs" style={{ maxWidth: 80 }}>{champName.name}</span>
          </div>
        )}
        {showRecord && (
          <div className="flex-col flex-center border-left gap-3px" style={{ minWidth: 64, padding: '0 4px' }}>
            <span className="text-extrabold lh-1-1" style={{ fontSize: 18, color: hasRecord ? (w.wins > w.losses ? 'var(--accent-green)' : COLOR_HEEL) : 'var(--text-secondary)' }}>{w.wins}-{w.losses}</span>
            {hasRecord && <span className="text-muted text-medium text-xxs">{Math.round(w.wins / (w.wins + w.losses) * 100)}%</span>}
          </div>
        )}
      </div>
    </div>
  )
}
