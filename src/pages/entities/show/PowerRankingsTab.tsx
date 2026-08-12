import { useApp } from '../../../context/AppContext'
import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { ratingColor } from '../../../lib/colors'

const hideImg = (e: any) => { e.target.style.display = 'none' }

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>NEW</span>
  if (delta === 0) return <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>–</span>
  const up = delta > 0
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: up ? '#3ecf6e' : '#e5484d' }}>
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  )
}

export function PowerRankingsTab() {
  const { focusedFed, playerFed, navigateToEntity, img } = useApp()
  const fed = focusedFed || playerFed
  const fedUid = fed?.uid
  const { data, isLoading } = useSWR(fedUid != null ? 'power-rankings-' + fedUid : null, () => api.roster.rankings(fedUid))

  if (isLoading) return <div className="loading" style={{ padding: 24 }}>Loading power rankings...</div>

  const rankings = data?.rankings ?? []
  const weights = data?.weights ?? {}

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Blends current ability with actual booking &amp; performance — the booking-driven share grows as the game goes on
        (currently {Math.round(((weights.momentum ?? 0) + (weights.prominence ?? 0)) * 100)}% booking/performance vs. {Math.round((weights.current ?? 0) * 100)}% paper rating).
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rankings.map(r => (
          <div key={r.worker_uid}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 4, background: 'var(--bg-secondary)', cursor: 'pointer' }}
            onClick={() => navigateToEntity('worker', r.worker_uid)}
          >
            <div style={{ width: 26, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.rank}</div>
            <div style={{ width: 34 }}><DeltaBadge delta={r.delta} /></div>
            {r.picture
              ? <img src={img('People/' + r.picture)} alt="" onError={hideImg} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />
              : <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--bg-tertiary)' }} />}
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              {r.name}
              {r.is_champion && <span title="Champion" style={{ fontSize: 11 }}>👑</span>}
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span title="Current ability score">Ability {r.current_score}</span>
              <span title="Recent win/loss + match ratings">Momentum {r.momentum}</span>
              <span title="Push, title picture, main-eventing">Prominence {r.prominence}</span>
              {r.storyline_heat > 0 && <span title="Active storyline heat">Heat {r.storyline_heat}</span>}
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-family)', background: ratingColor(r.score), color: '#fff', borderRadius: 4, padding: '2px 10px', minWidth: 44, textAlign: 'center' }}>
              {r.score}
            </span>
          </div>
        ))}
        {rankings.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No wrestlers on this fed's roster yet.</div>
        )}
      </div>
    </div>
  )
}
