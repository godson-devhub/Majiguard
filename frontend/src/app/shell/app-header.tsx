import type { ReactNode } from 'react'

import { InstitutionalHeader } from '@/components/brand/institutional-header'
import { LocaleSwitch } from '@/components/i18n/locale-switch'
import { ThemeToggle } from '@/components/theme/theme-toggle'

type AppHeaderProps = {
  /** mobile navigation trigger, rendered before the identity block */
  leading?: ReactNode
}

export function AppHeader({ leading }: AppHeaderProps) {
  return (
    <InstitutionalHeader
      leading={leading}
      actions={
        <div className="flex items-center gap-x-2 sm:gap-x-3">
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      }
    />
  )
}
