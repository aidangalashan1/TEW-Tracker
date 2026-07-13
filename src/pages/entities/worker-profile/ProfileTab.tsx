import { REGION_NAMES } from '../../../modules/worker-list/regions'
import { ConditionBody } from './ConditionBody'
import { RatingBadge } from './RatingBadge'
import { SectionCard } from './SectionCard'

interface ProfileTabProps {
  w: any; stars: any; img: any; focusedFed: any; playerFed: any; allFeds: any;
  navigateToEntity: (type: string, uid: number) => void;
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
  const { w, img, AREAS, ATTR_MAP, ATTR_TOOLTIP, condMaleHead, condMaleBody, condMaleLegs, condMaleArmLeft, condMaleArmRight, condFemHead, condFemBody, condFemLegs, condFemArmLeft, condFemArmRight, wrestlerIcon, refereeIcon, announcerIcon, managerIcon, personalityIcon, roadAgentIcon } = props

  const isFem = (w as any).Gender === 5 || (w as any).Gender === 8

  return (
    <div className="flex-1 overflow-auto flex px-5 pb-5">
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
            const active = w.positions.includes(name as string)
            return (
            <div key={name as string} className="flex-col items-center p-1 gap-1" style={{ opacity: active ? 1 : 0.3 }}>
              <img src={icon as string} alt="" className="w-24 h-24" style={{ filter: active ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.4)' }} />
              <span className="text-sm text-semibold text-center" style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{name as string}</span>
            </div>
            )
          })}
        </div>
        {w.physical && (
          <ConditionBody physical={w.physical} isFem={isFem} img={{ head: isFem ? condFemHead : condMaleHead, armLeft: isFem ? condFemArmLeft : condMaleArmLeft, armRight: isFem ? condFemArmRight : condMaleArmRight, body: isFem ? condFemBody : condMaleBody, legs: isFem ? condFemLegs : condMaleLegs }} />
        )}
      </div>

      <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />

      <div className="flex-1 flex flex-col min-w-0 gap-3">
        <div className="flex min-w-0 overflow-auto gap-3">
          {[
            { label: 'Primary', keys: ['brawl', 'puroresu', 'hardcore', 'technical', 'air'], group: 'max' },
            { label: 'Mental', keys: ['psych', 'experience', 'respect', 'reputation'], group: 'avg' },
            { label: 'Performance', keys: ['charisma', 'mic', 'acting', 'flash', 'star', 'looks', 'menace'], group: 'avg' },
            { label: 'Fundamental', keys: ['basics', 'selling', 'consistency', 'safety'], group: 'avg' },
            { label: 'Physical', keys: ['stamina', 'athletic', 'power', 'toughness', 'injury'], group: 'avg' },
            { label: 'Other', keys: ['announcing', 'colour', 'refereeing'], extra: ['Business', 'Booking_Reputation', 'Booking_Skill'], group: 'avg' },
          ].map(col => {
            const s = w.skills
            const vals = col.keys.map(k => Number((s as any)?.[k]?.pct ?? 0))
            const groupVal = col.group === 'max' ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0) / vals.length
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
                <div className="flex-between text-lg mb-1">
                  <span className="text-primary">{col.label}</span>
                  <RatingBadge val={pct} />
                </div>
                {allItems.map((item, i) => (
                  <div key={item.label} className="flex-between text-base px-1" style={{ padding: '3px 4px', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
                    <span className="text-secondary">{item.label}</span>
                    <span className="text-primary text-mono text-bold text-right" style={{ minWidth: 30 }}>{item.val}</span>
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
                <div className="flex-between text-lg mb-1">
                  <span className="items-center text-primary gap-1">
                    {areaFlagUrl && <img src={areaFlagUrl} alt="" className="object-cover" style={{ width: 18, height: 14, borderRadius: 2 }} />}
                    {area}
                  </span>
                  <RatingBadge val={pct} />
                </div>
                {regionIds.map((rid, i) => {
                  const v = Number(w.overness?.[rid - 1]?.value?.pct ?? 0)
                  return (
                    <div key={rid} className="flex-between text-base px-1" style={{ padding: '3px 4px', background: i % 2 === 1 ? 'rgba(255,255,255,0.03)' : undefined }}>
                      <span className="text-secondary">{REGION_NAMES[rid] || `Region ${rid}`}</span>
                      <span className="text-primary text-mono text-bold text-right" style={{ minWidth: 30 }}>{v}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="self-stretch flex-shrink-0 mx-16 bg-text-muted" style={{ width: 1 }} />

      <div className="flex-shrink-0 w-180 flex flex-col pt-1 gap-2">
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
          return (
            <>
              <div><div className="section-label mb-1">Height</div><div className="text-base text-bold text-primary">{heightStr}</div></div>
              <div><div className="section-label mb-1">Weight</div><div className="text-base text-bold text-primary">{weight ? `${weight} lbs` : '-'}</div></div>
              <div><div className="section-label mb-1">Race</div><div className="text-base text-bold text-primary">{raceVal ? (raceLabels[raceVal] || 'Unknown') : '-'}</div></div>
              <div><div className="section-label mb-1">Body Type</div><div className="text-base text-bold text-primary">{bodyVal != null ? (bodyLabels[bodyVal] || 'Unknown') : '-'}</div></div>
              <div><div className="section-label mb-1">Style</div><div className="text-base text-bold text-primary">{w.style || '-'}</div></div>
              <div><div className="section-label mb-1">Sexuality</div><div className="text-base text-bold text-primary">{sexualityVal ? (sexLabels[sexualityVal] || 'Unknown') : '-'}</div></div>
              <div><div className="section-label mb-1">Mask</div><div className="text-base text-bold" style={{ color: maskVal === -1 ? 'var(--text-muted)' : 'var(--text-primary)' }}>{maskVal === -1 ? 'No' : 'Yes'}</div></div>
              {(w.attributes && w.attributes.length > 0) && (() => {
                const persIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]
                const pers = w.attributes.filter((id: number) => persIds.includes(id))
                const other = w.attributes.filter((id: number) => !persIds.includes(id))
                return (<>
                  {pers.length > 0 && (
                    <>
                      <div className="w-full h-px bg-text-muted" />
                      <div>
                        <div className="text-sm text-semibold text-accent letter-spacing-0-5 mb-1">Personality</div>
                        <div className="text-base text-bold text-primary lh-1-6">
                          {pers.map((id: number, i: number) => (
                            <div key={i} data-tooltip={ATTR_TOOLTIP[id] || ''}>{ATTR_MAP[id] || `Attribute ${id}`}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {other.length > 0 && (
                    <>
                      <div className="w-full h-px bg-text-muted" />
                      <div>
                        <div className="section-label mb-1">Attributes</div>
                        <div className="text-base text-bold text-primary lh-1-6">
                          {other.map((id: number, i: number) => (
                            <div key={i} data-tooltip={ATTR_TOOLTIP[id] || ''}>{ATTR_MAP[id] || `Attribute ${id}`}</div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>)
              })()}
            </>
          )
        })()}
      </div>

      {(w as any).belt_history && (w as any).belt_history.length > 0 && <div className="px-5 mt-3">
        <SectionCard header="Title History">
          <div className="flex overflow-auto gap-3">
            {((w as any).belt_history as any[]).map((reign: any, i: number) => (
              <div key={i} className="items-center flex-shrink-0 p-1 px-2 bg-primary rounded-md gap-2">
                {reign.belt_picture && <img src={img('Belts/' + reign.belt_picture)} alt="" className="w-28 h-28 object-contain rounded-sm" />}
                <div>
                  <div className="text-semibold text-primary text-md">{reign.belt_name}</div>
                  <div className="text-xs text-muted">{reign.captured ? reign.captured.split(' ')[0] : '?'}{reign.lost ? ' - ' + reign.lost.split(' ')[0] : ' - Present'} · {reign.defences} def.</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>}

      {(w as any).moves && (w as any).moves.length > 0 && <div className="px-5 mt-3">
        <SectionCard header="Moveset">
          <div className="flex flex-col gap-3">
            {[3,1,2].map(lvl => {
              const moves = ((w as any).moves as any[]).filter((m: any) => m.level === lvl)
              if (moves.length === 0) return null
              return <div key={lvl}>
                  <div className="text-xs text-semibold text-muted mb-1 letter-spacing-0-5">{lvl === 3 ? 'Signature' : lvl === 1 ? 'Finisher' : 'Uber Finisher'}</div>
                  {moves.slice(0, 8).map((m: any, j: number) => <div key={j} className="text-sm text-secondary lh-1-5" style={{ padding: '2px 0', borderBottom: j < moves.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      {m.name}{m.desc ? <span className="text-muted"> - {m.desc}</span> : ''}
                    </div>)}
                </div>
            })}
          </div>
        </SectionCard>
      </div>}

      {w.performance && w.performance.last_5_segment_ratings && w.performance.last_5_segment_ratings.length > 0 && <div className="px-5 mt-3">
        <SectionCard header="Recent Segments">
          <div className="flex overflow-auto gap-3">
            {w.performance.last_5_segment_ratings.slice(0, 5).map((seg: any, i: number) => {
              const pct = Number(seg.rating?.pct ?? seg.rating ?? 0)
              return <div key={i} className="flex-shrink-0 p-2 bg-primary rounded-md" style={{ width: 160 }}>
                  <div className="text-bold text-primary text-md mb-1">{seg.label || 'Segment'}</div>
                  <div className="text-xs text-muted mb-1">{seg.card || ''}</div>
                  <RatingBadge val={pct} />
                </div>
            })}
          </div>
        </SectionCard>
      </div>}

    </div>
  )
}
