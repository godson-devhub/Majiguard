import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { brandAssets } from '@/components/brand/brand-assets'
import { IdentitySlot } from '@/components/brand/identity-slot'
import { cn } from '@/lib/utils'

type InstitutionalHeaderProps = {
  /** content of the solid blue bar under the identity band (links, tools) */
  bar: ReactNode
  className?: string
}

/**
 * Two-part header in the e-Government Authority style: a white identity band
 * (Coat of Arms on the left, product name and official name centred, e-GA mark
 * on the right) above a solid ocean-blue bar that holds the navigation and the
 * tools. Only the blue bar sticks while scrolling.
 */
export function InstitutionalHeader({ bar, className }: InstitutionalHeaderProps) {
  const { t } = useI18n()

  return (
    <>
      <header className="mg-header-band bg-white text-[#12303d]">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <IdentitySlot asset={brandAssets['coat-of-arms']} />
          <Link to="/" className="min-w-0 text-center">
            <p className="truncate text-xl font-extrabold tracking-tight text-ocean sm:text-3xl">
              {t('app.brand.name')}
            </p>
            <p className="hidden truncate text-mg-body-sm text-[#4a5765] sm:block">
              {t('app.brand.officialName')}
            </p>
          </Link>
          <IdentitySlot asset={brandAssets['e-ga']} className="max-w-[7rem] sm:max-w-none" />
        </div>
      </header>
      <div className={cn('sticky top-0 z-40 bg-ocean text-white shadow-mg-2', className)}>{bar}</div>
    </>
  )
}
