import { REGION_NAMES } from '../../../modules/worker-list/regions'
import { useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../../api'
import useSWR from '../../../hooks/useApi'
import { ConditionBody } from './ConditionBody'
import { RatingBadge } from './RatingBadge'
import { ratingColor } from '../../../lib/colors'
import { Tooltip } from '../../../components/Tooltip'
import rightIcon from '../../../assets/UI icons/right.png'

interface ProfileTabProps {
  w: any; stars: any; img: any; focusedFed: any; playerFed: any; allFeds: any; gameInfo: any;
  navigateToEntity: (type: string, uid: number) => void;
  onViewForm?: () => void;
  AREAS: Record<string, number[]>;
  ATTR_MAP: Record<number, string>;
  ATTR_TOOLTIP: Record<number, string>;
  condMaleHead: string; condMaleBody: string; condMaleLegs: string;
  condMaleArmLeft: string; condMaleArmRight: string;
  condFemHead: string; condFemBody: string; condFemLegs: string;
  condFemArmLeft: string; condFemArmRight: string;
  wrestlerIcon: string; refereeIcon: string; announcerIcon: string;
  managerIcon: string; personalityIcon: string; roadAgentIcon: string;
}

export function ProfileTab(props: ProfileTabProps) {
  const { w, img, AREAS, ATTR_MAP, ATTR_TOOLTIP, condMaleHead, condMaleBody, condMaleLegs, condMaleArmLeft, condMaleArmRight, condFemHead, condFemBody, condFemLegs, condFemArmLeft, condFemArmRight, wrestlerIcon, refereeIcon, announcerIcon, managerIcon, personalityIcon, roadAgentIcon, onViewForm, gameInfo } = props

  const isFem = (w as any).Gender === 5 || (w as any).Gender === 8
  const [tip, setTip] = useState<{ node: React.ReactNode; x: number; y: number } | null>(null)
  const [expandedBelts, setExpandedBelts] = useState<Set<number>>(new Set())
  const tipRef = useRef<HTMLDivElement>(null)
  const { data: workerForm } = useSWR(w?.uid ? 'form-' + w.uid : null, () => api.roster.form(w.uid))
  const fedUid = w?.contract?.fed_uid
  const { data: fedBelts } = useSWR(fedUid ? 'fed-belts-' + fedUid : null, () => api.fed.belts(fedUid))
  const beltPrestige = useMemo(() => {
    const m = new Map<number, number>()
    if (fedBelts?.belts) {
      for (const b of fedBelts.belts) m.set(b.uid, b.prestige?.pct ?? 0)
    }
    return m
  }, [fedBelts])
  const formSegments = workerForm?.segments ?? []
  const recentSegments = formSegments.slice(0, 10).reverse()

  return (
    <div className="flex-1 flex px-5 pt-3 pb-5" style={{ overflow: 'hidden' }}>
      <div className="flex-shrink-0 w-200">
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Wrestler', wrestlerIcon],
            ['Occasional', wrestlerIcon],
            ['Manager', managerIcon],
            ['Personality', personalityIcon],
            ['Road Agent', roadAgentIcon],
            ['Announcer', announcerIcon],
            ['Colour', announcerIcon],
            ['Referee', refereeIcon],
          ].map(([name, icon]) => {
            const active = w.positions?.includes(name as string) ?? false
            return (
            <div key={name as string} className="flex-col items-center p-1 gap-1" style={{ opacity: active ? 1 : 0.3 }}>
              <img src={icon as string} alt="" className="w-24 h-24" style={{ filter: active ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.4)' }} />
              <span className="text-md text-semibold text-center" style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{name as string}</span>
            </div>
            )
          })}
        </div>
        {w.physical && (
          <ConditionBody physical={w.physical} isFem={isFem} img={{ head: isFem ? condFemHead : condMaleHead, armLeft: isFem ? condFemArmLeft : condMaleArmLeft, armRight: isFem ? condFemArmRight : condMaleArmRight, body: isFem ? condFemBody : condMaleBody, legs: isFem ? condFemLegs : condMaleLegs }} />
        )}
        {(w as any).injury_count > 0 && (
          <div className="mt-3">
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Injury History</div>
            <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.6 }}>
              {w.injury_count} career injur{w.injury_count === 1 ? 'y' : 'ies'}
            </div>
          </div>
        )}
      </div>

      <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />

      <div className="flex-1 flex flex-col min-w-0 gap-3">
        <div className="flex min-w-0 overflow-auto gap-3">
          {[
            { label: 'Primary', keys: ['brawl', 'puroresu', 'hardcore', 'technical', 'air', 'flash'], group: 'max' },
            { label: 'Mental', keys: ['psych', 'experience', 'respect', 'reputation'], group: 'avg' },
            { label: 'Performance', keys: ['charisma', 'mic', 'acting', 'star', 'looks', 'menace'], group: 'perf' },
            { label: 'Fundamental', keys: ['basics', 'selling', 'consistency', 'safety'], group: 'avg' },
            { label: 'Physical', keys: ['stamina', 'athletic', 'power', 'toughness', 'injury'], group: 'avg' },
            { label: 'Other', keys: ['announcing', 'colour', 'refereeing'], extra: ['Business', 'Booking_Reputation', 'Booking_Skill'], group: 'avg' },
          ].map(col => {
            const s = w.skills
            const vals = col.keys.map(k => Number((s as any)?.[k]?.pct ?? 0))
            const groupVal = col.group === 'max' ? Math.max(...vals) : col.group === 'perf' ? w.perf_score : vals.reduce((a, b) => a + b, 0) / vals.length
            const pct = Math.round(groupVal)
            const labelMap: Record<string, string> = {
              brawl: 'Brawling', puroresu: 'Puroresu', hardcore: 'Hardcore', technical: 'Technical',
              air: 'Aerial', psych: 'Psychology', experience: 'Experience', respect: 'Respect',
              reputation: 'Reputation', charisma: 'Charisma', mic: 'Microphone', acting: 'Acting',
              star: 'Star Quality', looks: 'Looks', menace: 'Menace', basics: 'Basics',
              selling: 'Selling', consistency: 'Consistency', safety: 'Safety', stamina: 'Stamina',
              athletic: 'Athleticism', power: 'Power', toughness: 'Toughness', injury: 'Injury Res.',
              flash: 'Flashiness', announcing: 'Play by Play', colour: 'Colour', refereeing: 'Refereeing',
            }
            const extraVals = (col.extra || []).map(k => { const v = (w as any)[k]; return v != null ? Math.round(v / 10) : null })
            const extraLabels: Record<string, string> = { Business: 'Business', Booking_Reputation: 'Booking Rep.', Booking_Skill: 'Booking Skill' }
            const allItems = [
              ...col.keys.map((k, i) => ({ label: labelMap[k] || k, val: vals[i] })),
              ...(col.extra || []).map((k, i) => ({ label: extraLabels[k] || k, val: extraVals[i] })).filter(x => x.val != null),
            ] as { label: string; val: number }[]
            return (
              <div key={col.label} className="flex-1 min-w-0">
                <div className="flex-between mb-1">
                  <span className="section-label" style={{ color: '#fff' }}>{col.label}</span>
                  <RatingBadge val={pct} />
                </div>
                {allItems.map((item, i) => (
                  <div key={item.label} className="flex-between px-1" style={{ padding: '3px 4px', fontSize: 12, background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ color: 'var(--text-primary)', minWidth: 30, textAlign: 'right' }}>{item.val}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div className="w-full h-px flex-shrink-0 bg-text-muted" />

        <div className="flex min-w-0 overflow-auto gap-3">
          {Object.entries(AREAS).map(([area, regionIds]) => {
            const vals = regionIds.map(rid => Number(w.overness?.[rid - 1]?.value?.pct ?? 0))
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length
            const pct = Math.round(avg)
            const areaFlagMap: Record<string, string> = {
              'USA': 'us', 'Canada': 'ca', 'Mexico': 'mx', 'British Isles': 'gb',
              'Japan': 'jp', 'Europe': 'eu', 'Oceania': 'au', 'India': 'in',
            }
            const flagCode = areaFlagMap[area]
            const areaFlagUrl = flagCode ? new URL(`../../../assets/flag-icons-main/flags/4x3/${flagCode}.svg`, import.meta.url).href : ''
            return (
              <div key={area} className="flex-1 min-w-0">
                <div className="flex-between mb-1">
                  <span className="section-label items-center gap-1" style={{ color: '#fff' }}>
                    {areaFlagUrl && <img src={areaFlagUrl} alt="" className="object-cover" style={{ width: 18, height: 14, borderRadius: 2 }} />}
                    {area}
                  </span>
                  <RatingBadge val={pct} />
                </div>
                {regionIds.map((rid, i) => {
                  const v = Number(w.overness?.[rid - 1]?.value?.pct ?? 0)
                  return (
                    <div key={rid} className="flex-between px-1" style={{ padding: '3px 4px', fontSize: 12, background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{REGION_NAMES[rid] || `Region ${rid}`}</span>
                      <span style={{ color: 'var(--text-primary)', minWidth: 30, textAlign: 'right' }}>{v}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="w-full h-px flex-shrink-0 bg-text-muted" />

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {recentSegments.length > 0 && (() => {
        const ordered = [...recentSegments]
        const allRatings = ordered.map((s: any) => s.rating ?? 0)
        const maxR = Math.max(...allRatings, 1)
        const minR = Math.min(...allRatings)
        const axisMin = Math.floor(minR / 100) * 100
        const axisMax = Math.ceil(maxR / 100) * 100
        const range = (axisMax - axisMin) || 100
        const pad = 20, h2 = 200, w2 = 350
        const plotW = w2
        const pts = ordered.map((s: any, i: number) => ({
          x: pad + i * ((plotW - pad - 4) / Math.max(ordered.length - 1, 1)),
          y: h2 - 5 - ((s.rating - axisMin) / range) * (h2 - 14), s
        }))
        const lineD = pts.map((p, i: number) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')
        const steps = Math.round((axisMax - axisMin) / 10) + 1
        const gridlines = Array.from({ length: steps }, (_, i) => axisMin + i * 100)
        const perf = w.performance
        const avgSeg = perf?.avg_segment_rating?.pct ?? 0
        const avgMatch = perf?.avg_match_rating?.pct ?? 0
        const avgAngle = perf?.avg_angle_rating?.pct ?? 0
        return (
          <div className="flex-shrink-0" style={{ padding: '0 20px' }}>
            <div className="flex items-center gap-1" style={{ marginBottom: 2 }}>
              <span className="section-label" style={{ color: '#fff' }}>Form</span>
              {onViewForm && <span className="cursor-pointer flex" onClick={onViewForm} title="View full form history"><img src={rightIcon} alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(0.6)' }} /></span>}
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.3px', marginBottom: 1, alignItems: 'center' }}>
              <span className="flex items-center gap-1" style={{ fontSize: 10 }}>Segments <span style={{ background: ratingColor(avgSeg), color: '#fff', borderRadius: 3, padding: '0 6px', fontWeight: 700, fontSize: 12, lineHeight: '20px', display: 'inline-block', fontFamily: 'var(--font-family)' }}>{avgSeg}</span></span>
                    <span className="flex items-center gap-1" style={{ fontSize: 10 }}>Matches <span style={{ background: ratingColor(avgMatch), color: '#fff', borderRadius: 3, padding: '0 6px', fontWeight: 700, fontSize: 12, lineHeight: '20px', display: 'inline-block', fontFamily: 'var(--font-family)' }}>{avgMatch}</span></span>
                    <span className="flex items-center gap-1" style={{ fontSize: 10 }}>Angles <span style={{ background: ratingColor(avgAngle), color: '#fff', borderRadius: 3, padding: '0 6px', fontWeight: 700, fontSize: 12, lineHeight: '20px', display: 'inline-block', fontFamily: 'var(--font-family)' }}>{avgAngle}</span></span>
            </div>
            <svg width={w2} height={h2} className="block" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              {gridlines.map(val => {
                const y = h2 - 5 - ((val - axisMin) / range) * (h2 - 14)
                return <line key={val} x1={pad} y1={y} x2={plotW - 4} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
              })}
              {gridlines.map(val => {
                const y = h2 - 5 - ((val - axisMin) / range) * (h2 - 14)
                return <text key={val} x={0} y={y + 3} fill="var(--text-muted)" fontSize={8}>{Math.round(val)}</text>
              })}
              {pts.length > 1 && <path d={`${lineD} L${pts[pts.length - 1].x},${h2 - 5} L${pts[0].x},${h2 - 5} Z`} fill="url(#sparkGrad)" />}
              <path d={lineD} fill="none" stroke="#38bdf8" strokeWidth={1.5} />
              {pts.map((p, i) => {
                const r = p.s.rating ?? 0
                const dotColor = ratingColor(Math.round(r))
                const seg = p.s as any
                const showName = seg.card || ''
                const segLabel = seg.log_entry ? seg.log_entry : (seg.label || 'Segment')
                const pct = Math.round(r)
                const others = [...(seg.allies || []), ...(seg.opponents || [])].slice(0, 4)
                const logoPath = seg.card_logo_tv ? 'TV/' : seg.card_logo_event ? 'Events/' : 'Logos/'
                const showLogo = seg.card_logo ? img(logoPath + seg.card_logo) : ''
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={3} fill={dotColor} stroke={dotColor} strokeWidth={1} className="cursor-pointer"
                      onMouseOver={(e) => {
                        setTip({
                          node: (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {showLogo && <img src={showLogo} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }} />}
                                {showName && <div style={{ fontWeight: 700, fontSize: 12 }}>{showName}</div>}
                              </div>
                              <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{segLabel} <span style={{ background: ratingColor(pct), color: '#fff', borderRadius: 3, padding: '0 5px', fontWeight: 700, fontSize: 10, lineHeight: '16px', display: 'inline-block' }}>{pct}</span></div>
                              {others.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {others.map((o: any, j: number) => (
                                  <img key={j} src={img('People/' + o.picture)} alt="" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }}
                                    onError={(ev) => { (ev.target as HTMLElement).style.display = 'none' }} />
                                ))}
                              </div>}
                            </div>
                          ),
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }}
                      onMouseMove={(e) => setTip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                      onMouseOut={() => setTip(null)} />
                  </g>
                )
              })}
              {tip && createPortal(
                <div style={{
                  position: 'fixed', left: Math.max(10, Math.min(tip.x! - 10, window.innerWidth - 330)), top: tip.y + 15, zIndex: 10000,
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  fontSize: 11, padding: '8px 12px', borderRadius: 6,
                  maxWidth: 320, whiteSpace: 'normal', lineHeight: 1.5,
                  border: '1px solid var(--border-color)', pointerEvents: 'none',
                }}>{tip.node}</div>,
                document.body
              )}
            </svg>
          </div>
        )
      })()}
      </div>
          {!w.retired && (w.positions?.includes('Wrestler') || w.positions?.includes('Occasional')) && <><div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />
          <div style={{ minWidth: 90, padding: '0 8px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>Win/Loss</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flex: 1 }}>
              <span style={{ background: '#22c55e', color: '#fff', borderRadius: 4, padding: '0 10px', fontFamily: 'var(--font-family)', fontSize: 36, fontWeight: 700, lineHeight: '48px' }}>{w.win_loss?.wins ?? 0}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 32, fontWeight: 700 }}>-</span>
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 4, padding: '0 10px', fontFamily: 'var(--font-family)', fontSize: 36, fontWeight: 700, lineHeight: '48px' }}>{w.win_loss?.losses ?? 0}</span>
              {w.win_loss?.draws ? <span style={{ background: '#6b7280', color: '#fff', borderRadius: 3, padding: '0 4px', fontFamily: 'var(--font-family)', fontSize: 12, fontWeight: 700, lineHeight: '20px' }}>{w.win_loss.draws}D</span> : null}
            </div>
          </div></>}
          <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />
          <div style={{ flex: 1, overflowY: 'auto', paddingLeft: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Title History</div>
            {(w as any).belt_history && (w as any).belt_history.length > 0 ? (() => {
              const byBelt = new Map<number, { name: string; picture: string; reigns: { captured: string; lost: string; defences: number }[] }>()
              for (const r of (w as any).belt_history) {
                const existing = byBelt.get(r.belt_uid)
                if (existing) {
                  existing.reigns.push(r)
                } else {
                  byBelt.set(r.belt_uid, { name: r.belt_name, picture: r.belt_picture, reigns: [r] })
                }
              }
              const fmtDate = (d: string) => {
                if (!d) return '?'
                const dt = new Date(d)
                if (isNaN(dt.getTime())) return d.split(' ')[0] || '?'
                const day = dt.getDate()
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                const suffix = day >= 11 && day <= 13 ? 'th' : ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][day % 10]
                return `${day}${suffix} ${months[dt.getMonth()]} ${dt.getFullYear()}`
              }
              const daysBetween = (a: string, b: string) => {
                if (!a) return 0
                const end = b || gameInfo?.current_date || ''
                if (!end) return 0
                const da = new Date(a), db = new Date(end)
                return Math.round((db.getTime() - da.getTime()) / 86400000)
              }
              return [...byBelt.entries()].sort((a, b) => {
                const pA = beltPrestige.get(a[0]) ?? 0
                const pB = beltPrestige.get(b[0]) ?? 0
                if (pB !== pA) return pB - pA
                return b[1].reigns.length - a[1].reigns.length
              }).map(([beltUid, data]) => (
                <div key={beltUid} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', minWidth: 28, textAlign: 'right', fontFamily: 'var(--font-family)' }}>{data.reigns.length}x</span>
                    {data.picture && <img src={img('Belts/' + data.picture)} alt="" style={{ width: 60, height: 48, objectFit: 'contain' }} />}
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }} onClick={() => setExpandedBelts(prev => { const n = new Set(prev); if (n.has(beltUid)) n.delete(beltUid); else n.add(beltUid); return n })}>{data.name}</span>
                    <span style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, fontWeight: 700, userSelect: 'none' }} onClick={() => setExpandedBelts(prev => { const n = new Set(prev); if (n.has(beltUid)) n.delete(beltUid); else n.add(beltUid); return n })}>{expandedBelts.has(beltUid) ? '−' : '+'}</span>
                  </div>
                  {expandedBelts.has(beltUid) && (
                    <div style={{ fontSize: 11, lineHeight: 1.7, paddingLeft: 92 }}>
                      {[...data.reigns].sort((a, b) => (b.captured || '').localeCompare(a.captured || '')).slice(0, 5).map((r, ri) => (
                        <div key={ri} style={{ color: '#fff' }}>
                          {fmtDate(r.captured)} - {r.lost ? fmtDate(r.lost) : 'Present'} ({Math.max(0, daysBetween(r.captured, r.lost))}d)
                          {r.defences > 0 && <span style={{ color: 'var(--text-muted)' }}> · {r.defences} def.</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            })() : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No title history</div>
            )}
          </div>
        </div>
      </div>

      <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />

      <div className="flex-shrink-0 w-180 flex flex-col pt-1 gap-2" ref={tipRef} data-sidebar>
        {(() => {
          const hVal = (w as any).WorkerHeight
          const weight = (w as any).WorkerWeight
          const raceVal = (w as any).Race
          const bodyVal = (w as any).BodyType
          const sexualityVal = (w as any).Sexuality
          const maskVal = (w as any).Mask
          const raceLabels: Record<number, string> = {
            1: 'White', 2: 'Black', 3: 'Asian', 4: 'Hispanic',
            5: 'Native American', 6: 'Middle Eastern', 7: 'South Asian',
            8: 'Pacific Islander', 9: 'Other',
          }
          const bodyLabels: Record<number, string> = {
            0: 'Average', 1: 'Skinny', 2: 'Toned', 3: 'Muscular',
            4: 'Ripped', 5: 'Flabby', 6: 'Bulky', 7: 'Obese',
          }
          const sexLabels: Record<number, string> = {
            1: 'Heterosexual', 2: 'Homosexual', 3: 'Bisexual',
            4: 'Pansexual', 5: 'Asexual',
          }
          let heightStr = '-'
          if (hVal != null && hVal > 0) {
            const totalInches = 35 + hVal
            const ft = Math.floor(totalInches / 12)
            const inc = totalInches % 12
            heightStr = `${ft}'${inc}"`
          }
          return (<>
            <div><div className="section-label" style={{ color: '#fff' }}>Height</div><div>{heightStr}</div></div>
            <div><div className="section-label" style={{ color: '#fff' }}>Weight</div><div>{weight ? `${weight} lbs` : '-'}</div></div>
            <div><div className="section-label" style={{ color: '#fff' }}>Race</div><div>{raceVal ? (raceLabels[raceVal] || 'Unknown') : '-'}</div></div>
            <div><div className="section-label" style={{ color: '#fff' }}>Body Type</div><div>{bodyVal != null ? (bodyLabels[bodyVal] || 'Unknown') : '-'}</div></div>
            <div><div className="section-label" style={{ color: '#fff' }}>Style</div><div>{w.style || '-'}</div></div>
            <div><div className="section-label" style={{ color: '#fff' }}>Sexuality</div><div>{sexualityVal ? (sexLabels[sexualityVal] || 'Unknown') : '-'}</div></div>
            <div><div className="section-label" style={{ color: '#fff' }}>Mask</div><div style={{ color: maskVal === -1 ? 'var(--text-muted)' : 'var(--text-primary)' }}>{maskVal === -1 ? 'No' : 'Yes'}</div></div>

            {(w.attributes && w.attributes.length > 0) && (() => {
              const persIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]
              const pers = w.attributes.filter((id: number) => persIds.includes(id))
              const other = w.attributes.filter((id: number) => !persIds.includes(id))
              return (<>
                {pers.length > 0 && (
                  <>
                    <div className="w-full h-px bg-text-muted" />
                    <div>
                      <div className="section-label mb-1" style={{ color: '#fff' }}>Personality</div>
                      <div style={{ lineHeight: 1.6 }}>
                        {pers.map((id: number, i: number) => (
                          <div key={i}><Tooltip text={ATTR_TOOLTIP[id] || ATTR_MAP[id] || `Attribute ${id}`}>{ATTR_MAP[id] || `Attribute ${id}`}</Tooltip></div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {other.length > 0 && (
                  <>
                    <div className="w-full h-px bg-text-muted" />
                    <div>
                      <div className="section-label mb-1" style={{ color: '#fff' }}>Attributes</div>
                      <div style={{ lineHeight: 1.6 }}>
                        {other.map((id: number, i: number) => (
                          <div key={i}><Tooltip text={ATTR_TOOLTIP[id] || ATTR_MAP[id] || `Attribute ${id}`}>{ATTR_MAP[id] || `Attribute ${id}`}</Tooltip></div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>)
            })()}

            {(w as any).moves && (w as any).moves.length > 0 && (() => {
              const levels = [3, 1, 2]
              const levelLabels: Record<number, string> = { 3: 'Signature', 1: 'Finisher', 2: 'Uber Finisher' }
              return (<>
                <div className="w-full h-px bg-text-muted" />
                <div>
                  <div className="section-label mb-1" style={{ color: '#fff', fontSize: 12 }}>Moveset</div>
                  {levels.map(lvl => {
                    const moves = ((w as any).moves as any[]).filter((m: any) => m.level === lvl)
                    if (moves.length === 0) return null
                    return (
                      <div key={lvl} style={{ marginTop: 4, paddingLeft: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.3, marginBottom: 2 }}>{levelLabels[lvl]}</div>
                        {moves.slice(0, 8).map((m: any, j: number) => (
                          <div key={j} style={{ fontSize: 12, lineHeight: 1.5 }}>{m.desc ? <Tooltip text={m.desc}>{m.name}</Tooltip> : m.name}</div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </>)
            })()}
          </>)
        })()}
      </div>

    </div>
  )
}
