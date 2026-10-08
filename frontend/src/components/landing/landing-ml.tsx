import { ArrowDown } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

const inputs: MessageKey[] = [
  'landing.ml.input.condition',
  'landing.ml.input.climate',
  'landing.ml.input.population',
  'landing.ml.input.spatial',
  'landing.ml.input.indicators',
]

function Connector() {
  return (
    <div aria-hidden="true" className="flex justify-center py-2 text-primary">
      <ArrowDown className="size-5" />
    </div>
  )
}

export function LandingMl() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-ml-title"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto grid w-full max-w-[var(--content-max-width)] items-start gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-16">
        <div className="min-w-0 space-y-4">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.ml.eyebrow')}
          </p>
          <h2
            id="landing-ml-title"
            className="text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl"
          >
            {t('landing.ml.title')}
          </h2>
          <p className="text-mg-body text-muted-foreground">{t('landing.ml.body1')}</p>
          <p className="text-mg-body text-muted-foreground">{t('landing.ml.body2')}</p>
          <p className="border-s-2 border-primary ps-4 text-mg-body font-medium text-foreground">
            {t('landing.ml.evidence')}
          </p>
        </div>

        <div className="min-w-0 rounded-md border border-border bg-card p-5 shadow-mg-1 sm:p-6">
          <h3 className="text-mg-label font-semibold uppercase tracking-wider text-muted-foreground">
            {t('landing.ml.inputsTitle')}
          </h3>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {inputs.map((key) => (
              <li key={key} className="py-2 text-mg-body-sm text-foreground">
                {t(key)}
              </li>
            ))}
          </ul>

          <Connector />
          <div className="rounded-md border border-primary/40 bg-primary/5 p-4">
            <p className="text-mg-title-sm font-semibold text-foreground">
              {t('landing.ml.stage.ml.title')}
            </p>
            <p className="mt-1 text-mg-body-sm text-muted-foreground">
              {t('landing.ml.stage.ml.body')}
            </p>
          </div>

          <Connector />
          <div className="rounded-md border border-border-strong p-4">
            <p className="text-mg-title-sm font-semibold text-foreground">
              {t('landing.ml.stage.decision.title')}
            </p>
            <p className="mt-1 text-mg-body-sm text-muted-foreground">
              {t('landing.ml.stage.decision.body')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
