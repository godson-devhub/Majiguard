import type { ReactNode } from 'react'

import { brandAssets } from '@/components/brand/brand-assets'
import { IdentitySlot } from '@/components/brand/identity-slot'
import { ProductIdentity } from '@/components/brand/product-identity'
import { cn } from '@/lib/utils'

type InstitutionalHeaderProps = {
  /** controls rendered before the identity block (navigation trigger) */
  leading?: ReactNode
  /** tools rendered on the right (language switch, theme switch, ...) */
  actions?: ReactNode
  className?: string
}

/**
 * Brand layer of the header: a calm institutional bar on the application card
 * surface (white in light mode, the dark card surface in dark mode), with the
 * Tanzania flag-colour strip as its bottom edge.
 *
 * Left to right, strictly: navigation trigger (below `md`), Coat of Arms, a
 * divider, then MajiGuard's own identity. Right to left, strictly: e-GA last
 * and far right, preceded by the tools. Composed by the application shell
 * (`src/app/shell/app-header.tsx`).
 */
export function InstitutionalHeader({
  leading,
  actions,
  className,
}: InstitutionalHeaderProps) {
  return (
    <header
      className={cn(
        'relative h-[var(--header-height)] border-b border-border bg-card text-foreground',
        className,
      )}
    >
      {/* Content row: the bottom 6px of the header belong to the flag strip. */}
      <div className="mx-auto flex h-full w-full max-w-[var(--content-max-width)] items-center gap-x-3 px-4 pb-1.5 sm:gap-x-4 sm:px-6 lg:px-8">
        {leading === undefined ? null : <div className="md:hidden">{leading}</div>}

        <div className="flex min-w-0 items-center gap-3">
          <IdentitySlot asset={brandAssets['coat-of-arms']} />
          <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-border-strong/40 sm:block" />
          <ProductIdentity />
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-x-2 sm:gap-x-3">
          {actions}
          <span aria-hidden="true" className="hidden h-8 w-px shrink-0 bg-border-strong/40 lg:block" />
          <IdentitySlot asset={brandAssets['e-ga']} className="hidden lg:block" />
        </div>
      </div>

      {/*
        Tanzania flag-colour strip: hard colour stops (green, gold, black,
        gold, blue), not a gradient blend, 6px tall and flush with the bottom
        edge. Decorative, so hidden from assistive technology. It is a CSS
        stripe, not a flag image: no approved flag asset exists.
      */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1"
        style={{
          background:
            'linear-gradient(to right, var(--mg-green-600) 0% 22%, var(--mg-amber-400) 22% 33%, var(--flag-black) 33% 67%, var(--mg-amber-400) 67% 78%, var(--mg-shell-blue) 78% 100%)',
        }}
      />
    </header>
  )
}
