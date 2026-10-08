import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { LandingImage } from '@/components/landing/landing-image'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingHero() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-hero-title"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto grid w-full max-w-[var(--content-max-width)] items-center gap-8 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-20">
        <div className="min-w-0 space-y-5">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.hero.eyebrow')}
          </p>
          <h1
            id="landing-hero-title"
            className="text-mg-display font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-4xl lg:text-5xl"
          >
            {t('landing.hero.title')}
          </h1>
          <p className="text-mg-title-sm font-medium text-foreground">
            {t('landing.hero.subtitle')}
          </p>
          <p className="max-w-prose text-mg-body text-muted-foreground">
            {t('landing.hero.body')}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to="/dashboard"
              className={cn(buttonVariants({ size: 'lg' }), 'px-5')}
            >
              {t('landing.hero.primaryCta')}
            </Link>
            <Link
              to="/login"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'px-5')}
            >
              {t('landing.hero.secondaryCta')}
            </Link>
          </div>
        </div>

        <LandingImage
          src="/images/landing/hero-community-water-point.jpg"
          altKey="landing.hero.photoAlt"
          priority
          fallback={{
            kind: 'placeholder',
            subjectKey: 'landing.hero.imageSubject',
            altKey: 'landing.hero.imageAlt',
          }}
        />
      </div>
    </section>
  )
}
