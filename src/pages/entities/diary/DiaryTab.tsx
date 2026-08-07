import { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { fmtDateOrdinal } from '../../../lib/dates'
import plusIcon from '../../../assets/UI icons/plus.png'

export function DiaryTab() {
  const { focusedFed, playerFed, navigateToEntity } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid

  const { data, isLoading, mutate } = useSWR(fedUid != null ? 'diary-' + fedUid : null, () => api.diary.list(fedUid))
  const entries = data?.entries ?? []
  const [creating, setCreating] = useState(false)

  const createEntry = () => {
    if (creating || fedUid == null) return
    setCreating(true)
    api.diary.create({ fedUid, title: 'New Diary Entry' }).then(r => {
      mutate()
      navigateToEntity('diary', r.entry.id)
    }).finally(() => setCreating(false))
  }

  const deleteEntry = (id: string) => {
    if (!confirm('Delete this diary entry?')) return
    api.diary.delete(id).then(() => mutate())
  }

  if (isLoading) return <div className="loading" style={{ padding: 24 }}>Loading...</div>

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      <div className="filter-bar">
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{entries.length} entries</span>
        <button className="manage-view-btn" onClick={createEntry} disabled={creating}>
          <img src={plusIcon} alt="" className="w-14 h-14" />
          New Entry
        </button>
      </div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Format</th>
              <th>Linked Shows</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => navigateToEntity('diary', e.id)}>
                <td style={{ fontWeight: 700, color: '#fff' }}>{e.title || 'Untitled'}</td>
                <td>{e.date ? fmtDateOrdinal(e.date) : '?'}</td>
                <td style={{ textTransform: 'uppercase', fontSize: 11, color: 'var(--text-muted)' }}>{e.format}</td>
                <td>{e.linkedShows.map(s => s.showName).join(', ') || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={ev => { ev.stopPropagation(); deleteEntry(e.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 4px', lineHeight: 1 }}
                    onMouseEnter={ev => { ev.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={ev => { ev.currentTarget.style.color = 'var(--text-muted)' }}
                    title="Delete"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                  No diary entries yet — write your first show recap
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
