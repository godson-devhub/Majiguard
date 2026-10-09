import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type StateTone = 'neutral' | 'info' | 'warning' | 'danger'

const toneClasses: Record<StateTone, string> = {
  neutral: 'border-border text-muted-foreground',
  info: 'border-border text-info',
  warning: 'border-border text-warning',
  danger: 'border-destructive/40 text-destructive',
}

type StatePanelProps = {
  tone?: StateTone
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
  role?: 'status' | 'alert'
  ariaLive?: 'polite' | 'assertive'
  className?: string
}

/**
 * One restrained container for every data state — loading, failure, empty,
 * unavailable, not-stored and stored — so the interface never invents a
 * different visual language per state.
 */
export function StatePanel({
  tone = 'neutral',
  icon: Icon,
  title,
  description,
  children,
  role = 'status',
  ariaLive = 'polite',
  className,
}: StatePanelProps) {
  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={cn('mg-glass mg-glass-static border p-5 sm:p-6', toneClasses[tone], className)}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm border border-border-strong"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-mg-title-sm font-semibold text-foreground">{title}</h2>
          {description === undefined ? null : (
            <p className="mt-1 max-w-[70ch] text-mg-body-sm text-muted-foreground">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
