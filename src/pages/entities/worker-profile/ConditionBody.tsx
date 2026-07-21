import { useState } from 'react'

const COND_SIZES = {
  male: [{ w: 151, h: 166 }, { w: 62, h: 372 }, { w: 62, h: 372 }, { w: 163, h: 256 }, { w: 207, h: 448 }],
  female: [{ w: 143, h: 171 }, { w: 65, h: 351 }, { w: 65, h: 351 }, { w: 165, h: 253 }, { w: 182, h: 507 }],
}

// Target height for the assembled figure — head + body + legs stacked (arms
// run alongside the torso/hip rather than adding to the column, so they're
// excluded from the sum). Each gender gets its own scale derived from this
// target so both render at a consistent overall size despite the two source
// art sets having different raw proportions — the old shared BODY_SCALE made
// the assembled figure taller than its container, forcing every part to
// compress/overlap into the visible area.
const TARGET_HEIGHT = 168
const LABELS = ['Head', 'Arms', 'Arms', 'Body', 'Legs']

function condColor(v: number) {
  const h = v >= 70 ? 120 - 2 * (100 - v) : v >= 30 ? 60 * (v - 30) / 40 : 0
  return `hsl(${h}, 80%, ${v >= 30 ? 40 + 15 * (v / 100) : (40 + 15 * (v / 100)) * (v / 30)}%)`
}

export function ConditionBody({ physical, isFem, img }: {
  physical: any; isFem: boolean; img: { head: string; armLeft: string; armRight: string; body: string; legs: string }
}) {
  const [, setHovered] = useState<number | null>(null)
  const raw = isFem ? COND_SIZES.female : COND_SIZES.male
  const scale = TARGET_HEIGHT / (raw[0].h + raw[3].h + raw[4].h)
  const sizes = raw.map(s => ({ w: Math.round(s.w * scale), h: Math.round(s.h * scale) }))

  const cx = 55
  const zIndex = [2, 1, 1, 0, 0]

  // Measured against the source art: the head's bottom edge, the arms' top
  // edge, and the body's top edge all sit at the shoulder line; the legs'
  // top edge sits at the body's hip line (its widest point, at the very
  // bottom of the body crop). Overlaps are a few px of blend to avoid
  // hairline gaps between adjacent, differently-colored parts.
  const topMargin = 2
  const headBodyOverlap = 2
  const legsBodyOverlap = 4
  const armOverlap = 1

  const headTop = topMargin
  const bodyTop = headTop + sizes[0].h - headBodyOverlap
  const armTop = bodyTop
  const legsTop = bodyTop + sizes[3].h - legsBodyOverlap

  const bLeft = Math.round(cx - sizes[3].w / 2)
  const left = [Math.round(cx - sizes[0].w / 2), bLeft - sizes[1].w + armOverlap, bLeft + sizes[3].w - armOverlap, bLeft, Math.round(cx - sizes[4].w / 2)]
  const top = [headTop, armTop, armTop, bodyTop, legsTop]
  const containerHeight = legsTop + sizes[4].h + topMargin
  const v = (idx: number) => {
    const condMap = ['condition1', 'condition2', 'condition2', 'condition3', 'condition4']
    const key = condMap[idx]
    const val = physical?.[key] ?? 100
    return typeof val === 'number' ? val : 100
  }

  const handler = (idx: number, enter: boolean) => {
    setHovered(enter ? idx : null)
    const targets = idx === 1 || idx === 2 ? [1, 2] : [idx]
    targets.forEach(i => {
      document.querySelectorAll(`[data-cp="${i}"]`).forEach((el: Element) => {
        ;(el as HTMLElement).style.filter = enter ? 'brightness(0.7)' : ''
      })
    })
  }

  const images = [img.head, img.armRight, img.armLeft, img.body, img.legs]

  return (
    <div className="mt-3 pt-2 border-default-top">
      <div className="section-label text-center mb-1">Condition</div>
      <div className="relative mx-auto" style={{ width: 110, height: containerHeight }}>
        {LABELS.map((_, i) => (
          <div key={i} style={{ position: 'absolute', top: top[i], left: left[i], zIndex: zIndex[i] }} data-tooltip={`${LABELS[i]}: ${v(i)}/100`}
            onMouseEnter={() => handler(i, true)} onMouseLeave={() => handler(i, false)}>
            <div style={{ width: sizes[i].w, height: sizes[i].h, backgroundColor: condColor(v(i)), mask: `url(${images[i]}) center/contain no-repeat`, WebkitMask: `url(${images[i]}) center/contain no-repeat`, cursor: 'pointer', transition: 'background-color 0.15s' }} data-cp={i} />
          </div>
        ))}
      </div>
    </div>
  )
}
