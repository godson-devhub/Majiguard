import { Link, Outlet, useLocation } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { AppFooter } from '@/app/shell/app-footer'
import { InstitutionalHeader } from '@/components/brand/institutional-header'
import { LocaleSwitch } from '@/components/i18n/locale-switch'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Minimal frame for the public pages (landing, login, signup): the approved
 * institutional header, a routed content region and the shared footer. No
 * sidebar and no application navigation.
 */
export function PublicLayout() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const isBare = pathname === '/login' || pathname === '/signup'
  const isLanding = pathname === '/' || isBare

  return (
    <div className={cn('flex min-h-dvh flex-col bg-background text-foreground', isLanding && 'mg-landing', isBare && 'mg-dashboard')}>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-mg-body-sm focus:font-medium focus:text-foreground focus:shadow-mg-2"
        href="#main-content"
      >
        {t('app.skipToContent')}
      </a>
      {isBare ? null : <InstitutionalHeader
        bar={
          <div className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6 lg:px-8">
            <nav aria-label={t('public.nav.label')} className="hidden items-center gap-6 text-mg-body font-bold md:flex">
              <a href="/#about" className="underline-offset-4 hover:underline">{t('public.nav.about')}</a>
              <a href="/#features" className="underline-offset-4 hover:underline">{t('public.nav.features')}</a>
              <a href="/#how-it-works" className="underline-offset-4 hover:underline">{t('public.nav.how')}</a>
            </nav>
            <div className="ms-auto flex items-center gap-2 sm:gap-3">
              <LocaleSwitch />
              <ThemeToggle />
              <Link to="/login" className="px-2 text-mg-body font-bold underline-offset-4 hover:underline">{t('public.nav.login')}</Link>
              <Link to="/signup" className={cn(buttonVariants({ size: 'sm' }), 'bg-white font-bold text-ocean hover:bg-white/90')}>{t('public.nav.getStarted')}</Link>
            </div>
          </div>
        }
      />}
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      {isBare ? null : <AppFooter guest />}
    </div>
  )
}
