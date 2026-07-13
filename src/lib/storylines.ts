import type { StorylineCol, PlannedStoryline } from '../api'

export type StorylineGridColumn = StorylineCol & { is_planned: boolean }

/** Reshapes planned (not-yet-in-game) storylines into pseudo-columns so they
 *  can render alongside real game storylines in the cross-reference grid
 *  (was storylines/StorylineGridInner). */
export function buildStorylineGridColumns(gameColumns: StorylineCol[], planned: PlannedStoryline[]): StorylineGridColumn[] {
  const game: StorylineGridColumn[] = gameColumns.map(sl => ({ ...sl, is_planned: false }))
  const plannedCols: StorylineGridColumn[] = planned.map(p => ({
    uid: `planned-${p.id}` as any,
    name: p.name,
    heat: 0,
    description: p.notes || '',
    furthered: false,
    workers: (p.workers || []).map(wuid => ({ uid: wuid, name: '', picture: '', major: false, alignment: 0 })),
    is_planned: true,
  }))
  return [...game, ...plannedCols]
}
