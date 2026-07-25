// Shared display-label lookups sourced from a single place so the same map
// isn't re-typed across columns, filters, grouping and profile views.

/** TEW worker perception tier (tblContract.Perception) → display name. */
export const PERCEPTION_LABELS: Record<number, string> = {
  0: 'No Perception', 1: 'Major Star', 2: 'Star', 3: 'Well Known', 4: 'Recognisable', 5: 'Unimportant',
}

/** Worker skill key → display name, shared by the worker-list columns/filters
 *  and the profile skill grid. */
export const SKILL_LABELS: Record<string, string> = {
  brawl: 'Brawling', puroresu: 'Puroresu', hardcore: 'Hardcore', technical: 'Technical',
  air: 'Aerial', flash: 'Flashiness', psych: 'Psychology', experience: 'Experience',
  respect: 'Respect', reputation: 'Reputation', charisma: 'Charisma', mic: 'Microphone',
  acting: 'Acting', star: 'Star Quality', looks: 'Looks', menace: 'Menace', basics: 'Basics',
  selling: 'Selling', consistency: 'Consistency', safety: 'Safety', stamina: 'Stamina',
  athletic: 'Athleticism', power: 'Power', toughness: 'Toughness', injury: 'Injury Resistance',
  announcing: 'Play by Play', colour: 'Colour', refereeing: 'Refereeing',
}
