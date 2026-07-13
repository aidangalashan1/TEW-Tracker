import { useState, useMemo, useEffect } from 'react'
import { Storyline, PlannedStoryline } from '../../api'
import type { ModuleRenderProps } from '../types'
import { StorylineListModule } from '../storyline-list/StorylineListModule'
import { StorylineGridInner } from './StorylineGridInner'
import { api } from '../../api'

export function StorylinesModule({ data, tier, config, onConfigChange }: ModuleRenderProps<{storylines: Storyline[]}>) {
  const [tab, setTab] = useState<'manager' | 'grid'>('manager')
  const [planned, setPlanned] = useState<PlannedStoryline[]>([])

  useEffect(() => {
    api.plannedStorylines.list().then(r => setPlanned(r.storylines)).catch(() => {})
  }, [])

  const mergedData = useMemo(() => ({
    storylines: data?.storylines || [],
    planned,
  }), [data, planned])

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-default border-t-0 border-r-0 border-l-0 border-default-bottom pl-3 flex-shrink-0">
        <div onClick={() => setTab('manager')} className={`px-4 py-2 text-base text-bold cursor-pointer ${tab === 'manager' ? 'text-accent border-bottom-2-accent' : 'text-muted border-bottom-2-transparent'}`}>
          Manager
        </div>
        <div onClick={() => setTab('grid')} className={`px-4 py-2 text-base text-bold cursor-pointer ${tab === 'grid' ? 'text-accent border-bottom-2-accent' : 'text-muted border-bottom-2-transparent'}`}>
          Grid
        </div>
      </div>

      {tab === 'manager' ? (
        <StorylineListModule data={mergedData as any} tier={tier} config={config} onConfigChange={onConfigChange} width={0} height={0} />
      ) : (
        <StorylineGridInner planned={planned} />
      )}
    </div>
  )
}
