import starIcon from '../assets/UI icons/star.png'

export function Stars({ filled, total = 5, size = 18 }: { filled: number; total?: number; size?: number }) {
  const cls = `w-${size} h-${size}`
  return (
    <span className="inline-flex items-center gap-1px">
      {Array.from({ length: total }, (_, i) => {
        const remainder = filled - i
        if (remainder >= 1) {
          return <img key={i} src={starIcon} alt="" className={`${cls} filter-star-gold`} />
        }
        if (remainder >= 0.5) {
          return (
            <span key={i} className={`relative inline-block ${cls}`}>
              <img src={starIcon} alt="" className={`${cls} absolute inset-0 filter-dark-30`} />
              <span className="absolute inset-0 overflow-hidden flex items-center" style={{ width: '50%' }}>
                <img src={starIcon} alt="" className={`${cls} filter-star-gold`} />
              </span>
            </span>
          )
        }
        return <img key={i} src={starIcon} alt="" className={`${cls} filter-dark-30`} />
      })}
    </span>
  )
}
