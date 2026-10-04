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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ThemeToggle />
          <LocaleSwitch />
        </div>
      }
    />
  )
}
