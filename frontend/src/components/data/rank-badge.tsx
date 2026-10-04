import { cn } from '@/lib/utils'

type RankBadgeProps = {
  /** The backend's own rank, verbatim - never recomputed or re-ranked here. */
  rank: number
  className?: string
}

/**
 * A compact, consistent rank indicator - a filled circle, not raw "#1" text.
 * Structural/neutral in tone deliberately: a rank position is not itself a
 * risk or impact signal, so it never borrows the semantic risk/impact tints.
 */
export function RankBadge({ rank, className }: RankBadgeProps) {
  return (
    <span
      className={cn(
        'mg-figure inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-mg-caption font-semibold text-sidebar-accent-foreground',
        className,
      )}
    >
      {rank}
    </span>
  )
}
