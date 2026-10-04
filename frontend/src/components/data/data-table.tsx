import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type DataColumn = {
  label: string
  /** Utility classes for the header cell, e.g. progressive hiding on small screens. */
  className?: string
}

type DataTableProps = {
  caption: string
  columns: DataColumn[]
  children: ReactNode
}

/**
 * Real records, in a real table. The caption names the data set, every column
 * header is associated with its cells, and a narrow viewport either drops the
 * secondary columns (per column config) or scrolls the table horizontally. The
 * scroll container is focusable and labelled so it can be scrolled with the
 * keyboard alone.
 */
export function DataTable({ caption, columns, children }: DataTableProps) {
  return (
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="overflow-x-auto rounded-md border border-border bg-card"
    >
      <table className="w-full min-w-[24rem] border-collapse text-start">
        <caption className="border-b border-border px-4 py-3 text-start text-mg-title-sm font-semibold text-foreground">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn(
                  'px-4 py-2.5 text-start text-mg-label font-semibold text-muted-foreground',
                  column.className,
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

type DataRowProps = {
  children: ReactNode
  /** The row the user has selected, signalled by a neutral surface, not colour alone. */
  selected?: boolean
  /** Semantic row accent (e.g. a risk/impact tint) - additive to the base
   * hover/selected treatment, never a replacement for the icon+label signal
   * elsewhere in the row. */
  className?: string
}

export function DataRow({ children, selected = false, className }: DataRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-border/60 transition-colors last:border-b-0 hover:bg-accent/40',
        selected && 'bg-accent/60',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function DataCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <td className={cn('px-4 py-2.5 text-mg-body-sm text-foreground', className)}>{children}</td>
}
