import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
}) {
  const headingId = `${id}-heading`

  return (
    <section aria-labelledby={headingId} className="border-t border-border pt-8">
      <h2 id={headingId} className="text-mg-title-md font-semibold text-foreground">
        {title}
      </h2>
      {description === undefined ? null : (
        <p className="mt-2 max-w-[68ch] text-mg-body-sm text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export function SpecimenTable({
  caption,
  headers,
  children,
}: {
  caption: string
  headers: string[]
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left text-mg-body-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="py-2 pe-4 text-mg-label font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Swatch({ token, size = 'md' }: { token: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block shrink-0 border border-border',
        size === 'sm' ? 'size-6 rounded-xs' : 'size-8 rounded-sm',
      )}
      style={{ backgroundColor: `var(${token})` }}
    />
  )
}

export function TokenCell({ token, label }: { token: string; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2 pe-4">
      <Swatch token={token} />
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{label}</span>
        <code className="text-mg-caption text-muted-foreground">{token}</code>
      </div>
    </div>
  )
}
