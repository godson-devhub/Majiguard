import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

type DisclosureProps = {
  /** The control's visible label. */
  title: string
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

/**
 * Progressive disclosure for supporting material: methodology, data provenance,
 * map notes. The operational content of a screen comes first; explanations sit
 * in a collapsed, keyboard-operable panel behind it.
 */
export function Disclosure({ title, defaultOpen = false, className, children }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <section className={cn('overflow-hidden rounded-md border border-border bg-card', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => {
          setOpen((current) => !current)
        }}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start"
      >
        <span className="text-mg-title-sm font-semibold text-foreground">{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-muted-foreground mg-transition',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <div id={contentId} className="border-t border-border px-4 py-4">
          {children}
        </div>
      ) : null}
    </section>
  )
}
