import { useState } from 'react'
import { api, collateralFileUrl, type CollateralCategory, type CollateralListing } from '../../../api'
import useSWR from '../../../hooks/useApi'

const CATEGORY_LABELS: Record<CollateralCategory, string> = {
  fed_logo: 'Fed Logo',
  show_logos: 'Show Logos',
  roster: 'Roster',
  custom: 'Custom',
}
const CATEGORIES: CollateralCategory[] = ['fed_logo', 'show_logos', 'roster', 'custom']

/** Browses the app-managed local collateral folder (synced fed logo, show
 *  logos, roster photos, plus a "Custom" folder for the user's own banners)
 *  and reveals the picked file in Explorer — it doesn't insert anything into
 *  the diary body, since a forum post can't embed a local file path; the
 *  point is just getting to the right file fast for a manual upload. */
export function CollateralPanel({ fedUid }: { fedUid: number | undefined }) {
  const { data, mutate } = useSWR('collateral-list', () => api.collateral.list())
  const listing: CollateralListing | null = data ?? null
  const [tab, setTab] = useState<CollateralCategory>('fed_logo')
  const [syncing, setSyncing] = useState(false)
  const [revealed, setRevealed] = useState<string | null>(null)

  const sync = () => {
    if (fedUid == null || syncing) return
    setSyncing(true)
    api.collateral.sync(fedUid).then(() => mutate()).finally(() => setSyncing(false))
  }

  const reveal = (path: string) => {
    api.collateral.reveal(path).then(() => {
      setRevealed(path)
      setTimeout(() => setRevealed(null), 1200)
    }).catch(() => {})
  }

  const openCustomFolder = () => api.collateral.openFolder('custom').catch(() => {})

  const items = listing?.[tab] ?? []

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            className="manage-view-btn"
            style={{ fontSize: 11, padding: '3px 10px', background: tab === c ? 'var(--bg-tertiary)' : undefined }}
            onClick={() => setTab(c)}
          >
            {CATEGORY_LABELS[c]} {listing ? `(${listing[c].length})` : ''}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {tab === 'custom' ? (
          <button className="manage-view-btn" style={{ fontSize: 11 }} onClick={openCustomFolder}>Open Custom Folder</button>
        ) : (
          <button className="manage-view-btn" style={{ fontSize: 11 }} onClick={sync} disabled={syncing || fedUid == null}>
            {syncing ? 'Syncing…' : 'Sync from Save'}
          </button>
        )}
      </div>

      {tab === 'custom' && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          Drop your own banners/graphics into this folder and they'll show up here.
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8 }}>
          {tab === 'custom' ? 'No custom files yet.' : 'Nothing synced yet — click "Sync from Save".'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
          {items.map(item => (
            <div
              key={item.path}
              onClick={() => reveal(item.path)}
              title="Reveal in Explorer"
              style={{
                width: 80, cursor: 'pointer', borderRadius: 6, padding: 4,
                background: revealed === item.path ? 'var(--bg-tertiary)' : 'transparent',
                border: '1px solid var(--border-color)', textAlign: 'center',
              }}
            >
              <img
                src={collateralFileUrl(item.path)}
                alt=""
                style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 4, background: 'var(--bg-tertiary)' }}
                onError={e => { (e.target as HTMLElement).style.visibility = 'hidden' }}
              />
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {revealed === item.path ? 'Opened ✓' : item.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
