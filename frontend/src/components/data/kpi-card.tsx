import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type KpiTone = 'brand' | 'functional' | 'nonfunctional' | 'warning' | 'info'

/**
 * Only the icon carries the tone; the tile itself stays a calm neutral
 * surface. A tone marks a real condition (functional, non-functional, risk,
 * impact), so it is the one place colour appears on the card - and the label
 * always says the same thing in words, so colour is never the only signal.
 */
const TONE_ICON: Record<KpiTone, string> = {
  brand: 'text-muted-foreground',
  functional: 'text-status-functional',
  nonfunctional: 'text-status-nonfunctional',
  warning: 'text-status-warning',
  info: 'text-status-info',
}

type KpiCardProps = {
  label: string
  icon: LucideIcon
  /** The headline figure, already formatted from a real API value. */
  value: string
  /**
   * `loading` shows an in-place skeleton at the figure's size (no layout
   * shift, no placeholder text); `error` states that the figure is
   * unavailable. Both leave the label and hint readable.
   */
  state?: 'ready' | 'loading' | 'error'
  hint?: string
  tone?: KpiTone
  /** Rendered under the figure, e.g. a status availability chip. */
  footer?: ReactNode
  className?: string
}

/**
 * One headline figure: a flat bordered surface, a strong tabular number, a
 * concise label and a one-line hint that names the source or meaning. These
 * cards are not interactive, so they have no hover treatment.
 */
export function KpiCard({
  label,
  icon: Icon,
  value,
  state = 'ready',
  hint,
  tone = 'brand',
  footer,
  className,
}: KpiCardProps) {
  const { t } = useI18n()

  return (
    <div
      className={cn(
        'flex flex-col justify-between gap-3 border-s border-primary/70 bg-card px-5 py-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-mg-label font-medium text-muted-foreground">{label}</p>
        <Icon aria-hidden="true" className={cn('size-4 shrink-0', TONE_ICON[tone])} />
      </div>

      <div>
        {state === 'loading' ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">{t('state.loadingSection')}</span>
            <Skeleton aria-hidden="true" className="h-9 w-28" />
          </div>
        ) : state === 'error' ? (
          <p className="text-mg-title-sm font-semibold text-muted-foreground">
            {t('state.unavailable')}
          </p>
        ) : (
          <p className="mg-figure text-mg-display font-semibold text-foreground">{value}</p>
        )}
        {hint === undefined ? null : (
          <p className="mt-1 text-mg-caption text-muted-foreground">{hint}</p>
        )}
      </div>

      {footer}
    </div>
  )
}
