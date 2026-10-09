import { useEffect, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { LandingImage } from '@/components/landing/landing-image'
import { Link } from 'react-router'

import { DashboardControls } from '@/app/shell/dashboard-controls'
import { cn } from '@/lib/utils'
import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

type AuthLayoutProps = {
  titleKey: MessageKey
  descriptionKey: MessageKey
  children: ReactNode
  /** switch-page prompt and link, rendered under the form */
  footer: ReactNode
  /** fill the whole viewport (no header/footer around the page) */
  fullScreen?: boolean
}

/**
 * Shared frame for the login and signup pages: a form-focused institutional
 * panel inside the public layout, with a quiet route back to the landing page.
 */
export function AuthLayout({
  titleKey,
  descriptionKey,
  children,
  footer,
  fullScreen = false,
}: AuthLayoutProps) {
  const { t } = useI18n()

  useEffect(() => {
    document.title = `${t('app.product.name')} · ${t(titleKey)}`
  }, [t, titleKey])

  return (
    <div className={cn('grid w-full lg:grid-cols-2', fullScreen ? 'h-dvh overflow-hidden' : 'min-h-[calc(100dvh-8rem)]')}>
      <div className="relative hidden flex-col justify-end overflow-hidden bg-gradient-to-br from-water-900 via-water-700 to-water-500 p-12 text-white lg:flex">
        <LandingImage src="/images/landing/hero-community-water-point.jpg" altKey="landing.hero.photoAlt" aspectClass="h-full w-full object-cover opacity-70" className="absolute inset-0 h-full w-full" fallback={{ kind: 'placeholder', subjectKey: 'landing.hero.imageSubject', altKey: 'landing.hero.imageAlt' }} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-water-900/90 via-water-900/40 to-transparent" />
        <div className="relative max-w-md">
          <h2 className="font-serif text-5xl font-semibold leading-[1.1] tracking-[-.015em] [text-wrap:balance]">{t('landing.short.title')}</h2>
          <p className="mt-5 text-mg-title-sm leading-relaxed text-white/90">{t('landing.short.body')}</p>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-col items-center justify-center-safe overflow-y-auto px-4 py-4 sm:px-6">
        {fullScreen ? <DashboardControls /> : null}
        <div className="mg-auth-fit flex w-full flex-col items-center gap-3">
        <div className="w-full max-w-3xl mg-glass p-8 sm:p-12 [&_input]:h-14 [&_input]:text-xl [&_select]:h-14 [&_select]:text-xl [&_label]:text-xl [&_label]:font-semibold [&_label]:text-foreground [&_button[type=submit]]:h-14 [&_button[type=submit]]:text-xl [&_button[type=submit]]:font-semibold">
          <p className="text-lg font-semibold uppercase tracking-wider text-primary">
            {t('auth.eyebrow')}
          </p>
          <h1 className="mt-2 font-serif text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            {t(titleKey)}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">
            {t(descriptionKey)}
          </p>

          <div className="mt-6 text-lg">{children}</div>

          <p className="mt-6 border-t border-border pt-5 text-xl text-muted-foreground">
            {footer}
          </p>
        </div>

        <div className="w-full max-w-3xl space-y-1.5">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-lg font-medium text-foreground underline-offset-2 hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t('auth.back')}
          </Link>
        </div>
        </div>
      </div>
    </div>
  )
}
