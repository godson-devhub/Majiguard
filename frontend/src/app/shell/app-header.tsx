import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { routeTitleKey } from '@/app/shell/navigation-config'
import { InstitutionalHeader } from '@/components/brand/institutional-header'
import { LocaleSwitch } from '@/components/i18n/locale-switch'
import { ThemeToggle } from '@/components/theme/theme-toggle'

type AppHeaderProps = {
  /** mobile navigation trigger, rendered before the page context */
  leading?: ReactNode
}

/** Application header: identity band plus a blue bar with the current section and tools. */
export function AppHeader({ leading }: AppHeaderProps) {
  const { t } = useI18n()
  const { pathname } = useLocation()

  return (
    <InstitutionalHeader
      bar={
        <div className="flex h-14 items-center gap-x-3 px-4 lg:px-8">
          {leading === undefined ? null : <div className="md:hidden">{leading}</div>}
          <p className="min-w-0 truncate text-mg-body font-bold">{t(routeTitleKey(pathname))}</p>
          <div className="ms-auto flex shrink-0 items-center gap-x-2 sm:gap-x-3">
            <LocaleSwitch />
            <ThemeToggle />
          </div>
        </div>
      }
    />
  )
}
