import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingCta() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-cta-title"
      className="border-t-4 border-primary bg-muted/40"
    >
      <div className="mx-auto w-full max-w-[var(--content-max-width)] space-y-6 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <h2
          id="landing-cta-title"
          className="max-w-3xl text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-4xl"
        >
          {t('landing.cta.title')}
        </h2>
        <p className="max-w-2xl text-mg-body text-muted-foreground">
          {t('landing.cta.body')}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard" className={cn(buttonVariants({ size: 'lg' }), 'px-5')}>
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
    </section>
  )
}
