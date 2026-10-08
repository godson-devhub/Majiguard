import { ArrowDown, ArrowRight } from 'lucide-react'
import { Fragment } from 'react'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

const flow: MessageKey[] = [
  'landing.sector.flow1',
  'landing.sector.flow2',
  'landing.sector.flow3',
  'landing.sector.flow4',
]

const dimensions: MessageKey[] = [
  'landing.sector.dim.condition',
  'landing.sector.dim.climate',
  'landing.sector.dim.population',
  'landing.sector.dim.geography',
  'landing.sector.dim.risk',
  'landing.sector.dim.impact',
  'landing.sector.dim.priorities',
]

export function LandingSector() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-sector-title"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto grid w-full max-w-[var(--content-max-width)] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-5 lg:gap-14 lg:px-8 lg:py-16">
        <div className="min-w-0 space-y-4 lg:col-span-3">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.sector.eyebrow')}
          </p>
          <h2
            id="landing-sector-title"
            className="text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl"
          >
            {t('landing.sector.title')}
          </h2>
          <p className="text-mg-body text-muted-foreground">
            {t('landing.sector.body1')}
          </p>
          <p className="text-mg-body text-muted-foreground">
            {t('landing.sector.body2')}
          </p>
        </div>

        <div className="min-w-0 space-y-3 lg:col-span-2">
          <h3 className="text-mg-label font-semibold uppercase tracking-wider text-foreground">
            {t('landing.sector.dimensionsTitle')}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {dimensions.map((key) => (
              <li
                key={key}
                className="rounded-md border border-border-strong bg-card px-3 py-1.5 text-mg-body-sm text-foreground"
              >
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <ol
          aria-label={t('landing.sector.flowLabel')}
          className="flex flex-col items-stretch gap-2 lg:col-span-5 lg:flex-row lg:items-center lg:gap-3"
        >
          {flow.map((key, index) => (
            <Fragment key={key}>
              <li className="flex-1 rounded-md border border-border bg-card px-4 py-3 text-center text-mg-title-sm font-semibold text-foreground">
                {t(key)}
              </li>
              {index < flow.length - 1 ? (
                <li
                  aria-hidden="true"
                  className="flex justify-center text-primary"
                >
                  <ArrowDown className="size-5 lg:hidden" />
                  <ArrowRight className="hidden size-5 lg:block" />
                </li>
              ) : null}
            </Fragment>
          ))}
        </ol>
      </div>
    </section>
  )
}
