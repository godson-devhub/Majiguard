import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type KpiTone = 'brand' | 'functional' | 'nonfunctional' | 'warning' | 'info'

const TONE_TILE: Record<KpiTone, string> = {
  brand: 'border border-border bg-accent text-accent-foreground',
  functional: 'bg-status-functional-soft text-status-functional-fg',
  nonfunctional: 'bg-status-nonfunctional-soft text-status-nonfunctional-fg',
  warning: 'bg-status-warning-soft text-status-warning-fg',
  info: 'bg-status-info-soft text-status-info-fg',
}

/**
 * Card-level accent: the same semantic tone as the icon tile, carried onto
 * the card's own edge and a faint wash, so every one of the six cards
 * shares one structure and only the accent colour varies - a Functional or
 * Non-Functional card never reads as a lesser version of the others.
 * Hover deepens the wash slightly; it is a visual-only affordance (these
 * cards are not interactive, so no focus ring is added - that would be a
 * false keyboard affordance for something that does nothing on activation).
 */
const TONE_CARD: Record<KpiTone, string> = {
  brand: 'border-s-[3px] border-border-strong',
  functional: 'border-s-[3px] border-status-functional bg-status-functional-soft/25 hover:bg-status-functional-soft/45',
  nonfunctional: 'border-s-[3px] border-status-nonfunctional bg-status-nonfunctional-soft/25 hover:bg-status-nonfunctional-soft/45',
  warning: 'border-s-[3px] border-status-warning bg-status-warning-soft/25 hover:bg-status-warning-soft/45',
  info: 'border-s-[3px] border-status-info bg-status-info-soft/25 hover:bg-status-info-soft/45',
}

type KpiCardProps = {
  label: string
  icon: LucideIcon
  /** The headline figure, already formatted from a real API value. */
  value: string
  hint?: string
  /**
   * Presentation tone of the icon tile. `brand` (default) is the neutral
   * structural tile; the status tones mark a real condition, so a green tile
   * and a red tile read as estate state, not decoration.
   */
  tone?: KpiTone
  /** Rendered under the figure, e.g. a status availability chip. */
  footer?: ReactNode
  className?: string
}

/**
 * One headline figure. Deliberately not a floating "stat card": a flat surface,
 * a single number, and a caption that names its source, so a reader can tell
 * what the number is without hunting for it.
 */
export function KpiCard({
  label,
  icon: Icon,
  value,
  hint,
  tone = 'brand',
  footer,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-3 rounded-md border border-border bg-card px-4 py-4 shadow-mg-1 transition-all duration-150 hover:shadow-mg-2',
        TONE_CARD[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-mg-label font-medium text-muted-foreground">{label}</p>
        <span
          aria-hidden="true"
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-sm',
            TONE_TILE[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <div>
        <p className="mg-figure text-mg-display font-semibold text-foreground">{value}</p>
        {hint === undefined ? null : (
          <p className="mt-1 text-mg-caption text-muted-foreground">{hint}</p>
        )}
      </div>

      {footer}
    </div>
  )
}
