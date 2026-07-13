// Shared building blocks for the finance-* modules. This folder is a library,
// not a registered module — each finance-* module imports from here to avoid
// duplicating the KPI tile, legend, empty state, and the generic proportional
// bar mark across five separate components.

import type { ReactNode } from 'react'

export type Tone = 'income' | 'expense' | 'net-pos' | 'net-neg' | 'neutral'

export function toneClass(tone: Tone): string {
  if (tone === 'income' || tone === 'net-pos') return 'text-green'
  if (tone === 'expense' || tone === 'net-neg') return 'text-red'
  return 'text-primary'
}

// ---------------------------------------------------------------------------
// Icon language — a small hand-drawn set (no matching assets exist yet in
// src/assets/UI icons/). All stroke="currentColor" so color comes purely
// from the wrapping element's CSS (.fin-card-icon), never an inline value.
// ---------------------------------------------------------------------------

type IconProps = { size?: number; className?: string }

export function IconCoin({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="10" cy="6" rx="6" ry="2.6" />
      <path d="M4 6v4c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V6" />
      <path d="M4 10v4c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-4" />
    </svg>
  )
}

export function IconTrend({ up, size = 16, className }: IconProps & { up: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {up ? (
        <>
          <path d="M3 14l5-5 3 3 6-7" />
          <path d="M12 5h5v5" />
        </>
      ) : (
        <>
          <path d="M3 6l5 5 3-3 6 7" />
          <path d="M12 15h5v-5" />
        </>
      )}
    </svg>
  )
}

export function IconTag({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11 3h5a1 1 0 0 1 1 1v5a1 1 0 0 1-.3.7l-8 8a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4l8-8a1 1 0 0 1 .7-.3Z" />
      <circle cx="14.3" cy="5.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconShield({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2.5l6.5 2.4v5c0 4.4-2.8 7-6.5 8.6-3.7-1.6-6.5-4.2-6.5-8.6v-5L10 2.5Z" />
      <path d="M7.2 10.2l2 2 3.6-4.1" />
    </svg>
  )
}

export function IconWallet({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2.5" y="5.5" width="15" height="11" rx="2" />
      <path d="M2.5 8.5h15" />
      <circle cx="14" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Colored icon + bold label, the purple "section heading" mark used across
 *  every finance card and section (see .fin-card-label / .fin-card-icon). */
export function CardLabel({ icon, children, small = false }: { icon?: ReactNode; children: ReactNode; small?: boolean }) {
  return <div className={`fin-card-label${small ? ' fin-card-label-sm' : ''}`}>{icon}{children}</div>
}

export function StatTile({ label, value, subtitle, tone = 'neutral' }: { label: string; value: string; subtitle?: string; tone?: Tone }) {
  return (
    <div className="flex-1 min-w-150 bg-card rounded border-default p-3 flex flex-col gap-1">
      <div className="section-label">{label}</div>
      <div className={`text-2xl text-bold text-mono ${toneClass(tone)}`}>{value}</div>
      {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
    </div>
  )
}

export interface StatCardDetail { label: string; value: string; tone?: Tone }

/** The FM-style stat panel: icon + purple label, big number, subtitle, an
 *  optional gradient proportion bar, and optional divider + detail rows.
 *  Reserved for medium/large tiers — card/small stay on the denser StatTile. */
export function StatCard({
  icon, label, value, valueTone = 'neutral', subtitle, proportion, details,
}: {
  icon?: ReactNode
  label: string
  value: string
  valueTone?: Tone
  subtitle?: string
  proportion?: { pct: number; variant: 'income' | 'expense' | 'wage' | 'over'; tip: string }
  details?: StatCardDetail[]
}) {
  return (
    <div className="flex-1 min-w-150 bg-card rounded border-default p-3 flex flex-col gap-2">
      <CardLabel icon={icon}>{label}</CardLabel>
      <div className={`text-2xl text-bold text-mono ${toneClass(valueTone)}`}>{value}</div>
      {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
      {proportion && <ProportionBar pct={proportion.pct} variant={proportion.variant} tip={proportion.tip} />}
      {details && details.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 border-default-top">
          {details.map(d => (
            <div key={d.label} className="justify-between text-xs">
              <span className="text-secondary">{d.label}</span>
              <span className={`text-mono ${toneClass(d.tone ?? 'neutral')}`}>{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Gradient-filled proportion bar (e.g. wage spend as % of income), distinct
 *  from the flat single-color `Bar` used for per-line-item comparisons. */
export function ProportionBar({ pct, variant, tip, size = 'sm' }: { pct: number; variant: 'income' | 'expense' | 'wage' | 'over'; tip: string; size?: 'sm' | 'lg' }) {
  return (
    <div className={`fin-proportion-track flex-1 ${size === 'lg' ? 'h-14' : 'h-6'}`} data-tooltip={tip}>
      <div className={`fin-proportion-fill fin-proportion-fill-${variant}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

/** Compact inline trend line for tight card spaces — a data-driven stroke
 *  color (tone), same convention as ratingColor's inline style elsewhere. */
export function MiniSparkline({ values, tone = 'neutral', width = 60, height = 20 }: { values: number[]; tone?: Tone; width?: number; height?: number }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const points = values.map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / span) * height).toFixed(1)}`).join(' ')
  const stroke = tone === 'income' || tone === 'net-pos' ? 'var(--accent-green)' : tone === 'expense' || tone === 'net-neg' ? 'var(--accent)' : 'var(--accent-blue)'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Legend() {
  return (
    <div className="items-center gap-4 text-xs text-muted">
      <span className="items-center gap-1"><span className="fin-legend-swatch fin-legend-income" />Income</span>
      <span className="items-center gap-1"><span className="fin-legend-swatch fin-legend-expense" />Spending</span>
    </div>
  )
}

export function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex-center flex-col gap-1 py-6 text-center border-default rounded bg-card">
      <div className="text-sm text-secondary">No financial history yet</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

/** A proportional fill bar, in the same plain-HTML-div style used elsewhere in
 *  the app (e.g. BeltChip's prestige bar) — not SVG, so it gets the app's
 *  standard `data-tooltip` hover for free instead of a native browser tooltip. */
export function Bar({ pct, variant, tip }: { pct: number; variant: 'income' | 'expense' | 'wage'; tip: string }) {
  const fillClass = variant === 'income' ? 'bg-green' : variant === 'expense' ? 'bg-red' : 'bg-blue-400'
  return (
    <div className="flex-1 h-14 rounded-xs bg-darker overflow-hidden" data-tooltip={tip}>
      <div className={`h-full rounded-xs ${fillClass}`} style={{ width: `${Math.max(0, pct)}%` }} />
    </div>
  )
}
