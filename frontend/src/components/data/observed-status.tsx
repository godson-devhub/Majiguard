import type { ComponentType } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { observedStatusLabel } from '@/lib/status-labels'
import { statusTone, type StatusTone } from '@/lib/status-tone'

type IconComponent = ComponentType<{ className?: string }>

const TONE_CHIP: Record<StatusTone, { icon: IconComponent; className: string }> = {
  functional: {
    icon: CircleCheck,
    className: 'bg-status-functional-soft text-status-functional-fg',
  },
  nonfunctional: {
    icon: CircleAlert,
    className: 'bg-status-nonfunctional-soft text-status-nonfunctional-fg',
  },
  warning: {
    icon: TriangleAlert,
    className: 'bg-status-warning-soft text-status-warning-fg',
  },
  info: {
    icon: Info,
    className: 'bg-status-info-soft text-status-info-fg',
  },
}

/**
 * The recorded `observed_status`, shown verbatim — the raw survey text is the
 * data, and it is never normalised or renamed.
 *
 * For the seven known register values the chip adds the operational tone:
 * icon plus colour plus the text label, so the condition reads at a glance and
 * colour is never the only signal. Unknown free text and unrecorded values
 * stay deliberately neutral.
 */
export function ObservedStatusChip({ value }: { value: string | null }) {
  const { t } = useI18n()
  const tone = statusTone(value)

  if (value === null || value.length === 0) {
    return (
      <span className="inline-flex items-center rounded-sm border border-dashed border-border-strong px-2 py-0.5 text-mg-caption text-muted-foreground">
        {t('data.notRecorded')}
      </span>
    )
  }

  if (tone !== null) {
    const { icon: Icon, className } = TONE_CHIP[tone]
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-mg-caption font-medium ${className}`}
      >
        <Icon aria-hidden="true" className="size-3 shrink-0" />
        {observedStatusLabel(value, t)}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-sm border border-border bg-muted px-2 py-0.5 text-mg-caption text-foreground">
      {observedStatusLabel(value, t)}
    </span>
  )
}
