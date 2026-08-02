import { Fragment, useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../../../context/AppContext'
import { api, ArcItem } from '../../../api'
import type { Worker } from '../../../api-types'
import useSWR from '../../../hooks/useApi'
import { useModuleConfig } from '../../../hooks/useModuleConfig'
import {
  buildDimOptions, orderDims, computeGroups,
  type SubgroupDef, type SubgroupFilter,
} from '../../../modules/worker-list/workerListGrouping'
import { FilterPanel } from '../../../modules/worker-list/FilterPanel'
import { SubgroupEditor } from '../../../modules/worker-list/SubgroupEditor'
import {
  getAllBrands, buildFilterDimensions, filterWorkers,
  type FilterRule, type DimDef,
} from '../../../modules/worker-list/workerListFilters'
import { Tooltip } from '../../../components/Tooltip'
import { PERCEPTION_LABELS } from '../../../lib/labels'
import plusIcon from '../../../assets/UI icons/plus.png'
import filterIcon from '../../../assets/UI icons/filter.png'
import settingsIcon from '../../../assets/UI icons/settings.png'
import { useArcsData, newArcItem, ARC_LIST_FIELDS, ARC_STATUS_LABELS, ARC_STATUS_COLORS, type ArcListField } from './arcData'
import { ArcItemModal } from './ArcItemModal'

function EditableCell({
  value,
  placeholder,
  onSave,
  autoFocus,
}: {
  value: string
  placeholder?: string
  onSave: (val: string) => void
  autoFocus?: boolean
}) {
  const [editing, setEditing] = useState(autoFocus ?? false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      ref.current.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        style={{
          width: '100%', minHeight: 20, resize: 'vertical',
          background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
          border: '1px solid var(--accent)', borderRadius: 4,
          padding: '2px 4px', fontSize: 12, fontFamily: 'inherit',
          outline: 'none', whiteSpace: 'pre-wrap',
        }}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="cursor-text"
      style={{
        minHeight: 20,
        whiteSpace: 'pre-wrap',
        borderRadius: 4,
        padding: '2px 4px',
        margin: '-2px -4px',
        color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        fontStyle: value ? 'normal' : 'italic',
      }}
      title="Click to edit"
    >
      {value || placeholder || 'Click to add…'}
    </div>
  )
}

function MultiItemList({
  items,
  placeholder,
  onAdd,
  onUpdateText,
  onOpenDetail,
  onDelete,
}: {
  items: ArcItem[]
  placeholder?: string
  onAdd: () => void
  onUpdateText: (id: string, val: string) => void
  onOpenDetail: (item: ArcItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-1">
          <span
            title={ARC_STATUS_LABELS[item.status]}
            style={{ width: 6, height: 6, borderRadius: '50%', background: ARC_STATUS_COLORS[item.status], flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <EditableCell
              value={item.text}
              placeholder={placeholder}
              onSave={val => onUpdateText(item.id, val)}
            />
          </div>
          <button
            onClick={() => onOpenDetail(item)}
            className="flex-shrink-0"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
            title="Status & links"
          >
            <img src={settingsIcon} alt="" style={{ width: 11, height: 11, filter: 'brightness(0) invert(0.6)' }} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="flex-shrink-0"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 4px', lineHeight: 1, borderRadius: 3 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            title="Delete"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex items-center gap-1 self-start"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, padding: '2px 0' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <img src={plusIcon} alt="" style={{ width: 10, height: 10, filter: 'brightness(0) invert(0.6)' }} />
        Add
      </button>
    </div>
  )
}

const WRAP_CELL: React.CSSProperties = { whiteSpace: 'normal', verticalAlign: 'top' }

export function ArcsTab() {
  const { focusedFed, playerFed, img, navigateToEntity } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid

  const { data: rosterData, isLoading: rosterLoading } = useSWR(fedUid != null ? 'roster-' + fedUid : null, () => api.roster.list(fedUid!))
  const { arcs, getArc, setArc, isLoading: arcsLoading } = useArcsData()
  const { config, handleConfigChange: handleConfig } = useModuleConfig('arcs')

  const [search, setSearch] = useState('')
  const [noArcsOnly, setNoArcsOnly] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedDim, setSelectedDim] = useState<string | null>(null)
  const [selectedSg, setSelectedSg] = useState<string | null>(null)
  const [showSgEditor, setShowSgEditor] = useState(false)
  const [sgLabel, setSgLabel] = useState('')
  const [sgFilters, setSgFilters] = useState<SubgroupFilter>({})
  const [editing, setEditing] = useState<{ worker: Worker; field: ArcListField; item: ArcItem; isNew: boolean } | null>(null)

  const allRosterWorkers: Worker[] = useMemo(() => rosterData?.workers ?? [], [rosterData])

  const fedWorkers = useMemo(() => {
    if (!fed) return []
    return allRosterWorkers
      .filter(w => w.contract?.fed_uid === fed.uid)
      .sort((a, b) => ((a.contract as any)?.Perception ?? 99) - ((b.contract as any)?.Perception ?? 99))
  }, [allRosterWorkers, fed])

  const safeConfig = config || {}
  const groupBy = useMemo(() => new Set<string>(safeConfig.groupBy || []), [safeConfig.groupBy])
  const setGroupBy = (s: Set<string>) => handleConfig({ groupBy: Array.from(s) })
  const activeSubgroups = useMemo(() => new Set<string>(safeConfig.activeSubgroups || []), [safeConfig.activeSubgroups])
  const setActiveSubgroups = (s: Set<string>) => handleConfig({ activeSubgroups: Array.from(s) })
  const advancedRoleFilters = useMemo(() => new Set<string>(safeConfig.advancedRoleFilters || []), [safeConfig.advancedRoleFilters])
  const setAdvancedRoleFilters = (s: Set<string>) => handleConfig({ advancedRoleFilters: Array.from(s) })
  const subgroups: SubgroupDef[] = useMemo(() => safeConfig.subgroups || [], [safeConfig.subgroups])
  const filterRules: FilterRule[] = safeConfig.filterRules || []
  const hasActiveGroups = groupBy.size > 0 || activeSubgroups.size > 0

  const allBrands = useMemo(() => getAllBrands(fedWorkers), [fedWorkers])
  const allContracts: string[] = useMemo(() => {
    const set = new Set<string>()
    fedWorkers.forEach(w => { if (w.contract_status) set.add(w.contract_status) })
    return ['all', ...Array.from(set).sort()]
  }, [fedWorkers])
  const FILTER_DIMENSIONS: DimDef[] = useMemo(() => buildFilterDimensions(allContracts, allBrands), [allContracts, allBrands])
  const dimOptions = useMemo(() => buildDimOptions(allBrands), [allBrands])
  const dimOrder: string[] = safeConfig.dimOrder || dimOptions.map(d => d.id)
  const orderedDims = useMemo(() => orderDims(dimOrder, dimOptions), [dimOrder, dimOptions])

  const hasNoArcs = (uid: number) => {
    const arc = getArc(uid)
    return !arc.character_profile && ARC_LIST_FIELDS.every(f => !(arc[f] || []).length)
  }

  const filteredWorkers = useMemo(() => {
    let list = filterWorkers(fedWorkers, { search, positionFilter: 'all' }, filterRules, FILTER_DIMENSIONS)
    if (noArcsOnly) list = list.filter(w => hasNoArcs(w.uid))
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fedWorkers, search, filterRules, FILTER_DIMENSIONS, noArcsOnly, arcs])

  const groups = useMemo(() => computeGroups(filteredWorkers, {
    groupBy, dimOrder, subgroups, activeSubgroups, advancedRoleFilters, sorts: [],
  }), [filteredWorkers, groupBy, dimOrder, subgroups, activeSubgroups, advancedRoleFilters])

  // Reverse index of "who links to this worker" — arcs.json is global (not
  // fed-scoped), so this scans every owner's items once per arcs/roster
  // change and resolves names against the full roster, not just the
  // currently-filtered/fed-scoped list.
  const reverseLinks = useMemo(() => {
    const map = new Map<number, { ownerName: string; field: ArcListField; text: string }[]>()
    for (const [uidStr, arc] of Object.entries(arcs)) {
      const ownerUid = Number(uidStr)
      const ownerName = allRosterWorkers.find(w => w.uid === ownerUid)?.name || `Worker #${ownerUid}`
      for (const field of ARC_LIST_FIELDS) {
        for (const item of arc[field] || []) {
          for (const linkedUid of item.linked_worker_uids) {
            const arr = map.get(linkedUid) || []
            arr.push({ ownerName, field, text: item.text })
            map.set(linkedUid, arr)
          }
        }
      }
    }
    return map
  }, [arcs, allRosterWorkers])

  const updateField = (workerUid: number, field: 'character_profile', val: string) => {
    setArc(workerUid, { ...getArc(workerUid), [field]: val })
    api.arcs.update(workerUid, { [field]: val }).catch(() => {})
  }

  const addListItem = (workerUid: number, field: ArcListField): ArcItem => {
    const item = newArcItem()
    const current = getArc(workerUid)[field] || []
    setArc(workerUid, { ...getArc(workerUid), [field]: [...current, item] })
    return item
  }

  const updateItem = (workerUid: number, field: ArcListField, itemId: string, patch: Partial<ArcItem>, persist = true) => {
    const current = getArc(workerUid)[field] || []
    const next = current.map(i => (i.id === itemId ? { ...i, ...patch } : i))
    setArc(workerUid, { ...getArc(workerUid), [field]: next })
    if (persist) api.arcs.update(workerUid, { [field]: next }).catch(() => {})
  }

  const deleteItem = (workerUid: number, field: ArcListField, itemId: string) => {
    const current = getArc(workerUid)[field] || []
    const item = current.find(i => i.id === itemId)
    const next = current.filter(i => i.id !== itemId)
    setArc(workerUid, { ...getArc(workerUid), [field]: next })
    if (item?.text.trim()) api.arcs.update(workerUid, { [field]: next }).catch(() => {})
  }

  const addSuggestedArc = (workerUid: number, field: ArcListField, text: string, linkedWorkerUid: number) => {
    const item = { ...newArcItem(text), linked_worker_uids: [linkedWorkerUid] }
    const current = getArc(workerUid)[field] || []
    const next = [...current, item]
    setArc(workerUid, { ...getArc(workerUid), [field]: next })
    api.arcs.update(workerUid, { [field]: next }).catch(() => {})
  }

  const renderList = (w: Worker, field: ArcListField, placeholder: string) => {
    const items = getArc(w.uid)[field] || []
    return (
      <MultiItemList
        items={items}
        placeholder={placeholder}
        onAdd={() => {
          const item = addListItem(w.uid, field)
          setEditing({ worker: w, field, item, isNew: true })
        }}
        onUpdateText={(id, val) => updateItem(w.uid, field, id, { text: val }, !!val.trim())}
        onOpenDetail={item => setEditing({ worker: w, field, item, isNew: false })}
        onDelete={id => deleteItem(w.uid, field, id)}
      />
    )
  }

  const renderWorkerRow = (w: Worker) => {
    const arc = getArc(w.uid)
    const profile = arc.character_profile ?? w.bio ?? ''
    const incoming = reverseLinks.get(w.uid) || []
    const disposition = w.contract?.face ? 'Face' : 'Heel'
    const perceptionLabel = PERCEPTION_LABELS[(w.contract as any)?.Perception ?? 0] || 'Unknown'
    const gimmick = w.contract?.gimmick
    const profileSubheader = `${disposition} ${perceptionLabel}${gimmick ? ' - ' + gimmick : ''}`
    return (
      <tr key={w.uid}>
        <td style={WRAP_CELL}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#fff', fontWeight: 700 }}
            onClick={() => navigateToEntity('worker', w.uid)}>
            {w.picture && (
              <img src={img('People/' + w.picture)} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
            )}
            {w.name}
            {incoming.length > 0 && (
              <Tooltip text={incoming.map(l => `${l.ownerName}: "${l.text}"`).join('\n')}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'var(--bg-secondary)', borderRadius: 8, padding: '1px 6px' }}>
                  ↔ {incoming.length}
                </span>
              </Tooltip>
            )}
          </span>
        </td>
        <td style={{ ...WRAP_CELL, maxWidth: 300 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>
            {profileSubheader}
          </div>
          <EditableCell value={profile} placeholder={w.bio || 'No bio available'} onSave={val => updateField(w.uid, 'character_profile', val)} />
        </td>
        <td style={{ ...WRAP_CELL, maxWidth: 220 }}>{renderList(w, 'short_term_arcs', 'New arc…')}</td>
        <td style={{ ...WRAP_CELL, maxWidth: 220 }}>{renderList(w, 'long_term_arcs', 'New arc…')}</td>
        <td style={{ ...WRAP_CELL, maxWidth: 220 }}>{renderList(w, 'short_term_goals', 'New goal…')}</td>
        <td style={{ ...WRAP_CELL, maxWidth: 220 }}>{renderList(w, 'long_term_goals', 'New goal…')}</td>
      </tr>
    )
  }

  if (rosterLoading || arcsLoading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      <div className="filter-bar">
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filteredWorkers.length} workers</span>
        <input type="text" className="search-input" placeholder="Search workers…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
        <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, userSelect: 'none' }} onClick={() => setNoArcsOnly(p => !p)}>
          <div className={`toggle-track ${noArcsOnly ? 'active' : ''}`}><div className="toggle-thumb" /></div>
          <span>No arcs yet</span>
        </label>
        <button className="manage-view-btn" onClick={() => setShowFilterPanel(p => !p)}>
          <img src={filterIcon} alt="Filter" className="w-14 h-14" />
          Group By{hasActiveGroups ? ' (active)' : ''}
        </button>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Worker Name</th>
              <th>Character Profile</th>
              <th>Short-Term Arcs</th>
              <th>Long-Term Arcs</th>
              <th>Short-Term Goals</th>
              <th>Long-Term Goals</th>
            </tr>
          </thead>
          <tbody>
            {groups
              ? groups.map(([groupLabel, entries]) => (
                <Fragment key={groupLabel}>
                  <tr>
                    <td colSpan={6} className="text-xs text-semibold text-muted text-uppercase" style={{ letterSpacing: 0.5, background: 'var(--bg-secondary)' }}>{groupLabel}</td>
                  </tr>
                  {entries.map(e => renderWorkerRow(e.worker))}
                </Fragment>
              ))
              : filteredWorkers.map(renderWorkerRow)}
            {filteredWorkers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                  {search ? `No workers match "${search}"` : noArcsOnly ? 'Every worker already has arcs planned' : 'No workers found in roster'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && fedUid != null && (
        <ArcItemModal
          ownerWorker={editing.worker}
          fedUid={fedUid}
          item={editing.item}
          isNew={editing.isNew}
          onSave={draft => {
            updateItem(editing.worker.uid, editing.field, editing.item.id, draft, true)
            setEditing(null)
          }}
          onAddSuggestedArc={(text, linkedWorkerUid) => addSuggestedArc(editing.worker.uid, editing.field, text, linkedWorkerUid)}
          onCancel={() => {
            if (editing.isNew) deleteItem(editing.worker.uid, editing.field, editing.item.id)
            setEditing(null)
          }}
        />
      )}

      {showFilterPanel && (
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
        />
      )}

      {showSgEditor && (
        <SubgroupEditor
          onClose={() => setShowSgEditor(false)}
          sgLabel={sgLabel} setSgLabel={setSgLabel}
          sgFilters={sgFilters} setSgFilters={setSgFilters}
          subgroups={subgroups} onConfigChange={handleConfig}
          allBrands={allBrands}
        />
      )}
    </div>
  )
}
