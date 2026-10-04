import type { ComponentType } from 'react'
import { CircleAlert, CircleCheck, Info, ShieldCheck, Siren, TriangleAlert } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'
import { cn } from '@/lib/utils'

type IconComponent = ComponentType<{ className?: string }>

type ToneDefinition = {
  labelKey: MessageKey
  icon: IconComponent
  chip: string
  marker: string
}

const statusTones = {
  functional: {
    labelKey: 'status.functional',
    icon: CircleCheck,
    chip: 'bg-status-functional-soft text-status-functional-fg',
    marker: 'bg-status-functional',
  },
  nonfunctional: {
    labelKey: 'status.nonfunctional',
    icon: CircleAlert,
    chip: 'bg-status-nonfunctional-soft text-status-nonfunctional-fg',
    marker: 'bg-status-nonfunctional',
  },
  warning: {
    labelKey: 'status.warning',
    icon: TriangleAlert,
    chip: 'bg-status-warning-soft text-status-warning-fg',
    marker: 'bg-status-warning',
  },
  info: {
    labelKey: 'status.info',
    icon: Info,
    chip: 'bg-status-info-soft text-status-info-fg',
    marker: 'bg-status-info',
  },
} satisfies Record<string, ToneDefinition>

const riskTones = {
  low: {
    labelKey: 'risk.low',
    icon: ShieldCheck,
    chip: 'bg-risk-low-soft text-risk-low-fg',
    marker: 'bg-risk-low',
  },
  moderate: {
    labelKey: 'risk.moderate',
    icon: TriangleAlert,
    chip: 'bg-risk-moderate-soft text-risk-moderate-fg',
    marker: 'bg-risk-moderate',
  },
  elevated: {
    labelKey: 'risk.elevated',
    icon: CircleAlert,
    chip: 'bg-risk-elevated-soft text-risk-elevated-fg',
    marker: 'bg-risk-elevated',
  },
  high: {
    labelKey: 'risk.high',
    icon: Siren,
    chip: 'bg-risk-high-soft text-risk-high-fg',
    marker: 'bg-risk-high',
  },
} satisfies Record<string, ToneDefinition>

const impactTones = {
  low: {
    labelKey: 'impact.low',
    icon: ShieldCheck,
    chip: 'bg-impact-low-soft text-impact-low-fg',
    marker: 'bg-impact-low',
  },
  moderate: {
    labelKey: 'impact.moderate',
    icon: TriangleAlert,
    chip: 'bg-impact-moderate-soft text-impact-moderate-fg',
    marker: 'bg-impact-moderate',
  },
  high: {
    labelKey: 'impact.high',
    icon: CircleAlert,
    chip: 'bg-impact-high-soft text-impact-high-fg',
    marker: 'bg-impact-high',
  },
} satisfies Record<string, ToneDefinition>

export type SemanticChipProps = {
  kind: 'status'
  tone: keyof typeof statusTones
  className?: string
} | {
  kind: 'risk'
  tone: keyof typeof riskTones
  className?: string
} | {
  kind: 'impact'
  tone: keyof typeof impactTones
  className?: string
}

function resolveTone(props: SemanticChipProps): ToneDefinition {
  if (props.kind === 'status') {
    return statusTones[props.tone]
  }
  if (props.kind === 'risk') {
    return riskTones[props.tone]
  }
  return impactTones[props.tone]
}

/**
 * Status, risk and impact are always conveyed by three signals at once:
 * an icon, a text label and colour. Colour alone is never load-bearing.
 */
export function SemanticChip({ className, ...props }: SemanticChipProps) {
  const { t } = useI18n()
  const tone = resolveTone(props)
  const Icon = tone.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-mg-label font-medium',
        tone.chip,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {t(tone.labelKey)}
    </span>
  )
}

export function ToneMarker({ token }: { token: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3 shrink-0 rounded-xs border border-map-marker-stroke/40"
      style={{ backgroundColor: `var(${token})` }}
    />
  )
}
