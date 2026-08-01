import { useState } from 'react'
import { Worker } from '../../api'
import { useApp } from '../../context/AppContext'

interface WorkerImgProps {
  worker: Worker
  size?: number
  className?: string
  clickable?: boolean
}

export function WorkerImg({ worker, size, className, clickable = true }: WorkerImgProps) {
  const { img: imgUrl, navigateToEntity } = useApp()
  const [err, setErr] = useState(false)
  const picture = worker.contract?.picture || worker.picture
  const url = picture ? imgUrl('People/' + picture) : ''
  const handleClick = clickable ? (e: React.MouseEvent) => {
    e.stopPropagation()
    navigateToEntity('worker', worker.uid)
  } : undefined
  const cursorStyle: React.CSSProperties = clickable ? { cursor: 'pointer' } : {}

  if (!url || err) {
    const placeholderStyle: React.CSSProperties = className ? {} : { width: size, height: size, background: 'var(--bg-secondary)', borderRadius: 8, flexShrink: 0 }
    if (className) return null
    return <div style={placeholderStyle} />
  }

  if (className) {
    return <img className={className} src={url} alt="" draggable={false} style={cursorStyle} onClick={handleClick} onError={() => setErr(true)} />
  }
  return <img src={url} alt="" draggable={false} style={{
    width: size, height: size, objectFit: 'cover',
    borderRadius: 8, display: 'block', flexShrink: 0, ...cursorStyle,
  }} onClick={handleClick} onError={() => setErr(true)} />
}
