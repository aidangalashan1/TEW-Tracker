import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { api } from '../../api'
import { ratingColor } from '../../lib/colors'
import { formatRatingPct } from '../../lib/grade'
import { fmtFlexibleDateOrdinal, daysBetweenFlexible } from '../../lib/dates'

export function BeltProfile({ beltUid }: { beltUid: number }) {
  const { img, navigateToEntity, allFeds, gameInfo, ratingFormat } = useApp()
  const { data: belt, error } = useSWR('belt-' + beltUid, () => api.belt.detail(beltUid))

  const multiHolder = belt ? (belt.style === 'Tag Team' || belt.style === 'Trios') : false
  const trios = belt ? belt.style === 'Trios' : false
  const { data: champ1 } = useSWR(belt && belt.holder1 > 0 ? 'worker-' + belt.holder1 : null, () => api.roster.detail(belt!.holder1))
  const { data: champ2 } = useSWR(belt && belt.holder2 > 0 && multiHolder ? 'worker-' + belt.holder2 : null, () => api.roster.detail(belt!.holder2))
  const { data: champ3 } = useSWR(belt && (belt.holder3 ?? 0) > 0 && trios ? 'worker-' + (belt.holder3 ?? 0) : null, () => api.roster.detail(belt!.holder3 ?? 0))
  const { data: beltHistory } = useSWR(belt ? 'belt-history-' + belt.fed_uid : null, () => api.fed.beltHistory(belt!.fed_uid, 9999))
  const champFormKey1 = belt && belt.holder1 > 0 && belt.belt_captured ? 'form-' + belt.holder1 : null
  const { data: champForm1 } = useSWR(champFormKey1, () => api.roster.form(belt!.holder1))
  const champFormKey2 = belt && belt.holder2 > 0 && multiHolder && belt.belt_captured ? 'form-' + belt.holder2 : null
  const { data: champForm2 } = useSWR(champFormKey2, () => api.roster.form(belt!.holder2))
  const champFormKey3 = belt && (belt.holder3 ?? 0) > 0 && trios && belt.belt_captured ? 'form-' + belt.holder3 : null
  const { data: champForm3 } = useSWR(champFormKey3, () => api.roster.form(belt!.holder3 ?? 0))

  if (error) return <div className="loading" style={{ color: 'var(--accent)' }}>Error loading belt</div>
  if (!belt) return <div className="loading">Loading...</div>

  const beltFed = allFeds.find(f => f.uid === belt.fed_uid)
  const beltFedLogo = beltFed?.logo ? img('Logos/' + beltFed.logo) : ''

  const h3 = belt.holder3 ?? 0
  const vacant = belt.holder1 === 0 && (!multiHolder || (belt.holder2 === 0 && (!trios || h3 === 0)))
  const champUids = new Set([belt.holder1, belt.holder2, belt.holder3].filter(id => (id ?? 0) > 0))
  const thisBeltHistory = beltHistory?.history?.find(g => g.belt_uid === belt.uid)

  const beltCaptureDate = belt.belt_captured
  const allChampForms = [champForm1, champForm2, champForm3].filter(Boolean)
  const allChampSegments = allChampForms.flatMap((f: any) => f?.segments ?? [])
  const seenMlUids = new Set<number>()
  const champSegments = allChampSegments.filter((s: any) => {
    if (!beltCaptureDate || s.date < beltCaptureDate) return false
    if (seenMlUids.has(s.match_log_uid)) return false
    seenMlUids.add(s.match_log_uid)
    return true
  })
  const champMatches = champSegments.filter((s: any) => !s.is_angle)
  const champAngles = champSegments.filter((s: any) => s.is_angle)
  const champDefences = champMatches.filter((s: any) => s.title1 === belt.uid || s.title2 === belt.uid)
  const champWins = champMatches.filter((s: any) => s.won)
  const champLosses = champMatches.filter((s: any) => s.lost)

  const allChamps = [champ1, champ2, champ3].filter((c): c is Exclude<typeof c, null | undefined> => c != null)
  const entries = thisBeltHistory?.entries ?? []
  const currentReign = entries.find(e => (!e.lost || e.lost === 'None') && e.holders.some(h => h.uid && champUids.has(h.uid)))
  const pastReigns = entries.filter(e => e !== currentReign && e.holders.some(h => h.uid && champUids.has(h.uid)))

  const fmtDate = fmtFlexibleDateOrdinal
  const daysBetween = daysBetweenFlexible
  function daysSince(from: string): number {
    const gameDate = gameInfo?.current_date
    if (!gameDate) return 0
    return daysBetween(from, gameDate)
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px 20px' }}>
        {belt.picture ? (
          <img src={img('Belts/' + belt.picture)} alt="" style={{ objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 100, height: 100, background: 'var(--bg-tertiary)', borderRadius: 8, flexShrink: 0 }} />
        )}
        {beltFedLogo && <img src={beltFedLogo} alt="" style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 8, flexShrink: 0 }} />}
        <div style={{ flexShrink: 0 }}>
          {belt.level && <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{belt.level}</div>}
          {belt.style && <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{belt.style}</div>}
        </div>
        {belt.bio && (
          <>
            <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />
            <div style={{ flex: 1, minWidth: 0, alignSelf: 'flex-start' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Profile</div>
              <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 130, overflowY: 'auto' }}>{belt.bio}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ width: '100%', height: 1, background: 'var(--border-color)', marginBottom: 12 }} />

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Current Champion{multiHolder ? 's' : ''}:</div>
        {vacant ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Vacant</div>
        ) : (
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', display: 'flex' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {allChamps.map((champ, ci) => {
                const holderUid = [belt.holder1, belt.holder2, h3][ci]
                return (
                  <div key={ci} className="flex items-center gap-3 cursor-pointer" onClick={() => navigateToEntity('worker', holderUid)}>
                    {(() => {
                      const pic = champ.contract?.picture || champ.picture
                      const url = pic ? img('People/' + pic) : ''
                      return url ? <img src={url} alt="" style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 150, height: 150, background: 'var(--bg-tertiary)', borderRadius: 8, flexShrink: 0 }} />
                    })()}
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{champ.name}</div>
                      {(currentReign?.captured || belt.belt_captured) && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <div>Won: {fmtDate(currentReign?.captured || belt.belt_captured!)}</div>
                          <div>Days held: {daysSince(currentReign?.captured || belt.belt_captured!)}</div>
                        </div>
                      )}
                    </div>
                    {ci < allChamps.length - 1 && <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />}
                  </div>
                )
              })}
            </div>
            {beltCaptureDate && (champForm1 || champForm2 || champForm3) && (
              <>
                <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />
                {pastReigns.length > 0 && (
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Previous reigns</div>
                    {pastReigns.slice(0, 5).map((r, ri) => (
                      <div key={ri} style={{ fontSize: 12, padding: '3px 4px', borderRadius: 4, color: '#fff', background: ri % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
                        {r.captured ? fmtDate(r.captured) : '?'} - {r.lost ? fmtDate(r.lost) : 'Present'}
                      </div>
                    ))}
                  </div>
                )}
                {pastReigns.length > 0 && <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />}
                <div style={{ minWidth: 250 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Since winning title</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <div>Segments: {champSegments.length} (Matches: {champMatches.length}, Angles: {champAngles.length})</div>
                    <div>Record: {champWins.length}W - {champLosses.length}L</div>
                  </div>
                  <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 4 }}>
                    {champSegments.slice(0, 10).map((s: any, si: number) => (
                      <div key={si} style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, color: '#fff', background: si % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.log_entry || s.label}</span>
                        <span style={{ background: ratingColor(Math.round(s.rating)), color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 10, lineHeight: '16px', flexShrink: 0, marginLeft: 6 }}>{Math.round(s.rating)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />
                <div style={{ minWidth: 250 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Defences ({champDefences.length})</div>
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {champDefences.length > 0 ? champDefences.slice(0, 10).map((s: any, si: number) => (
                      <div key={si} style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4, color: '#fff', background: si % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.log_entry || s.label}</span>
                        <span style={{ background: ratingColor(Math.round(s.rating)), color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 10, lineHeight: '16px', flexShrink: 0, marginLeft: 6 }}>{Math.round(s.rating)}</span>
                      </div>
                    )) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</div>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {entries.length > 0 && (() => {
        const winMap = new Map<string, { count: number; days: number; holders: { uid: number; name: string; picture: string }[]; teamName?: string }>()
        for (const e of entries) {
          const valid = e.holders.filter(h => h.name)
          const key = e.team_name || valid.map(h => h.name).join(' & ') || 'Unknown'
          const reignDays = e.captured ? daysBetween(e.captured, e.lost || (gameInfo?.current_date ?? '')) : 0
          const existing = winMap.get(key)
          if (existing) {
            existing.count++
            existing.days += reignDays
          } else {
            winMap.set(key, { count: 1, days: reignDays, holders: valid, teamName: e.team_name })
          }
        }
        const sorted = [...winMap.entries()].sort((a, b) => b[1].count - a[1].count)
        const sortedByDays = [...winMap.entries()].sort((a, b) => b[1].days - a[1].days)
        return (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', flex: 1, minWidth: 300 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Title History</div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {entries.map((e, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '3px 4px', borderRadius: 4, color: '#fff', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      {e.team_name ? (
                        <span style={{ fontWeight: 600 }}>{e.team_name}</span>
                      ) : (
                        e.holders.filter(h => h.name).map(h => (
                          <span key={h.uid} style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, cursor: 'pointer' }} onClick={() => navigateToEntity('worker', h.uid)}>
                            {h.picture ? <img src={img('People/' + h.picture)} alt="" style={{ width: 25, height: 25, objectFit: 'cover', borderRadius: 4, verticalAlign: 'middle' }} /> : <div style={{ width: 25, height: 25, background: 'var(--bg-tertiary)', borderRadius: 4, display: 'inline-block' }} />}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                          </span>
                        ))
                      )}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{e.captured ? fmtDate(e.captured) : '?'} - {e.lost ? fmtDate(e.lost) : 'Present'}{e.defences != null ? ` · ${e.defences} def.` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Most Wins</div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {sorted.map(([name, data], i) => (
                  <div key={name} style={{ fontSize: 12, padding: '3px 4px', borderRadius: 4, color: '#fff', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text-muted)', width: 24, flexShrink: 0 }}>#{i + 1}</span>
                    {data.teamName ? null : data.holders.map(h => (
                      <span key={h.uid} style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => navigateToEntity('worker', h.uid)}>
                        {h.picture ? <img src={img('People/' + h.picture)} alt="" style={{ width: 75, height: 75, objectFit: 'cover', borderRadius: 6, verticalAlign: 'middle' }} /> : <div style={{ width: 75, height: 75, background: 'var(--bg-tertiary)', borderRadius: 6, display: 'inline-block' }} />}
                      </span>
                    ))}
                    <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => { const f = data.holders[0]; if (f) navigateToEntity('worker', f.uid) }}>{name}</span>
                    <span style={{ color: '#fff', flexShrink: 0 }}>{data.count}x</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Longest Reign</div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {[...entries].sort((a, b) => {
                  const dA = a.captured ? daysBetween(a.captured, a.lost || (gameInfo?.current_date ?? '')) : 0
                  const dB = b.captured ? daysBetween(b.captured, b.lost || (gameInfo?.current_date ?? '')) : 0
                  return dB - dA
                }).slice(0, 10).map((e, i) => {
          const reignDays = e.captured ? daysBetween(e.captured, e.lost || (gameInfo?.current_date ?? '')) : 0
                  const valid = e.holders.filter(h => h.name)
                  return (
                    <div key={i} style={{ fontSize: 12, padding: '3px 4px', borderRadius: 4, color: '#fff', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--text-muted)', width: 24, flexShrink: 0 }}>#{i + 1}</span>
                      {e.team_name ? (
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{e.team_name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{e.captured ? fmtDate(e.captured) : '?'} - {e.lost ? fmtDate(e.lost) : 'Present'}</div>
                        </span>
                      ) : (
                        <>
                          {valid.map(h => (
                            <span key={h.uid} style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => navigateToEntity('worker', h.uid)}>
                              {h.picture ? <img src={img('People/' + h.picture)} alt="" style={{ width: 75, height: 75, objectFit: 'cover', borderRadius: 6, verticalAlign: 'middle' }} /> : <div style={{ width: 75, height: 75, background: 'var(--bg-tertiary)', borderRadius: 6, display: 'inline-block' }} />}
                            </span>
                          ))}
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }} onClick={() => valid[0] && navigateToEntity('worker', valid[0].uid)}>{valid.map(h => h.name).join(' & ')}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{e.captured ? fmtDate(e.captured) : '?'} - {e.lost ? fmtDate(e.lost) : 'Present'}</div>
                          </span>
                        </>
                      )}
                      <span style={{ color: '#fff', flexShrink: 0 }}>{reignDays} days</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Most Days</div>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {sortedByDays.map(([name, data], i) => (
                  <div key={name} style={{ fontSize: 12, padding: '3px 4px', borderRadius: 4, color: '#fff', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text-muted)', width: 24, flexShrink: 0 }}>#{i + 1}</span>
                    {data.teamName ? null : data.holders.map(h => (
                      <span key={h.uid} style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => navigateToEntity('worker', h.uid)}>
                        {h.picture ? <img src={img('People/' + h.picture)} alt="" style={{ width: 75, height: 75, objectFit: 'cover', borderRadius: 6, verticalAlign: 'middle' }} /> : <div style={{ width: 75, height: 75, background: 'var(--bg-tertiary)', borderRadius: 6, display: 'inline-block' }} />}
                      </span>
                    ))}
                    <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => { const f = data.holders[0]; if (f) navigateToEntity('worker', f.uid) }}>{name}</span>
                    <span style={{ color: '#fff', flexShrink: 0 }}>{data.days} days</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Prestige</div>
              {belt.prestige_history && belt.prestige_history.length > 0 ? (() => {
                const vals = belt.prestige_history
                const maxV = Math.max(...vals, 1)
                const minV = Math.min(...vals)
                const range = (maxV - minV) || 10
                const w = 220, h = 110, padL = 30, padR = 10, padT = 10, padB = 20
                const plotW = w - padL - padR, plotH = h - padT - padB
                const allLabels = ['12m', '11m', '10m', '9m', '8m', '7m', '6m', '5m', '4m', '3m', '2m', '1m', 'Now']
                const labels = allLabels.slice(-vals.length)
                const pts = vals.map((v, i) => ({
                  x: padL + i * (plotW / Math.max(vals.length - 1, 1)),
                  y: padT + plotH - ((v - minV) / range) * plotH,
                  v
                }))
                return (
                  <svg width={w} height={h} style={{ display: 'block', width: '100%' }}>
                    <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                    {pts.length > 1 && pts.slice(0, -1).map((p, i) => (
                      <line key={i} x1={p.x} y1={p.y} x2={pts[i + 1].x} y2={pts[i + 1].y} stroke="#60a5fa" strokeWidth={2} />
                    ))}
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={3} fill="#60a5fa" />
                        <text x={p.x} y={padT + plotH + 14} textAnchor="middle" fill="var(--text-muted)" fontSize={8}>{labels[i]}</text>
                      </g>
                    ))}
                    {(() => {
                      const steps = 4
                      return Array.from({ length: steps + 1 }, (_, i) => {
                        const val = minV + (range * i) / steps
                        const y = padT + plotH - (i / steps) * plotH
                        return <text key={i} x={padL - 4} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize={8}>{Math.round(val)}</text>
                      })
                    })()}
                  </svg>
                )
              })() : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {belt.prestige != null ? `Current: ${formatRatingPct(belt.prestige.pct, ratingFormat)}` : 'No data'}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
