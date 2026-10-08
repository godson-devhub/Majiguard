import { Link, Outlet } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { AppFooter } from '@/app/shell/app-footer'
import { AppHeader } from '@/app/shell/app-header'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Minimal frame for the public pages (landing, login, signup): the approved
 * institutional header, a routed content region and the shared footer. No
 * sidebar and no application navigation.
 */
export function PublicLayout() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-mg-body-sm focus:font-medium focus:text-foreground focus:shadow-mg-2"
        href="#main-content"
      >
        {t('app.skipToContent')}
      </a>
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm">
        <AppHeader />
        <nav aria-label={t('public.nav.label')} className="hidden border-b border-border bg-card md:block">
          <div className="mx-auto flex max-w-[var(--content-max-width)] items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6 text-mg-caption font-medium">
              <a href="#about" className="text-muted-foreground hover:text-foreground">{t('public.nav.about')}</a>
              <a href="#features" className="text-muted-foreground hover:text-foreground">{t('public.nav.features')}</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground">{t('public.nav.how')}</a>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-mg-caption font-medium text-muted-foreground hover:text-foreground">{t('public.nav.login')}</Link>
              <Link to="/signup" className={cn(buttonVariants({ size: 'sm' }))}>{t('public.nav.getStarted')}</Link>
            </div>
          </div>
        </nav>
      </div>
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  )
}
