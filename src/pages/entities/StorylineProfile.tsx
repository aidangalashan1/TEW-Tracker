import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { api } from '../../api'

export function StorylineProfile({ storylineUid }: { storylineUid: number }) {
  const { img, focusedFed, playerFed, navigateToEntity } = useApp()
  const fed = focusedFed || playerFed
  const { data: sl, error } = useSWR(`storyline-${storylineUid}`, () => api.storylines.detail(storylineUid, fed?.uid))
  const { data: crossData } = useSWR(fed?.uid ? `storylines-cross-${fed.uid}` : null, () => api.storylines.cross(fed!.uid))
  const pastSegments = useMemo(() => {
    const result: { date: string; show: string; text: string; rating?: number }[] = []
    if (crossData?.shows) {
      for (const show of crossData.shows) {
        if (!show.segments || show.is_upcoming) continue
        for (const seg of show.segments) {
          if (seg.storyline_uids && seg.storyline_uids.includes(storylineUid)) {
            result.push({
              date: show.date,
              show: show.name,
              text: seg.log_entry || 'No description',
              rating: seg.rating,
            })
          }
        }
      }
    }
    result.sort((a, b) => a.date.localeCompare(b.date))
    return result
  }, [crossData, storylineUid])

  const { data: cardsList } = useSWR(fed?.uid ? `cards-list-${fed.uid}` : null, () => api.cards.list(fed!.uid))
  const [cardDetails, setCardDetails] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!cardsList?.cards) return
    for (const card of cardsList.cards) {
      if (card.segmentCount > 0 && !cardDetails[card.id]) {
        api.cards.get(card.id).then(full => setCardDetails(prev => ({ ...prev, [card.id]: full }))).catch(() => {})
      }
    }
    // cardDetails is read only as a fetch-once cache guard; re-running when it
    // changes would just re-scan and no-op. Keyed on cardsList intentionally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsList])

  const plannedSegments = useMemo(() => {
    if (!sl?.workers) return []
    const workerUids = new Set(sl.workers.map((w: any) => w.uid))
    const nameByUid = new Map<number, string>()
    for (const w of sl.workers) nameByUid.set(w.uid, w.name)
    const result: { date: string; show: string; text: string }[] = []
    for (const cardId of Object.keys(cardDetails)) {
      const full = cardDetails[cardId]
      if (!full?.segments) continue
      for (const seg of full.segments) {
        const segWorkers = seg.workers || []
        const segSides = seg.sides ? seg.sides.flat() : []
        const allUids = [...segWorkers, ...segSides]
        for (const uid of allUids) {
          if (!nameByUid.has(uid)) {
            nameByUid.set(uid, `#${uid}`)
          }
        }
        if (allUids.some((uid: number) => workerUids.has(uid))) {
          const getName = (uid: number) => nameByUid.get(uid) || `#${uid}`
          let text = ''
          if (seg.type === 'match' && seg.sides && seg.sides.length > 0) {
            const parts = seg.sides.map((side: number[]) => side.map(getName).join(' & ') || '???')
            text = parts.join(' vs. ')
          } else if (seg.type === 'battle-royal' && seg.workers && seg.workers.length > 0) {
            const names = seg.workers.map(getName)
            text = `Battle Royal: ${names.join(', ')}`
          } else {
            text = seg.description || 'Angle'
          }
          result.push({ date: full.showDate || '', show: full.showName || '', text })
        }
      }
    }
    result.sort((a, b) => a.date.localeCompare(b.date))
    return result
  }, [cardDetails, sl])

  if (error) return <div className="loading" style={{ color: 'var(--accent)' }}>Error loading storyline</div>
  if (!sl) return <div className="loading">Loading...</div>

  return (
    <div style={{ padding: 20, overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{sl.name}</div>
          {sl.furthered && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Furthered</span>}
        </div>
        {sl.heat > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: sl.heat > 79 ? '#60a5fa' : sl.heat > 69 ? '#22c55e' : sl.heat > 59 ? '#f59e0b' : sl.heat > 39 ? '#f97316' : sl.heat > 19 ? '#ef4444' : '#6b7280', color: '#fff', borderRadius: 6, width: 80, height: 80, flexShrink: 0 }}>
            <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{sl.heat}</span>
          </div>
        )}
      </div>
      {sl.description && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.5 }}>{sl.description}</div>
        </div>
      )}
      {sl.workers && sl.workers.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Involved Workers ({sl.workers.length})</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sl.workers.map((w: any) => (
              <span key={w.uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => navigateToEntity('worker', w.uid)}>
                {w.picture ? <img src={img('People/' + w.picture)} alt="" style={{ width: 75, height: 75, objectFit: 'cover', borderRadius: 6 }}
                  onError={(e) => (e.target as HTMLElement).style.display = 'none'} /> : <div style={{ width: 75, height: 75, background: 'var(--bg-tertiary)', borderRadius: 6 }} />}
                <span style={{ fontSize: 11, color: '#fff' }}>{w.name}</span>
                <span style={{ fontSize: 10, color: w.alignment === 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{w.alignment === 0 ? 'Heel' : 'Face'}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {pastSegments.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Past Segments ({pastSegments.length})</div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {[...pastSegments].reverse().map((seg, i) => (
              <div key={i} style={{ fontSize: 12, padding: '4px 0' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, paddingLeft: 4 }}>{seg.date} · {seg.show}</div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                  <span style={{ flex: 1 }}>{seg.text}</span>
                  {seg.rating != null && <span style={{ background: seg.rating > 79 ? '#60a5fa' : seg.rating > 69 ? '#22c55e' : seg.rating > 59 ? '#f59e0b' : seg.rating > 39 ? '#f97316' : seg.rating > 19 ? '#ef4444' : '#6b7280', color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 10, lineHeight: '16px', flexShrink: 0 }}>{seg.rating}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Planned Segments ({plannedSegments.length})</div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {plannedSegments.length > 0 ? plannedSegments.map((seg, i) => (
            <div key={i} style={{ fontSize: 12, padding: '4px 0' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, paddingLeft: 4 }}>{seg.date} · {seg.show}</div>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                <span style={{ flex: 1 }}>{seg.text}</span>
              </div>
            </div>
          )) : <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No Planned Segments</div>}
        </div>
      </div>
    </div>
  )
}
