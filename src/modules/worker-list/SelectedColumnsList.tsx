import moveUpIcon from '../../assets/UI icons/moveup.png'
import moveDownIcon from '../../assets/UI icons/movedown.png'
import closeIcon from '../../assets/UI icons/close.png'
import type { ColumnState, ColumnDef } from './columns'

/** The right-hand "Selected" pane of the Manage View modal — reorderable
 *  list of active columns, paired with ColumnPickerPane's "Available" pane. */
export function SelectedColumnsList({
  visibleCols,
  colMap,
  colState,
  selectedSelected, setSelectedSelected,
  moveColumn, removeColumn,
}: {
  visibleCols: ColumnState[]
  colMap: Map<string, ColumnDef>
  colState: ColumnState[]
  selectedSelected: Set<string>
  setSelectedSelected: (s: Set<string>) => void
  moveColumn: (id: string, dir: -1 | 1) => void
  removeColumn: (id: string) => void
}) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="text-muted text-semibold mb-1 text-sm">Selected</div>
      <div className="flex-1 overflow-auto border-default rounded-sm p-1">
        {visibleCols.map((cs, idx) => {
          const def = colMap.get(cs.id)
          if (!def) return null
          const locked = cs.id === 'img' || cs.id === 'status'
          const isSelected = selectedSelected.has(cs.id)
          return (
            <div key={cs.id}
              onClick={() => {
                const next = new Set(selectedSelected)
                if (next.has(cs.id)) next.delete(cs.id); else next.add(cs.id)
                setSelectedSelected(next)
              }}
              className="items-center cursor-pointer rounded-xs text-md"
              style={{
                gap: 4,
                padding: '4px 6px',
                background: isSelected ? 'var(--accent)' : 'var(--bg-secondary)',
                color: isSelected ? '#fff' : undefined,
                marginBottom: 2,
              }}>
              <span className="flex-1 ws-nowrap truncate">
                {def.label || cs.id}
              </span>
              <div className="flex flex-shrink-0 gap-3px">
                <button
                  className="manage-view-btn flex-center"
                  disabled={idx === 0}
                  onClick={(e) => { e.stopPropagation(); moveColumn(cs.id, -1) }}
                  style={{ padding: '2px 4px', opacity: idx === 0 ? 0.3 : 1 }}
                ><img src={moveUpIcon} alt="Up" style={{ width: 10, height: 10 }} /></button>
                <button
                  className="manage-view-btn flex-center"
                  disabled={idx === colState.length - 1}
                  onClick={(e) => { e.stopPropagation(); moveColumn(cs.id, 1) }}
                  style={{ padding: '2px 4px', opacity: idx === colState.length - 1 ? 0.3 : 1 }}
                ><img src={moveDownIcon} alt="Down" style={{ width: 10, height: 10 }} /></button>
                {!locked && (
                  <button
                    className="manage-view-btn flex-center"
                    onClick={(e) => { e.stopPropagation(); removeColumn(cs.id) }}
                    style={{ padding: '2px 4px', marginLeft: 2 }}
                  ><img src={closeIcon} alt="Remove" style={{ width: 10, height: 10 }} /></button>
                )}
              </div>
            </div>
          )
        })}
        {colState.length === 0 && <div className="text-muted text-sm p-2 text-center">No columns selected</div>}
      </div>
    </div>
  )
}
