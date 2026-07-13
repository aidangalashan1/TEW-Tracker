import { createPortal } from 'react-dom'
import { Worker } from '../api'
import { useApp } from '../context/AppContext'
import { fmtMoney } from '../lib/money'
import { ratingColor } from '../lib/colors'
import closeIcon from '../assets/UI icons/close.png'

interface Props {
  workers: Worker[]
  onClose: () => void
}

const SKILL_KEYS = ['brawl','technical','air','stamina','charisma','mic','star','psych','basics','selling','consistency','safety'] as const
const STAT_ROWS = [
  { label: 'Age', get: (w: Worker) => String(w.age) },
  { label: 'Gender', get: (w: Worker) => w.gender },
  { label: 'Style', get: (w: Worker) => w.style },
  { label: 'Pop', get: (w: Worker) => w.pop?.pct ? `${w.pop.pct}%` : '—' },
  { label: 'W-L', get: (w: Worker) => w.win_loss ? `${w.win_loss.wins}-${w.win_loss.losses}` : '—' },
  { label: 'Wage', get: (w: Worker) => w.contract ? fmtMoney(w.contract.amount) : '—' },
  { label: 'Expiry', get: (w: Worker) => w.contract?.days_left != null ? `${w.contract.days_left}d` : '—' },
  { label: 'Contract', get: (w: Worker) => w.contract_status || '—' },
  { label: 'Condition', get: (w: Worker) => {
    const p = w.physical as any
    if (!p) return '—'
    const vals = [p.condition1, p.condition2, p.condition3, p.condition4].map((v: number) => Number(v ?? 1000))
    return `${Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length / 10)}%`
  }},
]

export function WorkerCompareModal({ workers, onClose }: Props) {
  const { navigateToEntity } = useApp()
  const pct = (r: any) => Number(r?.pct ?? 0)

  return createPortal(
    <div className="fixed inset-0 z-1000 flex-center bg-overlay" onClick={onClose}>
      <div className="bg-primary rounded-lg w-800 max-w-95vw max-h-90vh flex flex-col border-default" onClick={e => e.stopPropagation()}>
        <div className="flex-between px-4 py-3 border-default-bottom flex-shrink-0">
          <span className="text-base text-bold text-primary">Compare Workers ({workers.length})</span>
          <div onClick={onClose} className="w-28 h-28 rounded-full bg-dark-muted flex-center cursor-pointer">
            <img src={closeIcon} alt="" className="w-14 h-14 filter-icon-gray" />
          </div>
        </div>
        <div className="flex-1 overflow-auto px-4 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-secondary text-semibold pr-3 py-1 sticky top-0 bg-primary">Stat</th>
                {workers.map(w => (
                  <th key={w.uid} className="text-center text-semibold text-primary px-2 py-1 sticky top-0 bg-primary cursor-pointer" onClick={() => navigateToEntity('worker', w.uid)}>
                    <span className="text-blue">{w.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STAT_ROWS.map(row => (
                <tr key={row.label}>
                  <td className="text-secondary text-semibold pr-3 py-1 border-bottom-row">{row.label}</td>
                  {workers.map(w => (
                    <td key={w.uid} className="text-center text-primary px-2 py-1 border-bottom-row">{row.get(w)}</td>
                  ))}
                </tr>
              ))}
              <tr><td colSpan={workers.length + 1} className="pt-2 pb-1 text-xs text-bold text-secondary">Skills</td></tr>
              {SKILL_KEYS.map(skill => (
                <tr key={skill}>
                  <td className="text-secondary text-semibold pr-3 py-1 border-bottom-row" style={{ textTransform: 'capitalize' }}>{skill}</td>
                  {workers.map(w => {
                    const v = pct((w.skills as any)?.[skill])
                    return <td key={w.uid} className="text-center px-2 py-1 border-bottom-row">
                      <span className="text-mono text-bold" style={{ color: ratingColor(v) }}>{v}%</span>
                    </td>
                  })}
                </tr>
              ))}
              <tr><td colSpan={workers.length + 1} className="pt-2 pb-1 text-xs text-bold text-secondary">Performance</td></tr>
              {[
                { label: 'Avg Match', key: 'avg_match_rating' as const },
                { label: 'Avg Segment', key: 'avg_segment_rating' as const },
                { label: 'Avg Angle', key: 'avg_angle_rating' as const },
              ].map(perf => (
                <tr key={perf.label}>
                  <td className="text-secondary text-semibold pr-3 py-1 border-bottom-row">{perf.label}</td>
                  {workers.map(w => {
                    const v = w.performance?.[perf.key]?.pct ?? 0
                    return <td key={w.uid} className="text-center px-2 py-1 border-bottom-row">
                      <span className="text-mono text-bold" style={{ color: ratingColor(v) }}>{v}%</span>
                    </td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  )
}
