import { useApp } from '../../context/AppContext'
import { ScheduleTab } from './show/ScheduleTab'
import { ShowHistoryTab } from './show/ShowHistoryTab'
import { SegmentsTab } from './show/SegmentsTab'
import { StorylinesTab } from './storyline/StorylinesTab'
import { ArcsTab } from './arc/ArcsTab'
import { DiaryTab } from './diary/DiaryTab'

export function CreativePage() {
  const { creativeTab } = useApp()

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      {creativeTab === 'schedule' && <ScheduleTab />}
      {creativeTab === 'history' && <ShowHistoryTab />}
      {creativeTab === 'segments' && <SegmentsTab />}
      {creativeTab === 'storylines' && <StorylinesTab />}
      {creativeTab === 'arcs' && <ArcsTab />}
      {creativeTab === 'diary' && <DiaryTab />}
    </div>
  )
}
