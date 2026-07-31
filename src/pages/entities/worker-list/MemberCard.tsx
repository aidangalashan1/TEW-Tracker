import { useApp } from '../../../context/AppContext'
import type { Worker, Belt } from '../../../api-types'
import faceIcon from '../../../assets/UI icons/face.png'
import heelIcon from '../../../assets/UI icons/heel.png'
import starIcon from '../../../assets/UI icons/star.png'
import { COLOR_FACE, COLOR_HEEL } from '../../../lib/colors'

/** A roster member's card: picture, name, face/heel, star rating — shared by
 *  a belt's current champion(s) (ChampionsTab) and a tag team/stable's
 *  members (TeamsStablesTab), which are identical apart from the optional
 *  belts-held row and trailing tag. */
export function MemberCard({ worker, tag, belts }: { worker: Worker; tag?: string; belts?: Belt[] }) {
  const { img, navigateToEntity } = useApp()
  const isFace = worker.contract?.face
  const picUrl = (worker.contract?.picture || worker.picture)
    ? img('People/' + (worker.contract?.picture || worker.picture))
    : ''
  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer" style={{ width: 120 }} onClick={() => navigateToEntity('worker', worker.uid)}>
      {belts && belts.length > 0 && (
        <div className="flex items-center gap-1">
          {belts.slice(0, 2).map(b => (
            <img key={b.uid} src={img('Belts/' + b.picture)} alt={b.name} title={b.name}
              style={{ width: 72, height: 56, objectFit: 'contain' }} />
          ))}
        </div>
      )}
      {picUrl ? (
        <img src={picUrl} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
      ) : (
        <div style={{ width: 100, height: 100, background: 'var(--bg-tertiary)', borderRadius: 8 }} />
      )}
      <span className="text-xs text-semibold text-center" style={{ lineHeight: 1.2 }}>{worker.name}</span>
      {isFace != null && (
        <div className="flex items-center gap-1">
          <span className="inline-block" style={{ width: 12, height: 12, backgroundColor: isFace ? COLOR_FACE : COLOR_HEEL, mask: `url(${isFace ? faceIcon : heelIcon}) center/contain no-repeat`, WebkitMask: `url(${isFace ? faceIcon : heelIcon}) center/contain no-repeat` }} />
          <span className="text-xs" style={{ color: isFace ? COLOR_FACE : COLOR_HEEL }}>{isFace ? 'Face' : 'Heel'}</span>
        </div>
      )}
      {worker.current_stars > 0 && (() => {
        const iw = !worker.retired && (worker.positions.includes('Wrestler') || worker.positions.includes('Occasional'))
        const cls = iw ? 'filter-star-gold' : 'filter-star-silver'
        return (
          <span className="inline-flex items-center" style={{ gap: 1 }}>
            {Array.from({ length: 5 }, (_, i) => {
              const remainder = worker.current_stars - i
              if (remainder >= 1) return <img key={i} src={starIcon} alt="" className={`w-14 h-14 ${cls}`} />
              if (remainder >= 0.5) return (
                <span key={i} className="relative inline-block" style={{ width: 14, height: 14 }}>
                  <img src={starIcon} alt="" className="w-14 h-14 absolute inset-0 filter-dark-30" />
                  <span className="absolute inset-0 overflow-hidden flex items-center" style={{ width: '50%' }}>
                    <img src={starIcon} alt="" className={`w-14 h-14 ${cls}`} />
                  </span>
                </span>
              )
              return <img key={i} src={starIcon} alt="" className="w-14 h-14 filter-dark-30" />
            })}
          </span>
        )
      })()}
      {tag && <span className="text-xs text-muted">{tag}</span>}
    </div>
  )
}
