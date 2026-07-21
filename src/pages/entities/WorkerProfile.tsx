import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import useSWR from '../../hooks/useApi'
import { api } from '../../api'
import { NATIONALITY_FLAGS, NATIONALITY_NAMES } from '../../modules/worker-list/nationality'
import { AREAS } from '../../modules/worker-list/regions'
import maleIcon from '../../assets/UI icons/male.png'
import femaleIcon from '../../assets/UI icons/female.png'
import nonbinaryIcon from '../../assets/UI icons/nonbinary.png'
import transIcon from '../../assets/UI icons/trans.png'
import wrestlerIcon from '../../assets/UI icons/wrestleroccasional.png'
import refereeIcon from '../../assets/UI icons/referee.png'
import announcerIcon from '../../assets/UI icons/announcercolor.png'
import managerIcon from '../../assets/UI icons/manager.png'
import personalityIcon from '../../assets/UI icons/personality.png'
import roadAgentIcon from '../../assets/UI icons/roadagent.png'
import rightIcon from '../../assets/UI icons/right.png'
import { ProfileTab } from './worker-profile/ProfileTab'
import { AgentReportTab } from './worker-profile/AgentReportTab'
import { FormTab } from './worker-profile/FormTab'
import { RadarChart } from './worker-profile/RadarChart'

import { fmtDate as libFmtDate } from '../../lib/dates'
import condMaleHead from '../../assets/UI icons/condition/malehead.png'
import condMaleBody from '../../assets/UI icons/condition/malebody.png'
import condMaleLegs from '../../assets/UI icons/condition/malelegs.png'
import condFemHead from '../../assets/UI icons/condition/femhead.png'
import condFemBody from '../../assets/UI icons/condition/fembody.png'
import condFemLegs from '../../assets/UI icons/condition/femlegs.png'
import condMaleArmLeft from '../../assets/UI icons/condition/malearmleft.png'
import condMaleArmRight from '../../assets/UI icons/condition/malearmright.png'
import condFemArmLeft from '../../assets/UI icons/condition/femarmleft.png'
import condFemArmRight from '../../assets/UI icons/condition/femarmright.png'
import scoutPsychIcon from '../../assets/UI icons/scouting/psychology.png'
import scoutReliableIcon from '../../assets/UI icons/scouting/reliable.png'
import scoutTechnicalIcon from '../../assets/UI icons/scouting/technical.png'
import scoutCharismaticIcon from '../../assets/UI icons/scouting/charismatic.png'
import scoutMicIcon from '../../assets/UI icons/scouting/microphone.png'
import scoutStarQualityIcon from '../../assets/UI icons/scouting/star quality.png'
import scoutSellingIcon from '../../assets/UI icons/scouting/selling.png'
import scoutStaminaIcon from '../../assets/UI icons/scouting/stamina.png'
import scoutInjuryIcon from '../../assets/UI icons/scouting/injury record.png'
import scoutAthleticIcon from '../../assets/UI icons/scouting/athletic.png'
import scoutStrengthIcon from '../../assets/UI icons/scouting/strength.png'
import scoutSafetyIcon from '../../assets/UI icons/scouting/safety.png'
import scoutTagIcon from '../../assets/UI icons/scouting/tag specialist.png'
import scoutMarketableIcon from '../../assets/UI icons/scouting/marketable.png'
import scoutPositiveIcon from '../../assets/UI icons/scouting/positive influence.png'
import scoutNegativeIcon from '../../assets/UI icons/scouting/negative influence.png'
import scoutSelfishIcon from '../../assets/UI icons/scouting/selfish.png'
import scoutPastPrimeIcon from '../../assets/UI icons/scouting/pastprime.png'

const SCOUT_ICONS: Record<string, string> = {
  'Plays well off of a crowd.': scoutPsychIcon,
  'Consistent performer.': scoutReliableIcon,
  'Technically sound.': scoutTechnicalIcon,
  'Charismatic performer.': scoutCharismaticIcon,
  'Good on the microphone.': scoutMicIcon,
  'Has Decent Star Quality.': scoutStarQualityIcon,
  'Looks Like a Star.': scoutStarQualityIcon,
  'Exudes Star Quality.': scoutStarQualityIcon,
  'Sells convincingly.': scoutSellingIcon,
  'Reliable in the ring.': scoutReliableIcon,
  'Can go the distance.': scoutStaminaIcon,
  'Unlikely to get hurt.': scoutInjuryIcon,
  'Highly athletic.': scoutAthleticIcon,
  'Impressive power.': scoutStrengthIcon,
  'Safe worker.': scoutSafetyIcon,
  'Can work both face and heel at a high level.': scoutTagIcon,
  'Lacks the performance skills': scoutMicIcon,
  'May slightly lack the performance skills': scoutMicIcon,
  'Natural babyface.': scoutCharismaticIcon,
  'Natural heel.': scoutCharismaticIcon,
  'Positive backstage influence.': scoutPositiveIcon,
  'Easy to do business with.': scoutTagIcon,
  'Low maintenance.': scoutReliableIcon,
  'Tag team specialist.': scoutTagIcon,
  'Develops quickly.': scoutAthleticIcon,
  'Age-defying performer.': scoutStaminaIcon,
  'Marketable.': scoutMarketableIcon,
  'Easily marketable.': scoutMarketableIcon,
  'A marketing dream.': scoutMarketableIcon,
  'Has time to develop further.': scoutStaminaIcon,
  'Available to sign.': scoutMarketableIcon,
  'Contract expiring soon.': scoutMarketableIcon,
  'Long-term contract.': scoutMarketableIcon,
  'Long-term commitment elsewhere.': scoutPastPrimeIcon,
  'Popular in this market.': scoutMarketableIcon,
  'Unknown in this market.': scoutPastPrimeIcon,
  'Keeps morale high backstage.': scoutPositiveIcon,
  'May cause drama backstage.': scoutNegativeIcon,
  'Energising backstage presence.': scoutPositiveIcon,
  'Cannot fight time.': scoutPastPrimeIcon,
  'Never holds back.': scoutAthleticIcon,
  'Generous performer.': scoutPositiveIcon,
  'High pain tolerance.': scoutStrengthIcon,
  'Long career ahead.': scoutStaminaIcon,
  'Creative dynamo.': scoutCharismaticIcon,
  'Creative.': scoutCharismaticIcon,
  'Great storyteller.': scoutMicIcon,
  'Mentors younger workers.': scoutPositiveIcon,
  'Has a temper.': scoutNegativeIcon,
  'Prone to backstage fights.': scoutNegativeIcon,
  'Scatterbrained.': scoutNegativeIcon,
  'Poor comedy match worker.': scoutMicIcon,
  'Poor comic relief.': scoutMicIcon,
  'Marketing nightmare.': scoutPastPrimeIcon,
  'Unmarketable.': scoutPastPrimeIcon,
  'Speech impediment.': scoutMicIcon,
  'Unable to wrestle again.': scoutPastPrimeIcon,
  'Struggles in slower matches.': scoutStaminaIcon,
  'Struggles in shorter matches.': scoutStaminaIcon,
  'In-ring ability lags behind their other skills.': scoutTechnicalIcon,
  'Entertainment lags behind their other skills.': scoutMicIcon,
  'Psychology lags behind their other skills.': scoutPsychIcon,
  'Fundamentals lags behind their other skills.': scoutTechnicalIcon,
  'Physicality lags behind their other skills.': scoutStaminaIcon,
  'Better in-ring than your roster average.': scoutTechnicalIcon,
  'Comparable in-ring to your roster.': scoutReliableIcon,
  'Weaker in-ring than your roster average.': scoutTechnicalIcon,
  'More entertaining than your roster average.': scoutMicIcon,
  'Less entertaining than your roster average.': scoutMicIcon,
  'Better psychology than your roster average.': scoutPsychIcon,
  'More technically sound than your roster average.': scoutTechnicalIcon,
  'Better stamina than your roster average.': scoutStaminaIcon,
  'More popular than your roster average in this market.': scoutMarketableIcon,
  'Less popular than your roster average in this market.': scoutPastPrimeIcon,
  'May struggle in longer matches.': scoutStaminaIcon,
  'Injury prone.': scoutInjuryIcon,
  'Lacks ring intelligence.': scoutPsychIcon,
  'Inconsistent performer.': scoutReliableIcon,
  'Weak technical fundamentals.': scoutTechnicalIcon,
  'Does not sell well.': scoutSellingIcon,
  'Lacks charisma.': scoutCharismaticIcon,
  'Weak on the microphone.': scoutMicIcon,
  'Lacks star presence.': scoutStarQualityIcon,
  'Dangerous in the ring.': scoutSafetyIcon,
  'Struggles with angle work.': scoutMicIcon,
  'Negative backstage influence.': scoutNegativeIcon,
  'Can only work as a babyface.': scoutCharismaticIcon,
  'Can only work as a heel.': scoutCharismaticIcon,
  'Chronic injury concerns.': scoutInjuryIcon,
  'Injury concerns.': scoutInjuryIcon,
  'Brittle - injuries tend to be severe.': scoutInjuryIcon,
  'Master psychologist.': scoutPsychIcon,
  'Excellent ring psychology.': scoutPsychIcon,
  'Magnetic presence.': scoutCharismaticIcon,
  'Likeable.': scoutCharismaticIcon,
  'Electrifying on the microphone.': scoutMicIcon,
  'Excellent on the microphone.': scoutMicIcon,
  'Very good on the microphone.': scoutMicIcon,
  'Capable on the microphone.': scoutMicIcon,
  'Could make a broom look like a monster.': scoutSellingIcon,
  'Exceptional seller.': scoutSellingIcon,
  'Endless motor.': scoutStaminaIcon,
  'Outstanding stamina.': scoutStaminaIcon,
  'Freak athlete.': scoutAthleticIcon,
  'Elite athleticism.': scoutAthleticIcon,
  'Freakish strength.': scoutStrengthIcon,
  'Tremendous power.': scoutStrengthIcon,
  'Trusted with anyone.': scoutSafetyIcon,
  'Extremely safe.': scoutSafetyIcon,
  'Off-field concerns.': scoutNegativeIcon,
  'Past their prime.': scoutPastPrimeIcon,
  'May hold back on minor shows.': scoutReliableIcon,
  'Selfish performer.': scoutSelfishIcon,
  'History of injuries.': scoutInjuryIcon,
  'Previous injury history.': scoutInjuryIcon,
  'Under exclusive contract elsewhere.': scoutPastPrimeIcon,
  'Long-term contract commitment.': scoutPastPrimeIcon,
}

function ScoutIcon({ label, isPro, val, icon, warn, isElite }: { label: string; isPro: boolean; val?: number; icon?: string; warn?: boolean; isElite?: boolean }) {
  let src = icon || SCOUT_ICONS[label]
  if (!src) {
    if (label.startsWith('Lacks the performance skills') || label.startsWith('May slightly lack the performance skills')) src = scoutMicIcon
  }
  if (!src) return null
  let bg = isPro ? (isElite ? '#a855f7' : '#22c55e') : warn ? '#eab308' : '#ef4444'
  if (val !== undefined && !isElite) {
    if (isPro) {
      bg = val >= 80 ? '#22c55e' : val >= 70 ? '#84cc16' : val >= 60 ? '#a3e635' : '#eab308'
    } else {
      bg = val <= 15 ? '#dc2626' : val <= 30 ? '#ef4444' : val <= 40 ? '#f97316' : '#eab308'
    }
  }
  return (
    <span style={{
      display: 'inline-flex', width: 26, height: 26, borderRadius: '50%',
      background: bg,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <img src={src} alt="" style={{ width: 15, height: 15, filter: 'brightness(0) invert(1)' }} />
    </span>
  )
}


const ATTR_TOOLTIP: Record<number, string> = {
  1:'Professional: The worker is a true pro and always acts as such. Has a mildly positive natural impact on the backstage environment. Negative morale effects on them are dampened. Very rarely gets involved in negative backstage incidents. ',
  2:'Quiet: The worker is very quiet and fades into the background. Has no natural impact on the backstage environment, only what comes via their morale. All morale effects on them are greatly dampened. Very rarely gets involved in backstage incidents. ',
  3:'Stalwart: The worker just gets on with the job and does not make a fuss. Has a mildly positive natural impact on the backstage environment. Negative morale effects on them are greatly dampened. Positive morale effects on them are slightly dampened. Very rarely gets involved in negative backstage incidents. ',
  4:'Relaxed: The worker is very chilled and easy to get on with. Has a mildly positive natural impact on the backstage environment as long as they do not have negative morale. Negative morale effects on them are slightly dampened. Positive morale effects on them are slightly amplified. ',
  5:'Lively: The worker is a lively, upbeat individual. Has a positive natural impact on the backstage environment. Negative morale effects on them are quite dampened. Positive morale effects on them are quite amplified. Has an increased chance of creating positive backstage incidents. ',
  6:'Class Clown: The worker is a fun individual who likes to be the center of attention. Has a positive natural impact on the backstage environment. Has an increased chance of creating positive backstage incidents, but can also go too far or become annoying and can therefore also sometimes create negative backstage altercation. ',
  7:'Party Animal: The worker is a partier and brings an upbeat energy to situations. Has a major positive natural impact on the backstage environment. Negative morale effects on them are greatly dampened. Positive morale effects on them are greatly amplified. Has an increased chance of creating positive backstage incidents, but also of being unreliable. Has an increased risk of developing addictions. ',
  8:'People Person: The worker gets on with absolutely everyone. Has a major positive natural impact on the backstage environment. Negative morale effects on them are greatly dampened. Positive morale effects on them are greatly amplified. ',
  9:'Irrepressible: The worker is perpetually in a good mood and impossible not to like. Has a major positive natural impact on the backstage environment. Negative morale has no effect on them. Positive morale effects on them are greatly amplified. ',
  10:'Free Spirit: The worker is a free spirit who seems to be on a different planet from everyone else. Has a mild positive natural impact on the backstage environment. Morale has no effect on them. Has an increased chance of being unreliable. ',
  11:'Driven: The worker is extremely focused about having the best career possible. They have no natural impact on the backstage environment. Negative morale has no effect on them. Has a reduced chance of being involved in backstage interactions and will rarely be unreliable. ',
  12:'Intense: The worker is naturally very tightly wound. Their impact on the backstage environment entirely reflects their morale: the more unhappy they are the greater their negative impact, and the happier they are the greater their positive impact. Has an increased chance of getting into backstage altercations. ',
  13:'Mercenary: The worker is only interested in their own career and making as much money and gaining as much success as possible. Has a mildly negative natural impact on the backstage environment. Morale effects on them are significantly dampened. Financial terms and incentives have a greater impact upon their decisions than normal. ',
  14:'Loner: The worker keeps themselves to themselves. Has a mildly negative natural impact on the backstage environment. Negative morale effects on them are slightly amplified. Positive morale effects on them are dampened. Will rarely become involved in backstage interactions. ',
  15:'Prickly: The worker is a prickly customer who takes offence very easily. Their impact on the backstage environment entirely reflects their morale: if they are unhappy they have a massive negative impact, but if they are happy then they have a positive impact. They have a greatly increased chance of getting into backstage altercations. ',
  16:'Selfish: The worker is self-centred. Has a mildly negative natural impact on the backstage environment. Has an increased chance of generating negative backstage interactions. ',
  17:'Gloomy: It is not difficult to distinguish between this worker and a ray of sunshine. Has a major negative impact on the backstage environment. Negative morale effects on them are greatly amplified. Positive morale effects on them are severely dampened. ',
  18:'Insecure: The worker is notoriously insecure about their position. When they are perceived as a Major Star or Star and have neutral or positive morale they have a mildly positive natural impact on the backstage environment, otherwise they have a mildly negative impact and negative morale effects on them are amplified. ',
  19:'Needy: The worker has a fragile ego. Has no natural impact on the backstage environment whilst they have positive morale, otherwise they have a negative impact which increases the unhappier they are. ',
  20:'Sleazy: The worker is a bit of a sleazeball. Has a negative natural impact on the backstage environment. Has an increased chance of generating negative backstage interactions. ',
  21:'Troublemaker: The worker cannot help causing drama. Has a negative natural impact on the backstage environment. Has a greatly increased chance of causing negative backstage interactions. ',
  22:'Agitator: The worker has a tendency to stir up drama. Has a mildly negative natural impact on the backstage environment, but this increases significantly the more unhappy they become. Has an increased chance of generating negative backstage interactions, which increases significantly when unhappy. ',
  23:'Egomaniac: The worker has a huge ego. When perceived as a Major Star or Star they have a positive natural impact on the backstage environment, otherwise they have a negative one (getting worse as they become perceived less.) All morale effects on them are slightly amplified. They have an increased chance of getting into backstage altercations. ',
  24:'Unpredictable: The worker is very mercurial and you never know what to expect. They have no natural impact on the backstage environment. They are liable to get involved in both positive and negative backstage interactions, although it is mostly random as to how often they do so and which direction they take. ',
  25:'Grifter: The worker is a throwback to the carnival days of wrestling and is always up to some sort of scheme. Has no natural impact on the backstage environment unless unhappy, in which case they have a negative impact. Has a slightly increased chance of getting into trouble. ',
  26:'Bully: The worker is a bully, pure and simple. Has a major negative natural impact on the backstage environment which gets worse the higher their perception rating gets. Negative morale effects on them are greatly amplified. Has a greatly increased chance of getting into backstage altercations. ',
  27:'Wild: The worker is a hedonistic wild child. Has a mild negative natural impact on the backstage environment. Has a greatly increased chance of being unreliable. Has a greatly increased risk of developing addictions and problems with the law. ',
  28:'Scumbag: The worker is a total scumbag whose behaviour is often awful. Has a major negative natural impact on the backstage environment. They have a greatly increased chance of getting into backstage altercations. If put in a position of absolute power, such as becoming an owner, they are likely to abuse it. ',
  100:'Highly Moral: The worker is a very moral person and will therefore not want to sign deals with companies that present an overly risqué product, will refuse to take part in overly risqué matches or angles, and will not engage in underhanded behaviour.',
  101:'Unfaithful: The worker has an increased chance of cheating on or with someone.',
  102:'Horndog: The worker has an increased chance of starting new dating relationships, having them collapse early, of cheating on or with someone, and of getting involved in scrapes because of their one-track mind.',
  103:'Creative Dynamo: The worker is extraordinarily creative and is far more likely to come up with new spots, gimmick ideas, etc, than normal.',
  104:'Very Creative: The worker is very creative and is more likely to come up with new spots, gimmick ideas, etc, than normal.',
  105:'Creative: The worker is pretty creative and is slightly more likely to come up with new spots, gimmick ideas, etc, than normal.',
  106:'Passes On Knowledge: The worker is more likely to take on protégés than normal.',
  107:'Unapproachable: The worker does not act as a mentor to others.',
  108:'Highly Strung: The worker tends to react very strongly to events; positive and negative morale changes are amplified.',
  109:'Positive Outlook: The worker is noted for always having a positive outlook; all positive morale changes are amplified and all negative morale changes are dampened.',
  110:'Thin Skinned: The worker is noted for their negative outlook; all negative morale changes are amplified and all positive morale changes are dampened.',
  111:'Notorious Ribber: The worker has an increased chance of pulling ribs on people backstage.',
  112:'Anti-Hardcore: The worker is outspoken about disliking "garbage" wrestling and will not want to sign deals with companies that present a hardcore product.',
  113:'Keeps Kayfabe: The worker is outspoken about disliking "cartoon" wrestling and will not want to sign deals with companies that treat wrestling as a joke or an afterthought.',
  114:'Extremely Old School: The worker is a purist and will not want to sign deals with companies that present hardcore based products or those that treat wrestling as a joke or an afterthought.',
  115:'Money Motivated: When evaluating contract offers, the worker only really cares about the financial aspects (unless their current career goal contradicts this).',
  116:'Loves The Business: When evaluating contract offers, the worker places a lot of value on how happy they would be in the company rather than just looking at the money (unless their current career goal contradicts this).',
  117:'Fame Hungry: When evaluating contract offers, the worker puts a premium on the size of the company as they are looking to become famous (unless their current career goal contradicts this).',
  118:'Has A Temper: The worker is known to have a temper and so has an increased chance of starting or getting pulled into fights and arguments backstage.',
  119:'Born Fighter: The worker is known never to back down and so while they are no more likely than normal to provoke a fight, they do have an increased chance of getting pulled into physical altercations backstage.',
  120:'Bad Ass Reputation: The worker has a reputation in the industry for being a bad ass. They will protect their image by not getting involved in games or gossip backstage, are more likely to act as a judge in wrestler court, and will always stand up for themselves if provoked.',
  121:'Motormouth: The worker never shuts up and so has an increased chance of getting involved in gossip, giving opinions on other workers, and telling stories.',
  122:'Story Teller: The worker is well known to be one of wrestlings great story tellers and has an increased chance of entertaining people backstage with tales.',
  123:'Prudish: The worker is prudish and so will not pose for magazines or get involved in things like sex scandals.',
  124:'Apolitical: The worker has virtually no interest in wrestling politics and so is very unlikely to complain about being asked to put someone over unless it is someone ridiculously beneath them.',
  125:'Easy To Do Business With: The worker is easy to do business with and will generally agree to put anyone over without hesitation unless it is someone who is obviously very beneath them.',
  126:'Business Mindset: The worker has an all-business mindset when it comes to their booking and is likely to complain if asked to lose to someone where it is likely to hurt them.',
  127:'Political Player: The worker can be hard to do business with as they are very likely to kick up a fuss if asked to lose to lesser workers.',
  128:'Control Freak: When in charge of a company this worker likes to keep an iron grip and so will rarely, if ever, give up a booking role and will be more likely to take over as booker if the position becomes available.',
  129:'Faithful: The worker has a massively decreased chance of cheating on or with someone, and their romantic relationships tend to be far more stable than normal.',
  131:'Talent Spotter: The worker is more likely to offer to put younger talent over in order to help them out.',
  132:'That Does Not Work for Me, Brother: The worker never proactively offers to put people over and will not be interested even if directly asked to do so.',
  133:'It Is Who You Know: The worker will always agree to put over people they have a positive relationship with.',
  134:'Undemanding: The worker never complains about being left off shows.',
  135:'Uncreative: The worker is known to not be very creative and is unlikely to come up with new spots, gimmick ideas, etc.',
  136:'Stooge: The worker has no moral objections to acting as a stooge for a booker (although they can still reject it for other reasons).',
  137:'Not A Snitch: The worker will never accept an offer to work as a bookers stooge and will become upset if asked.',
  138:'Ambitious: If the worker feels upset at being left off a big show, their corresponding morale hit is more severe than normal.',
  139:'Workaholic: The worker will complain about being left off shows more quickly than normal for someone in their position.',
  140:'Crazy Jealous: If the worker is in a backstage environment that also includes their romantic partner, their jealousy leads to them being more likely to get involved in negative incidents.',
  197:'Chequered Past: The worker used to be in trouble with the authorities a lot but is now reformed. The worker will not get into trouble with law enforcement agencies in the future.',
  198:'Often In Trouble: Slightly increases the workers potential for getting into trouble with law enforcement agencies.',
  199:'Most Wanted: The worker regularly gets into trouble with the authorities. Heavily increases the workers potential for getting into trouble with law enforcement agencies.',
  201:'Former Smoker: Slightly reduces the workers potential lifespan. Increases the chance of the worker relapsing.',
  202:'Smoker: Reduces the workers potential lifespan. Has a mild negative impact on the workers physical skills over time.',
  203:'Heavy Smoker: Heavily reduces the workers potential lifespan. Has a negative impact on the workers physical skills over time.',
  204:'Former Drinker: Slightly reduces the workers potential lifespan. Increases the chance of the worker relapsing.',
  205:'Drinker: Reduces the workers potential lifespan. Has a negative impact on the workers ability to stay in shape. Slightly increases the chance of the worker developing behaviour issues.',
  206:'Heavy Drinker: Heavily reduces the workers potential lifespan. Has a major negative impact on the workers ability to stay in shape. Increases the chance of the worker developing behaviour issues.',
  207:'Former Soft Drug User: Increases the chance of the worker relapsing.',
  208:'Soft Drug User: Slightly increases the chance of the worker developing behaviour issues.',
  209:'Heavy Soft Drug User: Increases the chance of the worker developing behaviour issues.',
  210:'Former Hard Drug User: Reduces the workers potential lifespan. Increases the chance of the worker relapsing.',
  211:'Hard Drug User: Reduces the workers potential lifespan. Has a negative impact on the workers in-ring performance and physical skills over time.',
  212:'Heavy Hard Drug User: Heavily reduces the workers potential lifespan. Has a major negative impact on the workers in-ring performance and physical skills over time.',
  213:'Former Steroid User: Reduces the workers potential lifespan. If a worker comes off steroids during gameplay, there will also be short term effects such as potential weight loss and decreases in physical ability.',
  214:'Steroid User: Has a positive impact on the workers ability to improve their physical abilities. Reduces the workers potential lifespan. Slightly increases the workers injury risk.',
  215:'Heavy Steroid User: Has a major positive impact on the workers ability to improve their physical abilities. Heavily reduces the workers potential lifespan. Increases the workers injury risk.',
  216:'Former Pain Killer Abuser: Reduces the workers potential lifespan. Increases the chance of the worker relapsing.',
  217:'Pain Killer Abuser: Reduces the workers potential lifespan. Slightly increases the chance of the worker developing behaviour issues.',
  218:'Heavy Pain Killer Abuser: Reduces the workers potential lifespan. Increases the chance of the worker developing behaviour issues. Has a negative impact on the workers physical skills over time.',
  219:'Straight Edge: The worker will not develop smoking, drinking, drug, or steroid issues.',
  225:'Movie Star: The worker will occasionally accept acting jobs on large scale movies and will be away from wrestling for a lengthy period of time.',
  226:'TV Actor: The worker will occasionally accept acting jobs on TV shows and will be away from wrestling for a short period of time.',
  227:'Famous Musician: The worker will regularly go on tour with his or her band and will not accept wrestling bookings during this time.',
  228:'Musician: The worker will occasionally go on tour with his or her band and will not accept wrestling bookings during this time.',
  229:'MMA Fighter: The worker will accept occasional MMA fights until they become too old or physically broken to do so.',
  230:'Former MMA Fighter: The worker will no longer accept MMA fights and will not become active in the sport again.',
  231:'Stud Athlete: The worker has a particularly strong athletic background and so the (hidden) caps on their Power, Athleticism, and Stamina skills will always be higher than normal.',
  232:'Gymnastic Background: The worker has a particularly strong gymnastic background and so the (hidden) caps on their Athleticism, Aerial, and Flashiness skills will always be higher than normal.',
  233:'Boxer: The worker will accept occasional boxing matches until they become too old or physically broken to do so.',
  234:'Former Boxer: The worker will no longer accept boxing matches and will not become active in the sport again.',
  236:'Former Pro Martial Artist: The worker will no longer accept professional martial arts fights and will not become active in that sport again.',
  237:'No Politics: The worker will never become involved in politics.',
  241:'Political Interest: The worker has a strong interest or recurring involvement in professional politics and is more likely to take time away from wrestling in order to work in that area.',
  301:'Daredevil: The worker is always willing to take crazy and stunt bumps.',
  302:'Fearless: The worker is willing to take crazy and stunt bumps, but will be relatively smart about turning them down when they are not appropriate.',
  303:'Risk Taker: The worker is willing to take crazy and stunt bumps, but will be very smart about turning them down when they are not appropriate.',
  304:'Stuntman: The worker is always willing to take stunt bumps but draws the line at riskier crazy bumps.',
  305:'No Stunts: The worker never agrees to crazy or stunt bumps.',
  306:'Deathmatch Wrestler: The worker is always willing to do deathmatches and will additionally never turn down matches due to content or injury concerns.',
  307:'Will Risk Injury: The worker will never turn down matches due to injury concerns.',
  310:'100% Babyface: The worker is a babyface through and through and struggles if asked to be heelish.',
  311:'Better As Babyface: The worker is a natural babyface but can still play a heel if needed.',
  312:'Better As Heel: The worker is a natural heel but can still play a babyface if needed.',
  313:'100% Heel: The worker is a heel through and through and struggles if asked to play a babyface.',
  314:'Amazing Babyface: The worker is amazing at working the crowd as a babyface and will get performance bonuses when in that role.',
  315:'Amazing Heel: The worker is amazing at working the crowd as a heel and will get performance bonuses when in that role.',
  320:'Plays Dominant Well: The worker gets a bonus when playing Dominant gimmicks.',
  321:'Plays Comedy Well: The worker gets a bonus when playing Comedy gimmicks.',
  322:'Plays Swagger Well: The worker gets a bonus when playing Swagger gimmicks.',
  323:'Plays Gimmicky / Cartoonish Well: The worker gets a bonus when playing Gimmicky / Cartoonish gimmicks.',
  324:'Plays Bad Ass Well: The worker gets a bonus when playing Bad Ass gimmicks.',
  325:'Plays Legitimate Well: The worker gets a bonus when playing Legitimate gimmicks.',
  326:'Plays Weasely / Underdog Well: The worker gets a bonus when playing Weasely / Underdog gimmicks.',
  327:'Plays Realistic Well: The worker gets a bonus when playing Realistic gimmicks.',
  328:'Plays Mysterious / Occult Well: The worker gets a bonus when playing Mysterious / Occult gimmicks.',
  329:'Plays Offbeat / Unstable Well: The worker gets a bonus when playing Offbeat / Unstable gimmicks.',
  330:"Can't Play Dominant: The worker would be penalised if asked to play a Dominant gimmick.",
  331:"Can't Play Comedy: The worker would be penalised if asked to play a Comedy gimmick.",
  332:"Can't Play Swagger: The worker would be penalised if asked to play a Swagger gimmick.",
  333:"Can't Play Gimmicky / Cartoonish: The worker would be penalised if asked to play a Gimmicky / Cartoonish gimmick.",
  334:"Can't Play Bad Ass: The worker would be penalised if asked to play a Bad Ass gimmick.",
  335:"Can't Play Legitimate: The worker would be penalised if asked to play a Legitimate gimmick.",
  336:"Can't Play Weasely / Underdog: The worker would be penalised if asked to play a Weasely / Underdog gimmick.",
  337:"Can't Play Realistic: The worker would be penalised if asked to play a Realistic gimmick.",
  338:"Can't Play Mysterious / Occult: The worker would be penalised if asked to play a Mysterious / Occult gimmick.",
  339:"Can't Play Offbeat / Unstable: The worker would be penalised if asked to play a Offbeat / Unstable gimmick.",
  340:'No Comedy Matches: The worker cannot do comedy matches at all and will be heavily penalised if booked in one.',
  341:'Poor Comedy Matches: The worker is poor at trying to add comedy to matches and will be penalised if booked in one.',
  342:'Noted Comedy Match Performer: The worker is noted for doing comedy in matches and so gets a bonus when booked in a comedy-based bout.',
  343:'Comedy Match Worker: The worker is known for adding comedy spots to matches and gets a small bonus when booked in a comedy-based bout.',
  344:'Canny Operator: The worker is known to hold back on shows that do not matter.',
  345:'Dynamo: The worker never holds back during matches, even on unimportant shows.',
  346:'Tag Team Specialist: If the worker is used in a tag team that has at least 15 experience and does not have negative chemistry, the team gets a special performance bonus on top of any chemistry bonus (the boost is only applied once, even if both have this attribute).',
  347:'Selfish Performer: The worker has a selfish tendency to eat up lesser performers in order to make themselves look good.',
  348:'Giving Performer: The worker has a kindly tendency to shine up lesser performers, making them look better than they are and improving the match.',
  349:"Explosive Ring Style: The worker's extremely explosive in-ring style means that they get a bonus when allowed to dominate a match but a penalty in bouts that are slowly built, go over 10 minutes, or are aimed at working or calming the crowd.",
  350:'Squash Master: The worker knows exactly how to work squash matches in order to make themselves shine; they get a bonus when booked to dominate in a match.',
  351:'Scatterbrained: The worker is infamous for their abysmal memory; trying to get them to do a scripted match is pointless as they will have forgotten everything by the time they get to the ring.',
  352:'High Pain Threshold: The worker has a high pain threshold and so the penalties that are normally incurred for working while carrying an injury are lessened.',
  353:"Slow And Steady: The worker is renowned for taking time to warm up and get into a match. They get penalised for being in matches under 15 minutes in length, with the penalty increasing the shorter the match. For bouts that are slowly built and go 20 minutes or longer they receive a bonus.",
  354:'Not A Piece Of Meat: The worker never agrees to take part in eye candy matches.',
  356:'Voice Of Epics: When at the commentary table, the worker gets a bonus for Steal The Show, Epic and Once In A Lifetime matches, or if the bout goes for 30 minutes or more.',
  357:'Voice Of Stories: When at the commentary table, the worker gets a bonus for Story Telling matches.',
  358:'Voice Of Chaos: When at the commentary table, the worker gets a bonus for Wild Brawl, Mayhem, Car Crash, Hardcore and Deathmatch matches.',
  359:'Voice Of Comedy: When at the commentary table, the worker gets a bonus for Comedy matches.',
  360:'Voice Of Sleaze: When at the commentary table, the worker gets a bonus for Eye Candy matches.',
  361:'Agent Of The Old School: When agenting a match, the worker gets a bonus for Regular, Work The Crowd, Calm The Crowd and Lift The Crowd matches providing they are straight 1 vs 1 or 2 vs 2 bouts that go for at least 10 minutes.',
  363:'Agent Of Rumbles: When agenting a match, the worker gets a bonus for battle royal matches with at least 30 participants that lasts for a minimum of 45 minutes.',
  365:'Agent Of Stories: When agenting a match, the worker gets a bonus for Story Telling matches.',
  369:'Definitive Style: The worker is not eligible for changing their style during gameplay, regardless of any changes to their stats.',
  370:"What's My Line?: When working an angle without a script, this worker has a much higher chance than normal of receiving a penalty.",
  371:'Tales From The Script: When working an angle without a script, this worker has a higher chance than normal of receiving a penalty.',
  372:'Improv Training: When working an angle without a script, this worker has a higher chance than normal of receiving a bonus.',
  373:'Shoots From The Lip: When working an angle without a script, this worker has a much higher chance than normal of receiving a bonus.',
  374:'No Sense Of Humour: The worker cannot act as comic relief during angles at all and will be heavily penalised if used in that way.',
  375:'Poor Comedic Timing: The worker is poor at being comic relief during angles and will be penalised if used in that way.',
  376:'Good Comedic Timing: The worker is noted for being able to act as comic relief during angles and so gets a bonus when used in that way.',
  377:'Funny Bones: The worker excels at being comic relief during angles and so gets a major bonus when used in that way.',
  378:'Chain Specialist: The worker is a specialist at matches where the set up involves a chain or strap and so gets a bonus (maximum one specialist bonus per match).',
  379:'Cage Specialist: The worker is a specialist at matches where the set up involves a steel cage, cell or chamber and so gets a bonus (maximum one specialist bonus per match).',
  380:'Tables Specialist: The worker is a specialist at matches where the set up involves tables and so gets a bonus (maximum one specialist bonus per match).',
  381:'Ladder Specialist: The worker is a specialist at matches where the set up involves a ladder and so gets a bonus (maximum one specialist bonus per match).',
  382:'Weapons Specialist: The worker is a specialist at matches where the set up involves weapons and so gets a bonus (maximum one specialist bonus per match).',
  383:'Deathmatch Specialist: The worker is a specialist at matches where the set up involves deathmatch content (barbed wire, bed of nails, light tubes, thumbtacks, glass, explosives) and so gets a bonus (maximum one specialist bonus per match).',
  384:'Big Match Specialist: The worker raises their game for the truly big matches; if the aim is Spectacle, Epic, or Once In A Lifetime then they tend to perform better.',
  385:'Silent Type: The worker, whether for gimmick reasons or otherwise, does not talk and will avoid angles where microphone work would be required.',
  386:'Host With The Most: The worker is an experienced professional interviewer; when they are present in the role of Interviewer or Segment Host during an angle part, the other workers involved in speaking roles are less likely to receive (avoidable) penalties, many penalties have reduced effects, and those who are struggling can gain additional bonuses or support to minimise the damage done.',
  387:'Mr. Finale: The worker raises their game even more than normal when wrestling on a season finale show.',
}

function genderIcon(g: number): string {
  return g === 1 || g === 4 ? maleIcon
       : g === 5 || g === 8 ? femaleIcon
       : g === 2 || g === 6 ? transIcon
       : nonbinaryIcon
}
function genderTint(g: number): string {
  return g === 1 || g === 4 ? '#60a5fa'
       : g === 2 ? '#93b4e8'
       : g === 5 || g === 8 ? '#f472b6'
       : g === 6 ? '#e88ab8'
       : '#c084fc'
}
const GENDER_LABELS: Record<number, string> = {
  1: 'Male', 2: 'Trans Male', 3: 'Non-Binary', 4: 'Male',
  5: 'Female', 6: 'Trans Female', 7: 'Non-Binary', 8: 'Female',
}
const ATTR_MAP: Record<number, string> = {
  1:'Professional',2:'Quiet',3:'Stalwart',4:'Relaxed',5:'Lively',6:'Class Clown',7:'Party Animal',8:'People Person',9:'Irrepressible',10:'Free Spirit',11:'Driven',12:'Intense',13:'Mercenary',14:'Loner',15:'Prickly',16:'Selfish',17:'Gloomy',18:'Insecure',19:'Needy',20:'Sleazy',21:'Troublemaker',22:'Agitator',23:'Egomaniac',24:'Unpredictable',25:'Grifter',26:'Bully',27:'Wild',28:'Scumbag',100:'Highly Moral',101:'Unfaithful',102:'Horndog',103:'Creative Dynamo',104:'Very Creative',105:'Creative',106:'Passes On Knowledge',107:'Unapproachable',108:'Highly Strung',109:'Positive Outlook',110:'Thin Skinned',111:'Notorious Ribber',112:'Anti-Hardcore',113:'Keeps Kayfabe',114:'Extremely Old School',115:'Money Motivated',116:'Loves The Business',117:'Fame Hungry',118:'Has A Temper',119:'Born Fighter',120:'Bad Ass Reputation',121:'Motormouth',122:'Story Teller',123:'Prudish',124:'Apolitical',125:'Easy To Do Business With',126:'Business Mindset',127:'Political Player',128:'Control Freak',129:'Faithful',131:'Talent Spotter',132:"That Doesn't Work for Me, Brother",133:"It's Who You Know",134:'Undemanding',135:'Uncreative',136:'Stooge',137:'Not A Snitch',138:'Ambitious',139:'Workaholic',140:'Crazy Jealous',197:'Chequered Past',198:'Often In Trouble',199:'Most Wanted',201:'Former Smoker',202:'Smoker',203:'Heavy Smoker',204:'Former Drinker',205:'Drinker',206:'Heavy Drinker',207:'Former Soft Drug User',208:'Soft Drug User',209:'Heavy Soft Drug User',210:'Former Hard Drug User',211:'Hard Drug User',212:'Heavy Hard Drug User',213:'Former Steroid User',214:'Steroid User',215:'Heavy Steroid User',216:'Former Pain Killer Abuser',217:'Pain Killer Abuser',218:'Heavy Pain Killer Abuser',219:'Straight Edge',225:'Movie Star',226:'TV Actor',227:'Famous Musician',228:'Musician',229:'MMA Fighter',230:'Former MMA Fighter',231:'Stud Athlete',232:'Gymnastic Background',233:'Boxer',234:'Former Boxer',236:'Former Pro Martial Artist',237:'No Politics',241:'Political Interest',301:'Daredevil',302:'Fearless',303:'Risk Taker',304:'Stuntman',305:'No Stunts',306:'Deathmatch Wrestler',307:'Will Risk Injury',310:'100% Babyface',311:'Better As Babyface',312:'Better As Heel',313:'100% Heel',314:'Amazing Babyface',315:'Amazing Heel',320:'Plays Dominant Well',321:'Plays Comedy Well',322:'Plays Swagger Well',323:'Plays Gimmicky/Cartoonish Well',324:'Plays Bad Ass Well',325:'Plays Legitimate Well',326:'Plays Weasely/Underdog Well',327:'Plays Realistic Well',328:'Plays Mysterious/Occult Well',329:'Plays Offbeat/Unstable Well',330:"Can't Play Dominant",331:"Can't Play Comedy",332:"Can't Play Swagger",333:"Can't Play Gimmicky/Cartoonish",334:"Can't Play Bad Ass",335:"Can't Play Legitimate",336:"Can't Play Weasely/Underdog",337:"Can't Play Realistic",338:"Can't Play Mysterious/Occult",339:"Can't Play Offbeat/Unstable",340:'No Comedy Matches',341:'Poor Comedy Matches',342:'Noted Comedy Match Performer',343:'Comedy Match Worker',344:'Canny Operator',345:'Dynamo',346:'Tag Team Specialist',347:'Selfish Performer',348:'Giving Performer',349:'Explosive Ring Style',350:'Squash Master',351:'Scatterbrained',352:'High Pain Threshold',353:'Slow And Steady',354:'Not A Piece Of Meat',356:'Voice Of Epics',357:'Voice Of Stories',358:'Voice Of Chaos',359:'Voice Of Comedy',360:'Voice Of Sleaze',361:'Agent Of The Old School',363:'Agent Of Rumbles',365:'Agent Of Stories',369:'Definitive Style',370:"What's My Line?",371:'Tales From The Script',372:'Improv Training',373:'Shoots From The Lip',374:'No Sense Of Humour',375:'Poor Comedic Timing',376:'Good Comedic Timing',377:'Funny Bones',378:'Chain Specialist',379:'Cage Specialist',380:'Tables Specialist',381:'Ladder Specialist',382:'Weapons Specialist',383:'Deathmatch Specialist',384:'Big Match Specialist',385:'Silent Type',386:'Host With The Most',387:'Mr. Finale',501:'Natural Trainer',502:'Desperado',503:'Heavy Social Media User',504:'Shuns Social Media',505:'Healing Factor',506:'Career Woman',507:'Prodigy',508:'Not A Natural',509:'Age Is Just A Number',510:"Can't Fight Time",511:'Ahead Of Their Time',512:'Homebody',513:'World Traveler',514:'Deep Roots',515:'Fitness Fanatic',516:'Bodybuilder',517:'Skinny Genes',518:'Fat Genes',519:'Masked For Life',520:'Troublesome Neck',521:'Troublesome Back',522:'Troublesome Shoulder',523:'Troublesome Knee',524:'History Of Concussions',525:'Loyal',526:'Itchy Feet',527:'Future Referee',529:'Future Colour Commentator',530:'Future Manager',531:'Future Personality',532:'Future Road Agent',533:'Wrestling In The Blood',534:'Outside Interests',535:'Modelling Experience',536:'Hot New Move',537:'Hot New Catchphrase',538:'Flavour Of The Month',540:'Groundswell Of Support',541:'Midas Touch',543:'Unable To Wrestle Again',544:'Speech Impediment',545:'A Marketing Nightmare',546:'Unmarketable',547:'Easily Marketable',548:'A Marketing Dream',550:'Golden Mane',549:'No Pregnancies',551:'Life Long Underdog',552:'Brittle Bones',553:'Rubber Bones',554:"Can't Stay Away",555:'At Home In Japan',556:'Testing The Waters',558:'Wrestling Is Secondary',559:'Counts As Mini',560:"Doesn't Count As Mini",561:'Adult Entertainment',562:'Good Genetics',563:'Bad Genetics',564:'And Then The Bell Rang',565:'Good Hand',566:'Body Positive',567:'Cinematic Visionary',568:'Forever Young',569:'Iron Man',570:'Frail',
}
function fmtDate(d: any): string {
  if (!d) return ''
  try { return libFmtDate(d) } catch { return String(d) }
}











export function WorkerProfile({ workerUid }: { workerUid: number }) {
  const { img, focusedFed, playerFed, gameInfo, allFeds, navigateToEntity } = useApp()
  const { data: w, error } = useSWR('worker-' + workerUid, () => api.roster.detail(workerUid))
  const [tab, setTab] = useState<'profile' | 'agent-report' | 'form'>('profile')

  const stars = useMemo(() => ({
    current: w?.current_stars || 0.5,
    potential: w?.potential_stars || 0.5,
    currentScore: w?.current_score || 0,
    potentialScore: w?.potential_score || 0,
  }), [w])

  if (error) return <div className="loading" style={{ color: 'var(--accent)' }}>Error loading worker</div>
  if (!w) return <div className="loading">Loading...</div>

  const picture = w.contract?.picture || w.picture
  const portraitUrl = picture ? img('People/' + picture) : ''
  const flagCode = NATIONALITY_FLAGS[w.nationality]
  const countryName = NATIONALITY_NAMES[w.nationality]
  const flagUrl = flagCode ? new URL(`../../assets/flag-icons-main/flags/4x3/${flagCode}.svg`, import.meta.url).href : ''
  const rawGender = (w as any).Gender ?? 1
  const birthday = (w as any).Birthday
  const c = w.contract

  const wageYearly = c ? c.amount * 12 : 0
  const expiryDate = c && gameInfo?.current_date ? (() => {
    const d = new Date(gameInfo.current_date)
    d.setDate(d.getDate() + c.days_left)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })() : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-color)', paddingLeft: 16 }}>
        <div onClick={() => setTab('profile')} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: tab === 'profile' ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === 'profile' ? '2px solid var(--accent)' : '2px solid transparent' }}>
          Profile
        </div>
        <div onClick={() => setTab('agent-report')} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: tab === 'agent-report' ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === 'agent-report' ? '2px solid var(--accent)' : '2px solid transparent' }}>
          Agent Report
        </div>
        <div onClick={() => setTab('form')} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: tab === 'form' ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === 'form' ? '2px solid var(--accent)' : '2px solid transparent' }}>
          Form
        </div>
      </div>

      {/* Info bar: portrait+info+logos | contract | agent's report */}
      <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
          {/* Portrait + info + logos */}
          <div style={{ flex: 1, display: 'flex', gap: 12, minWidth: 0 }}>
            {portraitUrl ? (
              <img src={portraitUrl} alt="" style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 150, height: 150, background: 'var(--bg-secondary)', borderRadius: 12, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', alignItems: 'flex-start', width: 170, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {flagUrl && <img src={flagUrl} alt="" style={{ width: 28, height: 21, objectFit: 'cover', borderRadius: 3 }} />}
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{countryName || 'Unknown'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', minHeight: '1.5em' }}>
                  {w.age} years old{birthday ? ` (${fmtDate(birthday)})` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-block', width: 18, height: 18, flexShrink: 0,
                    backgroundColor: genderTint(rawGender),
                    mask: `url(${genderIcon(rawGender)}) center/contain no-repeat`,
                    WebkitMask: `url(${genderIcon(rawGender)}) center/contain no-repeat`,
                  }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{GENDER_LABELS[rawGender] || w.gender}</span>
                </div>
              </div>
              {(() => {
                const s = w.skills
                if (!s || w.non_wrestler) return null
                const radarVals = [
                  Math.max(Number(s.brawl?.pct ?? 0), Number(s.puroresu?.pct ?? 0), Number(s.hardcore?.pct ?? 0), Number(s.technical?.pct ?? 0), Number(s.air?.pct ?? 0)),
                  [s.psych?.pct, s.experience?.pct, s.respect?.pct, s.reputation?.pct].reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / 4,
                  [s.charisma?.pct, s.mic?.pct, s.acting?.pct, s.flash?.pct, s.star?.pct, s.looks?.pct, s.menace?.pct].reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / 7,
                  [s.basics?.pct, s.selling?.pct, s.consistency?.pct, s.safety?.pct].reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / 4,
                  [s.stamina?.pct, s.athletic?.pct, s.power?.pct, s.toughness?.pct, s.injury?.pct].reduce((a, b) => (a ?? 0) + (b ?? 0), 0) / 5,
                  w.pop?.pct ?? 0,
                ].map(v => Math.round(v ?? 0))
                return <RadarChart values={radarVals} labels={['Primary', 'Mental', 'Perf.', 'Fund.', 'Phys.', 'Pop']} tooltipLabels={['Primary', 'Mental', 'Performance', 'Fundamental', 'Physical', 'Popularity']} size={120} />
              })()}
              {(() => {
                const fedIds: number[] = (w as any).all_fed_ids || []
                if (c?.fed_uid && !fedIds.includes(c.fed_uid)) fedIds.push(c.fed_uid)
                if (fedIds.length === 0) return null
                const feds = fedIds.map(id => allFeds.find(f => f.uid === id)).filter(Boolean)
                if (feds.length === 0) return null
                const cols = Math.ceil(Math.sqrt(feds.length))
                const rows = Math.ceil(feds.length / cols)
                const logoSize = Math.floor(150 / Math.max(cols, rows))
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${logoSize}px)`, gap: 4, alignSelf: 'center' }}>
                    {feds.map(fed => {
                      const logo = fed!.logo ? img('Logos/' + fed!.logo) : ''
                      if (!logo) return null
                      return <img key={fed!.uid} src={logo} alt="" style={{ width: logoSize, height: logoSize, objectFit: 'contain', borderRadius: 4, cursor: 'pointer' }} onClick={e => { e.stopPropagation(); navigateToEntity('fed', fed!.uid) }} />
                    })}
                  </div>
                )
              })()}
            </div>
          </div>

          <div style={{ width: 1, alignSelf: 'stretch', background: '#5a6470', margin: '0 20px', flexShrink: 0 }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Contract</div>
            {c ? (
              <>
                <div style={{ fontSize: 13, color: '#fff' }}>
                  ${c.amount.toLocaleString()} p.m. <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(${wageYearly.toLocaleString()} p.a.)</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#fff' }}>{c.written ? 'Written' : 'Open'}{c.exclusive ? ', Exclusive' : ''} Contract</div>
                </div>
                <div style={{ fontSize: 13, color: '#fff' }}>
                  Expires {expiryDate || `${c.days_left}d`} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({c.days_left} days)</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No contract</div>
            )}
          </div>

      {tab === 'profile' && (
          <>
          <div style={{ width: 1, alignSelf: 'stretch', background: '#5a6470', margin: '0 20px', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>Agent's Report
              <span style={{ cursor: 'pointer', display: 'flex' }} onClick={() => setTab('agent-report')} title="View full scouting report">
                <img src={rightIcon} alt="" style={{ width: 12, height: 12, filter: 'brightness(0) invert(0.6)' }} />
              </span>
            </div>
            </div>
            <AgentReportTab w={w} stars={stars} img={img} focusedFed={focusedFed} playerFed={playerFed} AREAS={AREAS} ATTR_MAP={ATTR_MAP} ATTR_TOOLTIP={ATTR_TOOLTIP} ScoutIcon={ScoutIcon} compact />
          </div>
          </>
          )}
        </div>
      </div>

      {tab === 'profile' ? (
      <ProfileTab w={w} stars={stars} img={img} focusedFed={focusedFed} playerFed={playerFed} allFeds={allFeds} navigateToEntity={navigateToEntity} onViewForm={() => setTab('form')} AREAS={AREAS} ATTR_MAP={ATTR_MAP} ATTR_TOOLTIP={ATTR_TOOLTIP} condMaleHead={condMaleHead} condMaleBody={condMaleBody} condMaleLegs={condMaleLegs} condMaleArmLeft={condMaleArmLeft} condMaleArmRight={condMaleArmRight} condFemHead={condFemHead} condFemBody={condFemBody} condFemLegs={condFemLegs} condFemArmLeft={condFemArmLeft} condFemArmRight={condFemArmRight} wrestlerIcon={wrestlerIcon} refereeIcon={refereeIcon} announcerIcon={announcerIcon} managerIcon={managerIcon} personalityIcon={personalityIcon} roadAgentIcon={roadAgentIcon} />

      ) : tab === 'agent-report' ? (
      <AgentReportTab w={w} stars={stars} img={img} focusedFed={focusedFed} playerFed={playerFed} AREAS={AREAS} ATTR_MAP={ATTR_MAP} ATTR_TOOLTIP={ATTR_TOOLTIP} ScoutIcon={ScoutIcon} />

      ) : (
      <FormTab workerUid={workerUid} />
      )}
    </div>
  )
}
