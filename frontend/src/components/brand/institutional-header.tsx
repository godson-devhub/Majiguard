import type { ReactNode } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import { brandAssets } from '@/components/brand/brand-assets'
import { IdentitySlot } from '@/components/brand/identity-slot'
import { NetworkMotif } from '@/components/brand/network-motif'
import { ProductIdentity } from '@/components/brand/product-identity'
import { cn } from '@/lib/utils'

type InstitutionalHeaderProps = {
  /** controls rendered before the identity block (navigation trigger) */
  leading?: ReactNode
  /** tools rendered on the right (theme switch, language switch, …) */
  actions?: ReactNode
  className?: string
}

/**
 * Brand layer of the header: government identity slots on the outer edges,
 * MajiGuard product identity in the middle, restrained motif behind.
 * Composed by the application shell (`src/app/shell/app-header.tsx`).
 */
export function InstitutionalHeader({
  leading,
  actions,
  className,
}: InstitutionalHeaderProps) {
  const { t } = useI18n()

  return (
    <header
      className={cn(
        'mg-header-surface relative isolate overflow-hidden border-b border-header-border bg-header text-header-foreground',
        className,
      )}
    >
      <NetworkMotif className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-header-foreground opacity-[0.06]" />

      {/*
        Left-to-right identity order, strictly: Coat of Arms, a clear divider,
        then MajiGuard's own identity - never the flag slot here (it stays
        defined in brand-assets.ts for later reuse, just not rendered beside
        the Coat of Arms, so the two-element hierarchy reads unambiguously).
      */}
      <div className="mx-auto flex h-[var(--header-height)] w-full max-w-[var(--content-max-width)] items-center gap-x-5 px-4 sm:px-6 lg:px-8">
        {leading === undefined ? null : <div className="md:hidden">{leading}</div>}

        <div className="flex min-w-0 items-center gap-3">
          <IdentitySlot asset={brandAssets['coat-of-arms']} />
          <span aria-hidden="true" className="h-8 w-px shrink-0 bg-header-foreground/25" />
          <ProductIdentity />
        </div>

        {/* Right-to-left order, strictly: Theme, then Language, then e-GA
            last - e-GA is always the final, far-right element. */}
        <div className="ms-auto flex items-center gap-x-4">
          <p className="hidden max-w-[22ch] truncate text-end text-mg-caption leading-tight text-muted-foreground xl:block">
            {t('app.system.context')}
          </p>
          {actions}
          <IdentitySlot asset={brandAssets['e-ga']} className="hidden lg:flex" />
        </div>
      </div>

      {/*
        A thin, restrained boundary detail inspired by the Tanzania flag's
        colour family (green / gold / black / blue) - hard colour stops, not
        a smooth blend, so it reads as a deliberate institutional band rather
        than a gradient effect. 2px tall; never a banner.
      */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[2px]"
        style={{
          background:
            'linear-gradient(to right, var(--mg-green-600) 0% 22%, var(--mg-amber-400) 22% 33%, var(--mg-n-900) 33% 67%, var(--mg-amber-400) 67% 78%, var(--mg-shell-blue) 78% 100%)',
        }}
      />
    </header>
  )
}
