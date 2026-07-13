import { useState } from 'react'

const COND_SIZES = {
  male: [{ w: 151, h: 166 }, { w: 62, h: 372 }, { w: 62, h: 372 }, { w: 163, h: 256 }, { w: 207, h: 448 }],
  female: [{ w: 143, h: 171 }, { w: 65, h: 351 }, { w: 65, h: 351 }, { w: 165, h: 253 }, { w: 182, h: 507 }],
}

const BODY_SCALE = 36 / 165
const LABELS = ['Head', 'Arms', 'Arms', 'Body', 'Legs']

function condColor(v: number) {
  const h = v >= 70 ? 120 - 2 * (100 - v) : v >= 30 ? 60 * (v - 30) / 40 : 0
  return `hsl(${h}, 80%, ${v >= 30 ? 40 + 15 * (v / 100) : (40 + 15 * (v / 100)) * (v / 30)}%)`
}

export function ConditionBody({ physical, isFem, img }: {
  physical: any; isFem: boolean; img: { head: string; armLeft: string; armRight: string; body: string; legs: string }
}) {
  const [, setHovered] = useState<number | null>(null)
  const sizes = (isFem ? COND_SIZES.female : COND_SIZES.male).map(s => ({ w: Math.round(s.w * BODY_SCALE), h: Math.round(s.h * BODY_SCALE) }))
  const bodyCx = (110 - sizes[3].w) / 2
  const left = [(110 - sizes[0].w) / 2, bodyCx - sizes[1].w, bodyCx + sizes[3].w, bodyCx, (110 - sizes[4].w) / 2]
  const top = [0, sizes[0].h, sizes[0].h, sizes[0].h + 1, sizes[0].h + sizes[3].h + 1]
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
      <div className="relative mx-auto" style={{ width: 110, height: 185 }}>
        {LABELS.map((_, i) => (
          <div key={i} className="absolute" style={{ top: top[i], left: left[i] }} data-tooltip={`${LABELS[i]}: ${v(i)}/100`}
            onMouseEnter={() => handler(i, true)} onMouseLeave={() => handler(i, false)}>
            <div style={{ width: sizes[i].w, height: sizes[i].h, backgroundColor: condColor(v(i)), mask: `url(${images[i]}) center/contain no-repeat`, WebkitMask: `url(${images[i]}) center/contain no-repeat`, cursor: 'pointer', transition: 'background-color 0.15s' }} data-cp={i} />
          </div>
        ))}
      </div>
    </div>
  )
}
