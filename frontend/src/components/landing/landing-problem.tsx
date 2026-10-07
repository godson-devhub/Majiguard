import { Clock, Droplets, Gauge, Users, type LucideIcon } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import { LandingImage } from '@/components/landing/landing-image'
import type { MessageKey } from '@/i18n/messages'

type Step = {
  icon: LucideIcon
  titleKey: MessageKey
  bodyKey: MessageKey
}

const steps: Step[] = [
  { icon: Droplets, titleKey: 'landing.problem.step1.title', bodyKey: 'landing.problem.step1.body' },
  { icon: Clock, titleKey: 'landing.problem.step2.title', bodyKey: 'landing.problem.step2.body' },
  { icon: Gauge, titleKey: 'landing.problem.step3.title', bodyKey: 'landing.problem.step3.body' },
  { icon: Users, titleKey: 'landing.problem.step4.title', bodyKey: 'landing.problem.step4.body' },
]

export function LandingProblem() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-problem-title"
      className="border-b border-border bg-muted/40"
    >
      <div className="mx-auto w-full max-w-[var(--content-max-width)] space-y-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-5 lg:gap-12">
        <div className="max-w-3xl space-y-4 lg:col-span-3">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.problem.eyebrow')}
          </p>
          <h2
            id="landing-problem-title"
            className="text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl"
          >
            {t('landing.problem.title')}
          </h2>
          <p className="text-mg-body text-muted-foreground">
            {t('landing.problem.body')}
          </p>
          <p className="border-s-2 border-primary ps-4 text-mg-title-sm font-medium text-foreground">
            {t('landing.problem.question')}
          </p>
        </div>

        <LandingImage
          src="/images/landing/problem-water-point.jpg"
          altKey="landing.problem.photoAlt"
          aspectClass="aspect-[4/3]"
          className="lg:col-span-2"
          fallback={{ kind: 'none' }}
        />
        </div>

        <ol
          aria-label={t('landing.problem.flowLabel')}
          className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map(({ icon: Icon, titleKey, bodyKey }, index) => (
            <li key={titleKey} className="flex min-w-0 flex-col gap-3 bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="text-mg-caption font-medium text-muted-foreground">
                  {index + 1} / {steps.length}
                </span>
              </div>
              <h3 className="text-mg-title-sm font-semibold text-foreground">
                {t(titleKey)}
              </h3>
              <p className="text-mg-body-sm text-muted-foreground">{t(bodyKey)}</p>
            </li>
          ))}
        </ol>

        <p className="max-w-3xl text-mg-body-sm text-muted-foreground">
          {t('landing.problem.note')}
        </p>
      </div>
    </section>
  )
}
