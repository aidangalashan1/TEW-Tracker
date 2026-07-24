import { pillarScores, relTier, proImpact, conSeverity, isElite, isWorldClass2, isWrestler } from '../../../lib/scoring'
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

const I = {
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

interface AgentReportTabProps {
  w: any; stars: { current: number; potential: number; currentScore: number; potentialScore: number };
  img: (path: string) => string;
  focusedFed: any; playerFed: any;
  AREAS: Record<string, number[]>;
  ATTR_MAP: Record<number, string>;
  ATTR_TOOLTIP: Record<number, string>;
  ScoutIcon: React.ComponentType<{ label: string; isPro: boolean; val?: number; isElite?: boolean; icon?: string; warn?: boolean }>;
  compact?: boolean;
}

const A = { elite: 90, strong: 85, solid: 75, weak: 50, poor: 35 }

function buildProsCons(w: any, companyPop: number, focusedFed: any, playerFed: any, AREAS: Record<string, number[]>, ATTR_MAP: Record<number, string>) {
  const s = w.skills; const pct = (r: any) => Number(r?.pct ?? 0)
  const attrs = (w as any).attributes || []; const has = (id: number) => attrs.includes(id)
  const rosterAvgPop = (w as any).roster_avg_pop || 0
  const T = relTier(companyPop)
  const iW = isWrestler(w)
  const displayFed = focusedFed || playerFed
  const fedArea = displayFed?.home_area || ''
  const fedName = displayFed?.name || 'your company'
  const fedAreaRegs = (AREAS as Record<string, number[]>)[fedArea] || []
  const overness = w.overness || []
  let areaPop = 0
  if (fedAreaRegs.length > 0 && overness.length > 0) {
    const areaVals = fedAreaRegs.map((rid: number) => { const e = overness[rid - 1]; return e ? Number(e.value?.pct ?? 0) : 0 })
    areaPop = Math.round(areaVals.reduce((a: number, b: number) => a + b, 0) / areaVals.length)
  }

  const pros: {t:string;d:string;v?:number;impact:number;isElite?:boolean;icon?:string}[] = []
  const cons: {t:string;d:string;v?:number;impact:number;icon?:string;warn?:boolean}[] = []

  const v2 = Math.round; const cv2 = v2(pct(s.charisma)); const mv2 = v2(pct(s.mic)); const sv2 = v2(pct(s.star))
  const elite3 = (v:number) => ({impact:proImpact(v, T.elite, companyPop), isElite:isElite(v)})
  
  pros.push({t:cv2 >= T.elite ? 'Has a magnetic presence on-screen.' : cv2 >= T.strong ? 'Is a charismatic performer.' : 'Is decently charismatic.', d:`Charisma: ${cv2}/100.`, v:cv2, icon:I.charisma, ...cv2 >= T.elite ? elite3(cv2) : {impact:proImpact(cv2, cv2 >= T.strong ? T.strong : T.solid, companyPop), isElite:isElite(cv2)}})
  if (mv2 >= A.elite) pros.push({t:'Electrifying on the microphone.', d:`Microphone: ${mv2}/100.`, v:mv2, icon:I.mic, impact:mv2 >= 95 ? 4.0 : 3.0, isElite:true})
  else if (mv2 >= 80) pros.push({t:'Excellent on the microphone.', d:`Microphone: ${mv2}/100.`, v:mv2, icon:I.mic, impact:2.0})
  else if (mv2 >= T.solid) pros.push({t:'Good on the microphone.', d:`Microphone: ${mv2}/100.`, v:mv2, icon:I.mic, impact:proImpact(mv2, T.solid, companyPop), isElite:isElite(mv2)})
  if (sv2 >= A.elite) pros.push({t:'Looks like a generational superstar.', d:`Star Quality: ${sv2}/100.`, v:sv2, icon:I.star, impact:sv2 >= 95 ? 4.0 : 3.0, isElite:true})
  else if (sv2 >= 80) pros.push({t:'Dripping with star quality.', d:`Star Quality: ${sv2}/100.`, v:sv2, icon:I.star, impact:2.5})
  else if (sv2 >= T.solid) pros.push({t:'Looks like a star.', d:`Star Quality: ${sv2}/100.`, v:sv2, icon:I.star, impact:proImpact(sv2, T.solid, companyPop), isElite:isElite(sv2)})
  const psych = v2(pct(s.psych))
  if (psych >= A.solid) pros.push({t:psych >= A.elite ? 'Master psychologist.' : psych >= A.strong ? 'Excellent ring psychology.' : 'Knows how to work a crowd.', d:`Psychology: ${psych}/100.`, v:psych, icon:I.psych, impact:psych >= A.elite ? 4.0 : psych >= A.strong ? 2.5 : 1.0, isElite:psych >= A.elite})
  const exp = v2(pct(s.experience))
  if (exp >= A.strong) pros.push({t:'An experienced hand who delivers every night.', d:`Experience: ${exp}/100.`, v:exp, icon:I.experience, impact:2.0})
  if (exp < 30 && iW) cons.push({t:'Green around the edges. Needs more ring time to develop.', d:`Experience: ${exp}/100.`, v:exp, icon:I.experience, impact:2.5})
  if (iW) {
    const fl = v2(pct(s.flash))
    if (fl >= A.strong) pros.push({t:'Crowd-pleasing moveset.', d:`Flashiness: ${fl}/100.`, v:fl, icon:I.flash, impact:2.5, isElite:fl >= 95})
    const mn = v2(pct(s.menace)); const isMonster = mn >= A.strong || (v2(pct(s.power)) >= A.solid && v2(pct(s.brawl)) >= A.solid)
    if (isMonster && mn >= A.strong) pros.push({t:mn >= 95 ? 'Terrifying presence.' : 'Intimidating presence.', d:`Menace: ${mn}/100.`, v:mn, icon:I.menace, impact:1.5, isElite:mn >= 95})
  }
  const lk = v2(pct(s.looks))
  if (lk >= 95) pros.push({t:'Model good looks.', d:`Looks: ${lk}/100.`, v:lk, icon:I.looks, impact:2.5, isElite:true})
  if (lk < A.poor && iW) cons.push({t:'Has an unfortunate appearance.', d:`Looks: ${lk}/100.`, v:lk, icon:I.looks, impact:2.0})
  if (isWorldClass2(v2(pct(s.charisma)), v2(pct(s.mic)), v2(pct(s.star)), psych)) pros.push({t:'World-class entertainer.', d:'Elite across multiple performance categories. A true global talent.', icon:I.worldClass, impact:5.0, isElite:true})
  
  if (iW) {
    const b2 = v2(pct(s.basics)); const se2 = v2(pct(s.selling)); const st2 = v2(pct(s.stamina))
    const at2 = v2(pct(s.athletic)); const po2 = v2(pct(s.power)); const in2 = v2(pct(s.injury))
    const co2 = v2(pct(s.consistency)); const sa2 = v2(pct(s.safety)); const to2 = v2(pct(s.toughness))
    if (b2 < A.weak) cons.push({t:'Weak technical fundamentals.', d:`Basics: ${b2}/100.`, v:b2, icon:I.basics, impact:2.5})
    if (se2 >= 95) pros.push({t:'A world-class seller.', d:`Selling: ${se2}/100.`, v:se2, icon:I.selling, impact:4.0, isElite:true})
    else if (se2 >= A.strong) pros.push({t:'Is an exceptional seller.', d:`Selling: ${se2}/100.`, v:se2, icon:I.selling, impact:2.5})
    if (co2 >= 95) pros.push({t:'Never has an off night.', d:`Consistency: ${co2}/100.`, v:co2, icon:I.consistency, impact:3.0, isElite:true})
    else if (co2 >= A.strong) pros.push({t:'Consistent performer.', d:`Consistency: ${co2}/100.`, v:co2, icon:I.consistency, impact:2.0})
    if (sa2 >= 95) pros.push({t:'An extremely safe worker.', d:`Safety: ${sa2}/100.`, v:sa2, icon:I.safety, impact:3.0, isElite:true})
    else if (sa2 >= A.strong) pros.push({t:'Safe worker.', d:`Safety: ${sa2}/100.`, v:sa2, icon:I.safety, impact:2.0})
    if (st2 >= 95) pros.push({t:'Has an endless motor.', d:`Stamina: ${st2}/100.`, v:st2, icon:I.stamina, impact:3.5, isElite:true})
    else if (st2 >= A.strong) pros.push({t:'Can go the distance in long matches.', d:`Stamina: ${st2}/100.`, v:st2, icon:I.stamina, impact:2.0})
    if (at2 >= 95) pros.push({t:'Freak athlete.', d:`Athleticism: ${at2}/100.`, v:at2, icon:I.athletic, impact:3.5, isElite:true})
    else if (at2 >= A.strong) pros.push({t:'Highly athletic.', d:`Athleticism: ${at2}/100.`, v:at2, icon:I.athletic, impact:2.0})
    if (in2 >= 95) pros.push({t:'Is an iron man, never gets hurt.', d:`Injury Resistance: ${in2}/100.`, v:in2, icon:I.injury, impact:3.5, isElite:true})
    else if (in2 >= A.strong) pros.push({t:'Unlikely to get hurt.', d:`Injury Resistance: ${in2}/100.`, v:in2, icon:I.injury, impact:2.0})
    const isPwr = po2 >= A.strong || (v2(pct(s.brawl)) >= A.solid && po2 >= A.strong)
    if (isPwr && po2 >= A.strong) pros.push({t:po2 >= 95 ? 'Freakish strength.' : 'Impressive strength.', d:`Power: ${po2}/100.`, v:po2, icon:I.power, impact:po2 >= 95 ? 3.5 : 2.0, isElite:po2 >= 95})
    if (to2 >= A.strong) pros.push({t:'Tough as nails.', d:`Toughness: ${to2}/100.`, v:to2, icon:I.toughness, impact:1.5})
    if (psych >= A.strong && co2 >= A.strong) pros.push({t:'Reliable performer.', d:'Strong psychology and consistency.', icon:I.reliable, impact:2.5})
  }
  
  if (has(314) || has(315)) pros.push({t:'Can work both face and heel at a high level.', d:`Attribute: ${ATTR_MAP[has(314)?314:315]}. Versatile and valuable.`, icon:I.faceHeel, impact:2.5})
  else { if (has(311)) pros.push({t:'Natural babyface.', d:`Attribute: ${ATTR_MAP[311]}. Can still work heel if needed.`, icon:I.faceHeel, impact:1.5}); if (has(312)) pros.push({t:'Natural heel.', d:`Attribute: ${ATTR_MAP[312]}. Can still work babyface if needed.`, icon:I.faceHeel, impact:1.5}) }
  const posPers: Record<number, number> = {1:3, 3:2, 4:2, 5:3, 8:4, 9:5, 11:1}; const mixedPers = [6, 7, 10]
  const p = attrs.find((id:number) => [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].includes(id))
  if (p && posPers[p] !== undefined) pros.push({t:'Positive backstage influence.', d:`Personality: ${ATTR_MAP[p]}. A net positive in the locker room.`, icon:I.positive, impact:2.0})
  if (p && mixedPers.includes(p)) {
    if (p === 6) pros.push({t:'Keeps morale high backstage.', d:'Class Clown. Creates positive backstage incidents and energy.', icon:I.positive, impact:1.5})
    else if (p === 7) pros.push({t:'Energising backstage presence.', d:'Party Animal. Major positive impact on backstage environment.', icon:I.positive, impact:1.5})
  }
  if (has(125) || has(131)) pros.push({t:'Easy to do business with.', d:'Will put others over without complaint. Helpful for building the roster.', icon:I.tag, impact:1.5})
  if (has(134)) pros.push({t:'Low maintenance.', d:'Undemanding. Will not complain about being left off shows.', icon:I.reliable, impact:1.0})
  if (has(346)) pros.push({t:'Tag team specialist.', d:'Performs better with established tag partners (15+ experience, no negative chemistry).', icon:I.tag, impact:1.5})
  if (has(507)) pros.push({t:'Develops quickly.', d:'Prodigy. Improves skills faster than normal during their maturity phase.', icon:I.athletic, impact:2.0})
  if (has(509)) pros.push({t:'Age-defying performer.', d:'Age Is Just A Number. Loses skills slower than normal during decline.', icon:I.stamina, impact:2.0})
  if (has(345)) pros.push({t:'Never holds back.', d:'Dynamo. Always gives full effort, even on unimportant shows.', icon:I.athletic, impact:1.5})
  if (has(348)) pros.push({t:'Generous performer.', d:'Giving Performer. Makes opponents look better than they are.', icon:I.positive, impact:1.5})
  if (has(352)) pros.push({t:'High pain tolerance.', d:'High Pain Threshold. Penalties from working injured are lessened.', icon:I.power, impact:1.0})
  if (has(502)) pros.push({t:w.age <= 35 ? 'Long career ahead.' : 'Won\'t retire early.', d:'Desperado. Will not retire early unless forced by injury.', icon:I.stamina, impact:1.5})
  if (has(103)) pros.push({t:'Creative dynamo.', d:'Extraordinarily creative. Likely to generate new spots and gimmick ideas.', icon:I.creative, impact:2.0})
  else if (has(104) || has(105)) pros.push({t:'Creative.', d:'More likely to come up with new spots and gimmick ideas.', icon:I.creative, impact:1.0})
  if (has(122)) pros.push({t:'Great storyteller.', d:'Well known for entertaining backstage with tales.', icon:I.mic, impact:0.5})
  if (has(106)) pros.push({t:'Mentors younger workers.', d:'Passes On Knowledge. More likely to take on protégés.', icon:I.positive, impact:1.0})
  if (has(548)) pros.push({t:'A marketing dream.', d:'Everyone wants a piece of them. Merchandise sales massively boosted.', icon:I.market, impact:3.0})
  else if (has(547)) pros.push({t:'Easily marketable.', d:'Naturally suited to being monetised. Merchandise sales boosted.', icon:I.market, impact:2.5})
  else if ([225,226,227,228,229,231,232,233,535,550].some((id:number) => has(id))) pros.push({t:'Marketable.', d:`Attributes: ${[225,226,227,228,229,231,232,233,535,550].filter((id:number)=>has(id)).map(id=>ATTR_MAP[id]).join(', ')}. Boosts merchandise sales.`, icon:I.market, impact:2.0})
  if (w.age <= 25) pros.push({t:'Has time to develop further.', d:`Age ${w.age}. Significant room to grow.`, icon:I.stamina, impact:2.0})

  if (areaPop >= companyPop && companyPop > 0) pros.push({t:'A draw in this market.', d:`${areaPop} average popularity.`, v:areaPop, icon:I.popularity, impact:areaPop >= companyPop + 15 ? 3.0 : areaPop >= companyPop + 5 ? 2.0 : 1.0})
  if (areaPop >= companyPop + 10) pros.push({t:'Major draw in this market.', d:`${areaPop} average popularity.`, v:areaPop, icon:I.popularity, impact:3.5})
  if (areaPop >= companyPop && companyPop > 0) pros.push({t:areaPop >= companyPop + 15 ? `Major draw in ${fedArea}.` : areaPop >= companyPop + 5 ? `A draw in ${fedArea}.` : `Known in ${fedArea}.`, d:`${areaPop} average popularity.`, v:areaPop, icon:I.popularity, impact:areaPop >= companyPop + 15 ? 3.5 : areaPop >= companyPop + 5 ? 2.5 : 1.5})
  const perception = (w as any).contract?.perception || 0
  const aceUid = (focusedFed || playerFed)?.Ace
  const isFigurehead = aceUid && aceUid === w.uid
  const isFace = (w as any).contract?.face
  if (isFigurehead) {
    pros.push({t:`Face of ${fedName}.`, d:'The designated figurehead of the company.', icon:I.perception, impact:5.0})
  } else if (perception === 1) {
    pros.push({t: isFace ? `One of the top faces in ${fedName}.` : `One of the top heels in ${fedName}.`, d:'Recognised as a premier performer on the roster.', icon:I.perception, impact:4.0})
  } else if (perception === 2) {
    pros.push({t: isFace ? `A prominent face in ${fedName}.` : `A prominent heel in ${fedName}.`, d:'Seen as a top tier talent on the roster.', icon:I.perception, impact:3.0})
  }
  const cStatus2 = (w as any).contract_status
  const pFed2 = playerFed?.uid
  const isElsewhere2 = cStatus2 === 'exclusive_written' && !w.freelance && (w as any).contract?.fed_uid && (w as any).contract?.fed_uid !== pFed2
  const isOwn2 = cStatus2 === 'exclusive_written' && !w.freelance && (w as any).contract?.fed_uid === pFed2
  const expDays2 = (w as any).contract_expiry_days || 0
  if (w.freelance || cStatus2 === 'none') pros.push({t:`Available to sign with ${fedName}.`, d:'Free agent. Can be signed immediately.', icon:I.contract, impact:3.0})
  if (isElsewhere2 && expDays2 > 0 && expDays2 < 90) pros.push({t:'Contract expiring soon.', d:`${expDays2} days remaining on their current deal. Could become available.`, icon:I.contract, impact:2.5})
  if (isOwn2 && expDays2 >= 180) pros.push({t:'Long-term commitment.', d:`${expDays2} days remaining. Worker is locked in.`, icon:I.contract, impact:1.0})
  if (rosterAvgPop > 0 && areaPop > 0 && areaPop >= rosterAvgPop + 10) pros.push({t:`More popular than the ${fedName} average.`, d:`${areaPop} pop vs roster average ${rosterAvgPop}.`, v:areaPop, icon:I.popularity, impact:3.0})
  
  if (v2(pct(s.charisma)) < T.weak) cons.push({t:'Lacks the charisma to really perform at the top of the card.', d:`Charisma: ${v2(pct(s.charisma))}/100.`, v:v2(pct(s.charisma)), icon:I.charisma, impact:conSeverity(v2(pct(s.charisma)), T.weak, companyPop)})
  if (v2(pct(s.mic)) < T.weak) cons.push({t:'May be too weak on the microphone to perform in the main event.', d:`Microphone: ${v2(pct(s.mic))}/100.`, v:v2(pct(s.mic)), icon:I.mic, impact:conSeverity(v2(pct(s.mic)), T.weak, companyPop)})
  if (v2(pct(s.star)) < T.weak) cons.push({t:'Lacks the star presence to really be a top-level worker.', d:`Star Quality: ${v2(pct(s.star))}/100.`, v:v2(pct(s.star)), icon:I.star, impact:conSeverity(v2(pct(s.star)), T.weak, companyPop)})
  if (v2(pct(s.acting)) < T.poor) cons.push({t:'Struggles with angle work.', d:`Acting: ${v2(pct(s.acting))}/100.`, icon:I.mic, v:v2(pct(s.acting)), impact:conSeverity(v2(pct(s.acting)), T.poor, companyPop)})
  const avgPerfC = (v2(pct(s.charisma)) + v2(pct(s.mic)) + v2(pct(s.star)) + v2(pct(s.acting))) / 4
  if (avgPerfC < T.poor) cons.push({t:`Lacks the performance skills to be a top star in ${fedName}.`, d:`Avg performance: ${Math.round(avgPerfC)} vs company ${companyPop}.`, icon:I.mic, v:Math.round(avgPerfC), impact:conSeverity(avgPerfC, T.poor, companyPop)})
  else if (avgPerfC < T.weak) cons.push({t:`May slightly lack the performance skills to be a top star in ${fedName}.`, d:`Avg performance: ${Math.round(avgPerfC)} vs company ${companyPop}.`, icon:I.mic, v:Math.round(avgPerfC), impact:conSeverity(avgPerfC, T.weak, companyPop)})
  if (v2(pct(s.psych)) < A.weak) cons.push({t:'Lacks intelligence in the ring.', d:`Psychology: ${v2(pct(s.psych))}/100.`, icon:I.psych, v:v2(pct(s.psych)), impact:2.5})
  if (iW) {
    if (v2(pct(s.stamina)) < A.weak) cons.push({t:'May struggle in longer matches.', d:`Stamina: ${v2(pct(s.stamina))}/100.`, icon:I.stamina, v:v2(pct(s.stamina)), impact:2.0})
    if (v2(pct(s.injury)) < A.weak) cons.push({t:'Injury prone.', d:`Injury Resistance: ${v2(pct(s.injury))}/100.`, icon:I.injury, v:v2(pct(s.injury)), impact:2.5})
    if (v2(pct(s.consistency)) < A.weak) cons.push({t:'Inconsistent performer.', d:`Consistency: ${v2(pct(s.consistency))}/100.`, icon:I.consistency, v:v2(pct(s.consistency)), impact:2.0})
    if (v2(pct(s.basics)) < A.weak) cons.push({t:'Weak fundamentals.', d:`Basics: ${v2(pct(s.basics))}/100.`, icon:I.basics, v:v2(pct(s.basics)), impact:2.5})
    if (v2(pct(s.selling)) < A.weak) cons.push({t:'Does not sell well.', d:`Selling: ${v2(pct(s.selling))}/100.`, icon:I.selling, v:v2(pct(s.selling)), impact:2.0})
    if (v2(pct(s.safety)) < A.weak) cons.push({t:'Dangerous in the ring.', d:`Safety: ${v2(pct(s.safety))}/100.`, icon:I.safety, v:v2(pct(s.safety)), impact:3.0})
    const bodyParts = [520,521,522,523,524].filter((id:number) => has(id))
    if (bodyParts.length > 0) {
      const injRes = v2(pct(s.injury))
      if (bodyParts.length >= 3 || injRes < 40) cons.push({t:'Chronic injury concerns.', d:'Troublesome body parts.', icon:I.health, impact:3.5})
      else cons.push({t:'Injury concerns.', d:'Troublesome body part.', icon:I.health, impact:2.0})
    }
  }
  const negPers2 = [12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]
  const p4 = attrs.find((id:number) => [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].includes(id))
  if (p4 && negPers2.includes(p4)) cons.push({t:'Negative backstage influence.', d:`Personality: ${ATTR_MAP[p4]}.`, icon:I.negative, impact:3.0})
  const mixedPers3 = [6, 7, 10]
  if (p4 && mixedPers3.includes(p4)) {
    if (p4 === 6) cons.push({t:'May rile up colleagues backstage.', d:'Class Clown.', icon:I.negative, impact:1.5})
    else if (p4 === 7) cons.push({t:'May be unreliable.', d:'Party Animal.', icon:I.negative, impact:2.0})
    else if (p4 === 10) cons.push({t:'May be unreliable.', d:'Free Spirit.', icon:I.negative, impact:1.5})
  }
  if (has(310)) cons.push({t:'Can only work as a babyface.', d:'100% Babyface.', icon:I.faceHeel, impact:2.0})
  if (has(313)) cons.push({t:'Can only work as a heel.', d:'100% Heel.', icon:I.faceHeel, impact:2.0})
  if (has(510)) cons.push({t:'Cannot fight time.', d:'Declines faster than normal.', icon:I.age, impact:2.5})
  if (has(552)) cons.push({t:'May be more likely to suffer a severe injury.', d:'Brittle Bones.', icon:I.health, impact:2.5})
  if (has(545)) cons.push({t:'Is a marketing nightmare.', d:'Impossible to market.', icon:I.unmarketable, impact:3.0})
  if (has(546)) cons.push({t:'Not easily marketed. May sell less merch.', d:'Unmarketable.', icon:I.unmarketable, impact:2.0})
  if (has(544)) cons.push({t:'Speech impediment. Struggles in promos.', d:'', icon:I.speech, impact:1.5})
  if (has(543)) cons.push({t:'Is not able to wrestle again.', d:'Limited to non-wrestling roles.', icon:I.unavailable, impact:5.0})
  if (has(344)) cons.push({t:'May hold back on minor shows.', d:'Canny Operator.', icon:I.selfish, impact:1.0, warn:true})
  if (has(347)) cons.push({t:'Is a selfish performer.', d:'Tends to dominate lesser opponents.', icon:I.selfish, impact:2.0})
  if (has(118)) cons.push({t:'Has a temper.', d:'Prone to backstage altercations.', icon:I.negative, impact:1.5})
  if (has(119)) cons.push({t:'Prone to backstage fights.', d:'Born Fighter.', icon:I.negative, impact:2.0})
  if (has(351)) cons.push({t:'Often forgets scripted promos.', d:'Cannot do scripted matches.', icon:I.scatter, impact:2.0})
  if (has(340) || has(341)) cons.push({t:'Hates comedy matches.', d:'Struggles with comedy-based matches.', icon:I.comedy, impact:0.5, warn:true})
  if (has(374) || has(375)) cons.push({t:'Cannot do comedy angles.', d:'Struggles as comic relief in angles.', icon:I.comedy, impact:0.5, warn:true})
  if (has(349)) cons.push({t:'Struggles in slower matches.', d:'Explosive Ring Style.', icon:I.stamina, impact:1.5, warn:true})
  if (has(353)) cons.push({t:'Struggles in shorter matches.', d:'Slow And Steady.', icon:I.stamina, impact:1.5, warn:true})
  const danger2 = [197,198,199,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,27,563].filter((id:number) => has(id))
  if (danger2.length) cons.push({t:'May have trouble with substances or law enforcement.', d:`Attributes: ${danger2.map(id=>ATTR_MAP[id]).join(', ')}.`, icon:I.danger, impact:3.0})
  if (areaPop < T.poor) cons.push({t:`Unknown in ${fedArea || 'this market'}.`, d:`${areaPop} average popularity in ${fedArea}.`, icon:I.popularity, v:areaPop, impact:conSeverity(areaPop, T.poor, companyPop)})
  if (areaPop < T.weak) cons.push({t:`Less popular than the ${fedName} average.`, d:'', icon:I.popularity, v:areaPop, impact:conSeverity(areaPop, T.weak, companyPop)})
  if (w.age >= 38) cons.push({t:'Past their prime.', d:`Age ${w.age}.`, icon:I.age, impact:2.0 + (w.age - 38) * 0.1})
  const injCnt2 = (w as any).injury_count || 0
  if (injCnt2 >= 3) cons.push({t:'History of injuries.', d:`Injured ${injCnt2} times.`, icon:I.injuryHistory, impact:2.5})
  else if (injCnt2 > 0) cons.push({t:'Previous injury history.', d:`Injured ${injCnt2} time${injCnt2 > 1 ? 's' : ''}.`, icon:I.injuryHistory, impact:1.5})
  const cStatus3 = (w as any).contract_status
  const pFed3 = playerFed?.uid
  const isElsewhere3 = cStatus3 === 'exclusive_written' && !w.freelance && (w as any).contract?.fed_uid && (w as any).contract?.fed_uid !== pFed3
  const isOwn3 = cStatus3 === 'exclusive_written' && !w.freelance && (w as any).contract?.fed_uid === pFed3
  const expDays3 = (w as any).contract_expiry_days || 0
  if (isElsewhere3) {
    cons.push({t:'Under exclusive contract elsewhere.', d:'Signed to another company.', icon:I.contract, impact:2.0})
    if (expDays3 > 180) cons.push({t:'Long-term commitment elsewhere.', d:`${expDays3} days remaining.`, icon:I.contract, impact:1.5})
  }
  if (isOwn3 && expDays3 < 90 && expDays3 > 0) cons.push({t:'Contract expiring soon.', d:`${expDays3} days on current deal.`, icon:I.contract, impact:2.0})

  return { pros, cons }
}

export function AgentReportTab(props: AgentReportTabProps) {
  try {
    const { w, stars, focusedFed, playerFed, AREAS, ATTR_MAP, ATTR_TOOLTIP, ScoutIcon, compact } = props
    const companyPop = (w as any).company_area_pop || 0
    const fedName = (focusedFed || playerFed)?.name || 'your company'
    const fedArea = (focusedFed || playerFed)?.home_area || ''
    const { pros, cons } = buildProsCons(w, companyPop, focusedFed, playerFed, AREAS, ATTR_MAP)

    if (compact) {
    const topP = pros.sort((a, b) => b.impact - a.impact).slice(0, 2)
    const topC = cons.sort((a, b) => b.impact - a.impact).slice(0, 2)
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
                <ScoutIcon label={item.t} isPro={true} val={item.v} icon={item.icon} isElite={item.isElite} />
                <span className="text-sm text-primary truncate">{item.t}</span>
              </div>
            )) : <span className="text-sm text-muted">None identified</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="section-label mb-1">Weaknesses</div>
            {topC.length > 0 ? topC.map((item, i) => (
              <div key={i} className="items-center gap-5px" style={{ padding: '2px 0' }}>
                <ScoutIcon label={item.t} isPro={false} val={item.v} icon={item.icon} />
                <span className="text-sm text-primary truncate">{item.t}</span>
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
            {(pros.length > 0 ? pros : [{t:'No notable strengths identified.', d:'', icon:'', impact:0}]).sort((a, b) => b.impact - a.impact).map((p2, i) => (
              <div key={i} className="items-center gap-2" style={{ padding: '3px 0' }}>
                <ScoutIcon label={p2.t} isPro={true} val={p2.v} isElite={p2.isElite} icon={p2.icon} />
                <span className="text-base text-primary">{p2.t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-secondary rounded p-3 px-4">
          <div className="text-base text-bold text-primary mb-2 letter-spacing-0-5">Cons</div>
          <div className="grid grid-cols-1fr-1fr text-base lh-1-7" style={{ gap: '4px 24px' }}>
            {(cons.length > 0 ? cons : [{t:'No significant weaknesses identified.', d:'', icon:'', impact:0}]).sort((a, b) => b.impact - a.impact).map((c, i) => (
              <div key={i} className="items-center gap-2" style={{ padding: '3px 0' }}>
                <ScoutIcon label={c.t} isPro={false} val={c.v} icon={c.icon} warn={c.warn} />
                <span className="text-base text-primary">{c.t}</span>
              </div>
            ))}
          </div>
        </div>

          <div className="bg-secondary rounded p-3 px-4">
          <div className="text-base text-bold text-primary mb-2 letter-spacing-0-5">Summary</div>
          <div className="text-base text-primary lh-1-7">
            {(() => {
              const s = w.skills; if (!s) return <span className="text-muted text-md">No skill data available for this worker.</span>
              const { primary, perf, pop } = pillarScores(s, w)
              const entries = [['primary', primary] as const, ['perf', perf] as const, ['pop', pop] as const]
                .sort((a, b) => b[1] - a[1])
              const best = entries[0]; const worst = entries[2]
              const currentLabel = w.usage_label || 'Unknown'
              const potentialLabel = w.potential_usage_label || 'Unknown'
              const name = w.name; const age = w.age
              const seed = w.uid + age
              const parts: string[] = []
              const openings = [
                `${name} projects as a ${currentLabel.toLowerCase()} for ${fedName}.`,
                `${name} profiles as a ${currentLabel.toLowerCase()} within ${fedName}.`,
                `${name} slots in as a ${currentLabel.toLowerCase()} for ${fedName}.`,
              ]
              parts.push(openings[seed % openings.length])
              const g = (list: string[], i: number) => list[i % list.length]
              const bestPhrases: Record<string, string[]> = {
                primary: ['Their greatest weapon is their in-ring ability.', 'They live and die by their craft in the ring.', 'Their technical prowess sets them apart.'],
                perf: ['Charisma and presence are their calling card.', 'Star quality is what makes them stand out.', 'They connect with audiences like few others can.'],
                pop: [`They already draw interest in ${fedArea || 'their market'}.`, `Well known to ${fedArea || 'regional'} audiences already.`, 'Name recognition is their strongest asset.'],
              }
              if (best[1] >= 75) parts.push(g(bestPhrases[best[0]] || ['This is their standout quality.'], seed))
              else if (best[1] >= 55) parts.push(`Their ${best[0] === 'primary' ? 'in-ring work' : best[0] === 'perf' ? 'charisma and presence' : 'name value'} is their strongest attribute.`)
              const rosterPrimary = (w as any).roster_avg_primary || 0
              const rosterPerf = (w as any).roster_avg_ent || 0
              const rosterPop = (w as any).roster_avg_pop || 0
              if (best[0] === 'primary' && rosterPrimary > 0 && primary > rosterPrimary + 10) parts.push(`A clear step up from the ${fedName} roster in ring ability.`)
              else if (best[0] === 'perf' && rosterPerf > 0 && perf > rosterPerf + 10) parts.push(`Brings more entertainment value than most of the current ${fedName} roster.`)
              else if (best[0] === 'pop' && rosterPop > 0 && pop > rosterPop + 10) parts.push(`Already more recognised than the average ${fedName} performer.`)
              const weakPhrases: Record<string, string[]> = {
                primary: ['Their in-ring work is a limiting factor.', 'They lack the ring skills to reach the next level.', 'Their weak point is between the ropes.'],
                perf: ['They struggle to connect with the audience.', 'Their entertainment skills hold them back from the spotlight.', 'Charisma is the missing piece of their game.'],
                pop: ['They are not yet a household name.', 'Building their name recognition will be key.', 'Still relatively unknown to wider audiences.'],
              }
              if (worst[1] < 45) parts.push(g(weakPhrases[worst[0]] || ['This is an area of concern.'], seed + 1))
              else if (worst[1] < 60) parts.push(`Their ${worst[0] === 'primary' ? 'ring work' : worst[0] === 'perf' ? 'entertainment skills' : 'name value'} could use improvement.`)
              if (age < 20) parts.push(`At just ${age}, they have their entire career ahead of them.`)
              else if (age <= 22) parts.push(`Still early in their career at ${age}. Plenty of room to grow.`)
              else if (age <= 25) parts.push(`At ${age}, they are still developing and finding their footing.`)
              else if (age <= 28) parts.push(`At ${age}, they are entering their prime years.`)
              else if (age <= 34) parts.push(`At ${age}, they are squarely in their prime.`)
              else if (age <= 37) parts.push(`At ${age}, they still have plenty of good years left.`)
              else if (age <= 40) parts.push(`At ${age}, they are in the veteran stage of their career.`)
              else if (age <= 43) parts.push(`At ${age}, the clock is ticking on their in-ring career.`)
              else parts.push(`At ${age}, every year could be their last between the ropes.`)
              const gap = stars.potential - stars.current
              if (gap > 1.5) parts.push(['The sky is the limit for this one.', 'Boundless potential. Could become something truly special with the right development.'][seed % 2])
              else if (gap > 0.5) parts.push(['Still has room to grow and develop further.', 'Untapped potential waiting to be unlocked.'][seed % 2])
              else if (gap > 0) parts.push(['Near their ceiling, but still room to refine their game.', 'Close to their peak, though a bit more seasoning could help.'][seed % 2])
              else if (gap < 0) parts.push('Already past their peak at this stage of their career.')
              if (gap > 0) parts.push(`Could develop into a ${potentialLabel.toLowerCase()} with the right opportunities.`)
              return parts.join(' ')
            })()}
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
          {(() => {
            const activeRoles = ['Wrestler', 'Occasional', 'Manager', 'Personality', 'Road Agent', 'Announcer', 'Colour', 'Referee'].filter(r => w.positions.includes(r))
            const pct = (r: any) => Number(r?.pct ?? 0); const s = w.skills
            if (activeRoles.length === 0) return <div className="text-muted text-md">No active roles</div>
            const inRing = Math.max(pct(s.brawl), pct(s.puroresu), pct(s.hardcore), pct(s.technical), pct(s.air))
            const announce = pct(s.announcing); const colour = pct(s.colour); const ref = pct(s.refereeing)
            let best = activeRoles[0]
            if (best === 'Occasional' && inRing >= 60) best = 'Wrestler'
            if (activeRoles.includes('Announcer') && announce >= 60) best = 'Announcer'
            if (activeRoles.includes('Colour') && colour >= 60 && colour > announce) best = 'Colour Commentator'
            if (activeRoles.includes('Referee') && ref >= 60 && ref > Math.max(announce, colour)) best = 'Referee'
            if (activeRoles.includes('Manager') && pct(s.charisma) >= 65) best = 'Manager'
            return <div><div className="text-base text-bold text-primary">{best}</div><div className="text-sm text-muted mt-1">Based on current skills</div></div>
          })()}
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
