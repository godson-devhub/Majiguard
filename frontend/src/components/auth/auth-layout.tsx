import { useEffect, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { LandingImage } from '@/components/landing/landing-image'
import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

type AuthLayoutProps = {
  titleKey: MessageKey
  descriptionKey: MessageKey
  children: ReactNode
  /** switch-page prompt and link, rendered under the form */
  footer: ReactNode
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
}: AuthLayoutProps) {
  const { t } = useI18n()

  useEffect(() => {
    document.title = `${t('app.product.name')} · ${t(titleKey)}`
  }, [t, titleKey])

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1fr_28rem] lg:items-center lg:gap-20 lg:px-8">
      <div className="hidden lg:block">
        <p className="text-mg-caption font-semibold uppercase tracking-[.16em] text-primary">{t('auth.eyebrow')}</p>
        <h2 className="mt-4 max-w-xl text-5xl font-semibold leading-[.98] tracking-[-.05em] text-foreground">{t('landing.short.title')}</h2>
        <p className="mt-6 max-w-lg text-mg-title-sm leading-relaxed text-muted-foreground">{t('landing.short.body')}</p>
        <LandingImage src="/images/landing/hero-community-water-point.jpg" altKey="landing.hero.photoAlt" className="mt-10 max-w-lg overflow-hidden rounded-panel border border-border bg-muted p-1 shadow-mg-2" fallback={{ kind: 'placeholder', subjectKey: 'landing.hero.imageSubject', altKey: 'landing.hero.imageAlt' }} />
      </div>
      <div className="rounded-panel border border-border border-t-2 border-t-primary bg-card p-6 shadow-mg-2 sm:p-8">
        <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
          {t('auth.eyebrow')}
        </p>
        <h1 className="mt-2 text-mg-title-lg font-semibold tracking-tight text-foreground">
          {t(titleKey)}
        </h1>
        <p className="mt-2 text-mg-body-sm text-muted-foreground">
          {t(descriptionKey)}
        </p>

        <div className="mt-6">{children}</div>

        <p className="mt-6 border-t border-border pt-4 text-mg-body-sm text-muted-foreground">
          {footer}
        </p>
      </div>

      <div className="mt-5 space-y-3 lg:col-start-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-mg-body-sm font-medium text-foreground underline-offset-2 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('auth.back')}
        </Link>
        <p className="text-mg-caption text-muted-foreground">{t('auth.disclaimer')}</p>
      </div>
    </div>
  )
}
