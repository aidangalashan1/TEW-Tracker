import { Stars } from '../../../components/Stars'
import iPsych from '../../../assets/UI icons/scouting/psychology.png'
import iReliable from '../../../assets/UI icons/scouting/reliable.png'
import iTechnical from '../../../assets/UI icons/scouting/technical.png'
import iCharisma from '../../../assets/UI icons/scouting/charismatic.png'
import iMic from '../../../assets/UI icons/scouting/microphone.png'
import iStar from '../../../assets/UI icons/scouting/star quality.png'
import iSelling from '../../../assets/UI icons/scouting/selling.png'
import iStamina from '../../../assets/UI icons/scouting/stamina.png'
import iInjury from '../../../assets/UI icons/scouting/injury record.png'
import iAthletic from '../../../assets/UI icons/scouting/athletic.png'
import iStrength from '../../../assets/UI icons/scouting/strength.png'
import iSafety from '../../../assets/UI icons/scouting/safety.png'
import iTag from '../../../assets/UI icons/scouting/tag specialist.png'
import iMarket from '../../../assets/UI icons/scouting/marketable.png'
import iPositive from '../../../assets/UI icons/scouting/positive influence.png'
import iNegative from '../../../assets/UI icons/scouting/negative influence.png'
import iSelfish from '../../../assets/UI icons/scouting/selfish.png'
import iPastPrime from '../../../assets/UI icons/scouting/pastprime.png'
import iFaceHeel from '../../../assets/UI icons/scouting/faceheel.png'

// Maps the backend's icon keys (services/agent_report_service) to assets.
const I: Record<string, string> = {
  charisma: iCharisma, mic: iMic, star: iStar, psych: iPsych,
  selling: iSelling, basics: iTechnical, consistency: iReliable,
  safety: iSafety, stamina: iStamina, athletic: iAthletic,
  injury: iInjury, power: iStrength, toughness: iStrength,
  flash: iAthletic, experience: iReliable, looks: iStar,
  menace: iStrength, worldClass: iStar, reliable: iReliable,
  faceHeel: iFaceHeel, positive: iPositive, negative: iNegative,
  market: iMarket, tag: iTag, creative: iCharisma,
  contract: iMarket, popularity: iMarket, perception: iStar,
  age: iPastPrime, health: iInjury, danger: iNegative,
  selfish: iSelfish, comedy: iMic, speech: iMic,
  scatter: iMic, unmarketable: iPastPrime, unavailable: iPastPrime,
  injuryHistory: iInjury,
}

interface ReportItem { text: string; detail: string; value?: number; impact: number; icon: string; is_elite?: boolean; warn?: boolean }
interface AgentReport { pros: ReportItem[]; cons: ReportItem[]; summary: string; best_role: string }

interface AgentReportTabProps {
  w: any; stars: { current: number; potential: number; currentScore: number; potentialScore: number };
  ATTR_MAP: Record<number, string>;
  ATTR_TOOLTIP: Record<number, string>;
  ScoutIcon: React.ComponentType<{ label: string; isPro: boolean; val?: number; isElite?: boolean; icon?: string; warn?: boolean }>;
  compact?: boolean;
}

export function AgentReportTab(props: AgentReportTabProps) {
  try {
    const { w, stars, ATTR_MAP, ATTR_TOOLTIP, ScoutIcon, compact } = props
    const report: AgentReport = w.agent_report || { pros: [], cons: [], summary: '', best_role: '' }
    const pros = report.pros
    const cons = report.cons

    if (compact) {
    const topP = pros.slice(0, 2)
    const topC = cons.slice(0, 2)
    return (
      <>
        <div className="flex gap-5">
          <div className="items-center gap-6px"><span className="text-sm text-semibold text-muted">Current:</span><Stars filled={stars.current} total={5} /></div>
          <div className="items-center gap-6px"><span className="text-sm text-semibold text-muted">Potential:</span><Stars filled={stars.potential} total={5} /></div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="section-label mb-1">Key Strengths</div>
            {topP.length > 0 ? topP.map((item, i) => (
              <div key={i} className="items-center gap-5px" style={{ padding: '2px 0' }}>
                <ScoutIcon label={item.text} isPro={true} val={item.value} icon={I[item.icon]} isElite={item.is_elite} />
                <span className="text-sm text-primary truncate">{item.text}</span>
              </div>
            )) : <span className="text-sm text-muted">None identified</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="section-label mb-1">Weaknesses</div>
            {topC.length > 0 ? topC.map((item, i) => (
              <div key={i} className="items-center gap-5px" style={{ padding: '2px 0' }}>
                <ScoutIcon label={item.text} isPro={false} val={item.value} icon={I[item.icon]} />
                <span className="text-sm text-primary truncate">{item.text}</span>
              </div>
            )) : <span className="text-sm text-muted">None identified</span>}
          </div>
        </div>
        <div className="border-default-top pt-1 text-secondary text-sm">
          <span className="text-primary text-semibold">Recommended Usage: {w.usage_label}</span>
          {stars.potential > stars.current ? <span>. Upside: <span className="text-primary text-semibold">{w.potential_usage_label}</span></span> : stars.potentialScore < stars.currentScore ? <span>. <span className="text-primary text-semibold">Passing the Torch</span></span> : '.'}
        </div>
      </>
    )
  }

  return (
    <div className="flex-1 overflow-auto flex px-5 pb-5 gap-6">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="bg-secondary rounded p-3 px-4 items-center gap-4">
          <div className="items-center gap-5">
            <div className="items-center gap-6px">
              <span className="text-sm text-semibold text-muted">Current:</span>
              <Stars filled={stars.current} total={5} />
            </div>
            <div className="items-center gap-6px">
              <span className="text-sm text-semibold text-muted">Potential:</span>
              <Stars filled={stars.potential} total={5} />
            </div>
          </div>
          <div>
            <div className="text-lg text-bold text-primary">{w.usage_label}</div>
            <div className="text-secondary text-md">{stars.potentialScore < stars.currentScore ? 'Passing the Torch' : `Potential: ${w.potential_usage_label}`}</div>
          </div>
        </div>

        <div className="bg-secondary rounded p-3 px-4">
          <div className="text-base text-bold text-primary mb-2 letter-spacing-0-5">Pros</div>
          <div className="grid grid-cols-1fr-1fr text-base lh-1-7" style={{ gap: '4px 24px' }}>
            {(pros.length > 0 ? pros : [{ text: 'No notable strengths identified.', detail: '', icon: '', impact: 0 }]).map((p2, i) => (
              <div key={i} className="items-center gap-2" style={{ padding: '3px 0' }}>
                <ScoutIcon label={p2.text} isPro={true} val={p2.value} isElite={p2.is_elite} icon={I[p2.icon]} />
                <span className="text-base text-primary">{p2.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary rounded p-3 px-4">
          <div className="text-base text-bold text-primary mb-2 letter-spacing-0-5">Cons</div>
          <div className="grid grid-cols-1fr-1fr text-base lh-1-7" style={{ gap: '4px 24px' }}>
            {(cons.length > 0 ? cons : [{ text: 'No significant weaknesses identified.', detail: '', icon: '', impact: 0 }]).map((c, i) => (
              <div key={i} className="items-center gap-2" style={{ padding: '3px 0' }}>
                <ScoutIcon label={c.text} isPro={false} val={c.value} icon={I[c.icon]} warn={c.warn} />
                <span className="text-base text-primary">{c.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary rounded p-3 px-4">
          <div className="text-base text-bold text-primary mb-2 letter-spacing-0-5">Summary</div>
          <div className="text-base text-primary lh-1-7">
            {report.summary || <span className="text-muted text-md">No skill data available for this worker.</span>}
          </div>
        </div>
      </div>

      <div className="w-240 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-secondary rounded p-3 px-4">
          <div className="text-sm text-semibold text-primary mb-2 letter-spacing-0-5">Physical Profile</div>
          {[{label:'Stamina',val:w.skills?.stamina?.pct??0},{label:'Athleticism',val:w.skills?.athletic?.pct??0},{label:'Power',val:w.skills?.power?.pct??0},{label:'Toughness',val:w.skills?.toughness?.pct??0},{label:'Injury Res.',val:w.skills?.injury?.pct??0}].map(item => (
            <div key={item.label} className="flex-between text-md" style={{ padding: '3px 0' }}>
              <span className="text-secondary">{item.label}</span>
              <span className="text-primary text-mono text-bold">{item.val}</span>
            </div>
          ))}
        </div>

        <div className="bg-secondary rounded p-3 px-4">
          <div className="text-sm text-semibold text-primary mb-2 letter-spacing-0-5">Mental Profile</div>
          {[{label:'Psychology',val:w.skills?.psych?.pct??0},{label:'Experience',val:w.skills?.experience?.pct??0},{label:'Respect',val:w.skills?.respect?.pct??0},{label:'Reputation',val:w.skills?.reputation?.pct??0}].map(item => (
            <div key={item.label} className="flex-between text-md" style={{ padding: '3px 0' }}>
              <span className="text-secondary">{item.label}</span>
              <span className="text-primary text-mono text-bold">{item.val}</span>
            </div>
          ))}
        </div>

        <div className="bg-secondary rounded p-3 px-4">
          <div className="text-sm text-semibold text-primary mb-2 letter-spacing-0-5">Best Role</div>
          {report.best_role
            ? <div><div className="text-base text-bold text-primary">{report.best_role}</div><div className="text-sm text-muted mt-1">Based on current skills</div></div>
            : <div className="text-muted text-md">No active roles</div>}
        </div>

        {w.attributes && w.attributes.length > 0 && (() => {
          const persIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]
          const pers = w.attributes.filter((id: number) => persIds.includes(id))
          const other = w.attributes.filter((id: number) => !persIds.includes(id))
          return (<>
            {pers.length > 0 && (
              <div className="bg-secondary rounded p-3 px-4">
                <div className="text-sm text-semibold text-primary mb-2 letter-spacing-0-5">Personality</div>
                <div className="text-secondary lh-1-6 text-md">
                   {pers.map((id: number, i: number) => (
                    <div key={i} data-tooltip={ATTR_TOOLTIP[id] || ''}>{ATTR_MAP[id] || `Attribute ${id}`}</div>
                  ))}
                </div>
              </div>
            )}
            {other.length > 0 && (
              <div className="bg-secondary rounded p-3 px-4">
                <div className="text-sm text-semibold text-primary mb-2 letter-spacing-0-5">Attributes</div>
                <div className="text-secondary lh-1-6 text-md">
                   {other.map((id: number, i: number) => (
                    <div key={i} data-tooltip={ATTR_TOOLTIP[id] || ''}>{ATTR_MAP[id] || `Attribute ${id}`}</div>
                  ))}
                </div>
              </div>
            )}
          </>)
        })()}
      </div>
    </div>
  )
  } catch (e) {
    console.error('[AgentReportTab] error:', e)
    return <div className="text-red p-5">Error rendering agent report: {String(e)}</div>
  }
}
