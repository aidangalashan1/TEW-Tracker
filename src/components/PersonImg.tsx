import { useState } from 'react'
import { useApp } from '../context/AppContext'

interface PersonImgProps {
  picture: string
  size: number
  onClick?: () => void
  /** Image subfolder (People/Logos/Belts/...). Defaults to People. */
  folder?: string
  /** 'cover' for portraits/logos that should fill the frame, 'contain' to
   *  avoid cropping non-square art (belts, some logos). Defaults to cover. */
  fit?: 'cover' | 'contain'
}

/** Portrait/logo with rounded-fallback, for entities that aren't a full Worker
 *  record (wage earners, form opponents, standing peers — just {picture, name}
 *  from a derived API response). Mirrors WorkerImg's visual style. */
export function PersonImg({ picture, size, onClick, folder = 'People', fit = 'cover' }: PersonImgProps) {
  const { img } = useApp()
  const [err, setErr] = useState(false)
  const url = picture ? img(`${folder}/${picture}`) : ''
  const cursorStyle: React.CSSProperties = onClick ? { cursor: 'pointer' } : {}

  if (!url || err) {
    return <div className="flex-shrink-0" style={{ width: size, height: size, background: 'var(--bg-secondary)', borderRadius: 8, ...cursorStyle }} onClick={onClick} />
  }
  return (
    <img src={url} alt="" draggable={false} onClick={onClick} onError={() => setErr(true)}
      className="flex-shrink-0" style={{ width: size, height: size, objectFit: fit, borderRadius: 8, display: 'block', ...cursorStyle }} />
  )
}
