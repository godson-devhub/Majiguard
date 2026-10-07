import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * The one native-select class used by every filter in the application, so
 * Region, District, Ward, Condition, Risk, Impact and Pathway controls look and
 * size identically. Height comes from the global `select` floor (40px, 44px on
 * touch). Native selects are deliberate: keyboard operable, screen-reader
 * labelled and native on mobile.
 */
export const FILTER_SELECT_CLASS =
  'h-10 w-full min-w-0 rounded-control border border-input bg-background px-2.5 text-mg-body-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50'

export type FilterOption = { value: string; label: string; disabled?: boolean }

type FilterSelectProps = {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly FilterOption[]
  disabled?: boolean
  /** extra classes for the field wrapper, e.g. a min width */
  className?: string
}

/** A labelled native select with the shared filter styling. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className,
}: FilterSelectProps) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Label
        htmlFor={id}
        className={cn(
          'text-mg-caption font-medium text-muted-foreground',
          disabled && 'opacity-60',
        )}
      >
        {label}
      </Label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className={FILTER_SELECT_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

type FilterChipProps = {
  /** the visible chip text, e.g. "Region: Dodoma" */
  label: string
  /** accessible name of the remove control, e.g. "Remove filter: Region: Dodoma" */
  removeLabel: string
  onRemove: () => void
}

/** One active filter, removable with a single press. */
export function FilterChip({ label, removeLabel, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-muted ps-3 pe-1 text-mg-caption font-medium text-foreground pointer-coarse:min-h-11">
      <span className="min-w-0 truncate">{label}</span>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground pointer-coarse:size-9"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  )
}

/** A wrapping row of active filter chips, announced politely when it changes. */
export function FilterChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} aria-live="polite" className="flex flex-wrap items-center gap-2">
      {children}
    </div>
  )
}
