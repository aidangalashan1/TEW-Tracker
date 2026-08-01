import scoutPsychIcon from '../../../assets/UI icons/scouting/psychology.png'
import scoutReliableIcon from '../../../assets/UI icons/scouting/reliable.png'
import scoutTechnicalIcon from '../../../assets/UI icons/scouting/technical.png'
import scoutCharismaticIcon from '../../../assets/UI icons/scouting/charismatic.png'
import scoutMicIcon from '../../../assets/UI icons/scouting/microphone.png'
import scoutStarQualityIcon from '../../../assets/UI icons/scouting/star quality.png'
import scoutSellingIcon from '../../../assets/UI icons/scouting/selling.png'
import scoutStaminaIcon from '../../../assets/UI icons/scouting/stamina.png'
import scoutInjuryIcon from '../../../assets/UI icons/scouting/injury record.png'
import scoutAthleticIcon from '../../../assets/UI icons/scouting/athletic.png'
import scoutStrengthIcon from '../../../assets/UI icons/scouting/strength.png'
import scoutSafetyIcon from '../../../assets/UI icons/scouting/safety.png'
import scoutTagIcon from '../../../assets/UI icons/scouting/tag specialist.png'
import scoutMarketableIcon from '../../../assets/UI icons/scouting/marketable.png'
import scoutPositiveIcon from '../../../assets/UI icons/scouting/positive influence.png'
import scoutNegativeIcon from '../../../assets/UI icons/scouting/negative influence.png'
import scoutSelfishIcon from '../../../assets/UI icons/scouting/selfish.png'
import scoutPastPrimeIcon from '../../../assets/UI icons/scouting/pastprime.png'

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

export function ScoutIcon({ label, isPro, val, icon, warn, isElite }: { label: string; isPro: boolean; val?: number; icon?: string; warn?: boolean; isElite?: boolean }) {
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
