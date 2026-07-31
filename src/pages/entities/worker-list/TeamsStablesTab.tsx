import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../../api'
import { useApp } from '../../../context/AppContext'
import { PERCEPTION_LABELS } from '../../../lib/labels'
import type { Worker, TagTeam, Stable, Belt } from '../../../api-types'
import filterIcon from '../../../assets/UI icons/filter.png'
import {
  buildDimOptions, orderDims, GROUP_ORDER,
  type SubgroupDef, type SubgroupFilter,
} from '../../../modules/worker-list/workerListGrouping'
import { FilterPanel } from '../../../modules/worker-list/FilterPanel'
import { SubgroupEditor } from '../../../modules/worker-list/SubgroupEditor'
import {
  getAllBrands, buildFilterDimensions,
  type FilterRule, type DimDef,
} from '../../../modules/worker-list/workerListFilters'
import { MemberCard } from './MemberCard'

function getPerceptionScore(w: Worker): number {
  return (w.contract as any)?.PerceptionScore ?? 0
}

function getTeamGroupKey(members: Worker[], dim: string): string {
  if (dim === 'disposition') {
    const faces = members.filter(w => w.contract?.face)
    const heels = members.filter(w => w.contract && !w.contract.face)
    if (faces.length > 0 && heels.length === 0) return 'Face'
    if (heels.length > 0 && faces.length === 0) return 'Heel'
    if (faces.length > 0 && heels.length > 0) return 'Mixed'
    return 'Unknown'
  }
  if (dim === 'role') {
    if (members.some(w => !w.non_wrestler)) return 'Wrestler'
    return 'Non-Wrestler'
  }
  if (dim === 'gender') {
    const set = new Set(members.map(w => w.gender))
    if (set.size === 1) return members[0].gender
    return 'Mixed'
  }
  if (dim === 'brand') {
    const brands = members.map(w => (w as any).contract?.brand).filter((b: number) => b != null)
    if (brands.length === 0) return 'No Brand'
    return `Brand ${brands[0]}`
  }
  if (dim === 'perception') {
    const percs = members.map(w => (w.contract as any)?.Perception ?? 0)
    if (percs.length === 0) return 'Unknown'
    const avg = Math.round(percs.reduce((a: number, b: number) => a + b, 0) / percs.length)
    return PERCEPTION_LABELS[avg] || 'Unknown'
  }
  return ''
}

function groupCards<T>(items: T[], getMembers: (item: T) => Worker[], dims: string[]): [string, T[]][] {
  if (dims.length === 0) return [['', items]]
  const map = new Map<string, T[]>()
  for (const item of items) {
    const members = getMembers(item)
    const key = dims.map(d => getTeamGroupKey(members, d)).join(' › ')
    const arr = map.get(key) || []
    arr.push(item)
    map.set(key, arr)
  }
  const lastDim = dims[dims.length - 1]
  const order = GROUP_ORDER[lastDim]
  return Array.from(map.entries()).sort((a, b) => {
    if (order && order.length > 0) {
      const ai = order.indexOf(a[0])
      const bi = order.indexOf(b[0])
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    }
    return a[0].localeCompare(b[0])
  })
}

/** Renders member worker cards inline. */
function MembersGrouped({ members, champMap, beltStyle }: { members: Worker[]; champMap: Map<number, Belt[]>; beltStyle?: string }) {
  return <>{members.map(w => {
    const all = champMap.get(w.uid)
    const belts = beltStyle ? all?.filter(b => b.style === beltStyle) : all
    return <MemberCard key={w.uid} worker={w} belts={belts} />
  })}</>
}

/** Tag teams / stables / managers tab on the Worker List page. Tag teams and
 *  stables already come fully resolved (names/pictures) from the backend;
 *  "managerial clients" has no data path anywhere in the save-file queries
 *  today, so this only lists WHO is a manager, not who they manage. */
export function TeamsStablesTab({ fedUid, workers, config, onConfigChange }: {
  fedUid: number; workers: Worker[];
  config?: Record<string, any>; onConfigChange?: (c: Record<string, any>) => void
}) {
  const { storeVersion } = useApp()
  const [tagTeams, setTagTeams] = useState<TagTeam[] | null>(null)
  const [stables, setStables] = useState<Stable[] | null>(null)
  const [belts, setBelts] = useState<Belt[]>([])

  useEffect(() => {
    setTagTeams(null)
    setStables(null)
    api.tagteams.list(fedUid).then(r => setTagTeams(r.teams)).catch(() => setTagTeams([]))
    api.stables.list(fedUid).then(r => setStables(r.stables)).catch(() => setStables([]))
    api.fed.belts(fedUid).then(r => setBelts(r.belts)).catch(() => setBelts([]))
  }, [fedUid, storeVersion])

  const champMap = useMemo(() => {
    const map = new Map<number, Belt[]>()
    for (const b of belts) {
      if (b.holder1 > 0) {
        const arr = map.get(b.holder1) || []
        arr.push(b)
        map.set(b.holder1, arr)
      }
      if (b.holder2 > 0) {
        const arr = map.get(b.holder2) || []
        arr.push(b)
        map.set(b.holder2, arr)
      }
    }
    return map
  }, [belts])

  const handleConfig = onConfigChange || (() => {})
  const safeConfig = config || {}

  const groupBy = new Set<string>(safeConfig.groupBy || [])
  const setGroupBy = (s: Set<string>) => handleConfig({ groupBy: Array.from(s) })
  const activeSubgroups = new Set<string>(safeConfig.activeSubgroups || [])
  const setActiveSubgroups = (s: Set<string>) => handleConfig({ activeSubgroups: Array.from(s) })
  const advancedRoleFilters = new Set<string>(safeConfig.advancedRoleFilters || [])
  const setAdvancedRoleFilters = (s: Set<string>) => handleConfig({ advancedRoleFilters: Array.from(s) })
  const subgroups: SubgroupDef[] = safeConfig.subgroups || []
  const filterRules: FilterRule[] = safeConfig.filterRules || []

  const [activeOnly, setActiveOnly] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedDim, setSelectedDim] = useState<string | null>(null)
  const [selectedSg, setSelectedSg] = useState<string | null>(null)
  const [showSgEditor, setShowSgEditor] = useState(false)
  const [sgLabel, setSgLabel] = useState('')
  const [sgFilters, setSgFilters] = useState<SubgroupFilter>({})

  const allBrands = useMemo(() => getAllBrands(workers), [workers])
  const allContracts: string[] = useMemo(() => {
    const set = new Set<string>()
    workers.forEach(w => { if (w.contract_status) set.add(w.contract_status) })
    return ['all', ...Array.from(set).sort()]
  }, [workers])
  const FILTER_DIMENSIONS: DimDef[] = useMemo(() => buildFilterDimensions(allContracts, allBrands), [allContracts, allBrands])

  const dimOptions = useMemo(() => buildDimOptions(allBrands), [allBrands])
  const dimOrder: string[] = safeConfig.dimOrder || dimOptions.map(d => d.id)
  const orderedDims = useMemo(() => orderDims(dimOrder, dimOptions), [dimOrder, dimOptions])

  const managers = useMemo(() => workers.filter(w => w.positions.includes('Manager')), [workers])

  // Sort tag teams by average perception score of their two members
  const sortedTeams = useMemo(() => {
    if (!tagTeams) return null
    return [...tagTeams].sort((a, b) => {
      const wa1 = workers.find(w => w.uid === a.worker1)
      const wa2 = workers.find(w => w.uid === a.worker2)
      const wb1 = workers.find(w => w.uid === b.worker1)
      const wb2 = workers.find(w => w.uid === b.worker2)
      const avgA = ((wa1 ? getPerceptionScore(wa1) : 0) + (wa2 ? getPerceptionScore(wa2) : 0)) / 2
      const avgB = ((wb1 ? getPerceptionScore(wb1) : 0) + (wb2 ? getPerceptionScore(wb2) : 0)) / 2
      return avgB - avgA
    })
  }, [tagTeams, workers])

  function sortInactiveLast<T extends { active?: boolean }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
      const aActive = a.active !== false
      const bActive = b.active !== false
      if (aActive && !bActive) return -1
      if (!aActive && bActive) return 1
      return 0
    })
  }

  const visibleTeams = useMemo(() => {
    if (!sortedTeams) return null
    const filtered = activeOnly ? sortedTeams.filter(t => t.active !== false) : sortedTeams
    return activeOnly ? filtered : sortInactiveLast(filtered)
  }, [sortedTeams, activeOnly])

  const visibleStables = useMemo(() => {
    if (!stables) return null
    const filtered = activeOnly ? stables.filter(s => s.active) : stables
    return activeOnly ? filtered : sortInactiveLast(filtered)
  }, [stables, activeOnly])

  const hasActiveGroups = groupBy.size > 0 || activeSubgroups.size > 0

  if (tagTeams === null || stables === null) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  return (
    <div className="flex flex-col gap-4" style={{ height: '100%', padding: 20, overflow: 'auto', boxSizing: 'border-box' }}>
      <div className="flex justify-end items-center gap-3 mb-1">
        <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, userSelect: 'none' }}
          onClick={() => setActiveOnly(p => !p)}>
          <div className={`toggle-track ${activeOnly ? 'active' : ''}`}>
            <div className="toggle-thumb" />
          </div>
          <span>Active only</span>
        </label>
        <button className="manage-view-btn" onClick={() => setShowFilterPanel(p => !p)}>
          <img src={filterIcon} alt="Filter" className="w-14 h-14" />
          Group By{hasActiveGroups ? ' (active)' : ''}
        </button>
      </div>

      {(() => {
        const dims = Array.from(groupBy)
        const renderTeamCard = (t: TagTeam) => {
          const w1 = workers.find(w => w.uid === t.worker1)
          const w2 = workers.find(w => w.uid === t.worker2)
          const members = [w1, w2].filter(Boolean) as Worker[]
          return (
            <div key={t.uid} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px', opacity: t.active === false ? 0.4 : undefined, display: 'flex', flexDirection: 'column' }}>
              <div className="text-lg text-bold mb-2">{t.name}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div className="flex justify-center gap-3 flex-wrap" style={{ alignItems: 'flex-end' }}>
                  <MembersGrouped members={members} champMap={champMap} beltStyle="Tag Team" />
                </div>
              </div>
            </div>
          )
        }
        const renderStableCard = (s: Stable) => {
          const members = s.members.map(m => workers.find(w => w.uid === m.uid)).filter(Boolean) as Worker[]
          return (
            <div key={s.uid} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px', opacity: s.active === false ? 0.4 : undefined, display: 'flex', flexDirection: 'column' }}>
              <div className="text-lg text-bold mb-2">{s.name}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div className="flex justify-center gap-3 flex-wrap" style={{ alignItems: 'flex-end' }}>
                  <MembersGrouped members={members} champMap={champMap} beltStyle="Trios" />
                </div>
              </div>
            </div>
          )
        }
        return (
          <>
            <div>
              <div className="mb-2" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6 }}>Tag Teams</div>
              {visibleTeams && visibleTeams.length === 0 && <div className="text-muted text-sm">No tag teams</div>}
              {visibleTeams && (dims.length > 0
                ? groupCards(visibleTeams, t => {
                    const w1 = workers.find(w => w.uid === t.worker1)
                    const w2 = workers.find(w => w.uid === t.worker2)
                    return [w1, w2].filter(Boolean) as Worker[]
                  }, dims).map(([key, items]) => (
                    <div key={key}>
                      <div className="text-xs text-semibold text-muted text-uppercase mb-1" style={{ letterSpacing: 0.5 }}>{key}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8, marginBottom: 12 }}>
                        {items.map(renderTeamCard)}
                      </div>
                    </div>
                  ))
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
                    {visibleTeams.map(renderTeamCard)}
                  </div>
              )}
            </div>

            <div>
              <div className="mb-2" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6 }}>Stables</div>
              {visibleStables && visibleStables.length === 0 && <div className="text-muted text-sm">No stables</div>}
              {visibleStables && (dims.length > 0
                ? groupCards(visibleStables, s => s.members.map(m => workers.find(w => w.uid === m.uid)).filter(Boolean) as Worker[], dims).map(([key, items]) => (
                    <div key={key}>
                      <div className="text-xs text-semibold text-muted text-uppercase mb-1" style={{ letterSpacing: 0.5 }}>{key}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8, marginBottom: 12 }}>
                        {items.map(renderStableCard)}
                      </div>
                    </div>
                  ))
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
                    {visibleStables && visibleStables.map(renderStableCard)}
                  </div>
              )}
            </div>
          </>
        )
      })()}

      <div>
        <div className="mb-2" style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6 }}>Managers</div>
        {managers.length === 0 && <div className="text-muted text-sm">No managers</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {managers.map(m => (
            <div key={m.uid} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px' }}>
              <div className="flex justify-center gap-3 flex-wrap" style={{ alignItems: 'flex-end' }}>
                <MembersGrouped members={[m]} champMap={champMap} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {showFilterPanel && createPortal(
        <FilterPanel
          onClose={() => setShowFilterPanel(false)}
          orderedDims={orderedDims}
          selectedDim={selectedDim} setSelectedDim={setSelectedDim}
          groupBy={groupBy} setGroupBy={setGroupBy}
          advancedRoleFilters={advancedRoleFilters} setAdvancedRoleFilters={setAdvancedRoleFilters}
          subgroups={subgroups} activeSubgroups={activeSubgroups} setActiveSubgroups={setActiveSubgroups}
          selectedSg={selectedSg} setSelectedSg={setSelectedSg}
          setShowSgEditor={setShowSgEditor} setSgLabel={setSgLabel} setSgFilters={setSgFilters}
          filterRules={filterRules} filterDimensions={FILTER_DIMENSIONS}
          onConfigChange={handleConfig}
        />,
        document.body
      )}

      {showSgEditor && createPortal(
        <SubgroupEditor
          onClose={() => setShowSgEditor(false)}
          sgLabel={sgLabel} setSgLabel={setSgLabel}
          sgFilters={sgFilters} setSgFilters={setSgFilters}
          subgroups={subgroups} onConfigChange={handleConfig}
          allBrands={allBrands}
        />,
        document.body
      )}
    </div>
  )
}
