import { useApp } from '../../context/AppContext'
import { ScheduleTab } from './show/ScheduleTab'
import { ShowHistoryTab } from './show/ShowHistoryTab'
import { StorylinesTab } from './storyline/StorylinesTab'
import { ArcsTab } from './arc/ArcsTab'

export function CreativePage() {
  const { creativeTab } = useApp()

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {creativeTab === 'schedule' && <ScheduleTab />}
      {creativeTab === 'history' && <ShowHistoryTab />}
      {creativeTab === 'storylines' && <StorylinesTab />}
      {creativeTab === 'arcs' && <ArcsTab />}
    </div>
  )
}
