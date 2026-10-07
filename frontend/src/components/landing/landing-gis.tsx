import { useI18n } from '@/app/providers/locale-provider'
import { LandingImage } from '@/components/landing/landing-image'
import type { MessageKey } from '@/i18n/messages'

/** Each level steps in on small screens so the hierarchy reads as nesting. */
const levels: { key: MessageKey; indent: string }[] = [
  { key: 'landing.gis.level.country', indent: 'ms-0' },
  { key: 'landing.gis.level.region', indent: 'ms-4' },
  { key: 'landing.gis.level.district', indent: 'ms-8' },
  { key: 'landing.gis.level.ward', indent: 'ms-12' },
  { key: 'landing.gis.level.waterPoint', indent: 'ms-16' },
]

export function LandingGis() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-gis-title"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto grid w-full max-w-[var(--content-max-width)] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-16">
        <div className="min-w-0 space-y-5">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.gis.eyebrow')}
          </p>
          <h2
            id="landing-gis-title"
            className="text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl"
          >
            {t('landing.gis.title')}
          </h2>
          <p className="text-mg-body text-muted-foreground">{t('landing.gis.body')}</p>

          <ol
            aria-label={t('landing.gis.hierarchyLabel')}
            className="space-y-2 pt-1 lg:space-y-0 lg:flex lg:flex-wrap lg:gap-2"
          >
            {levels.map(({ key, indent }) => (
              <li
                key={key}
                className={`${indent} w-fit max-w-full border-s-2 border-primary bg-card px-3 py-1.5 text-mg-body-sm font-medium text-foreground lg:ms-0`}
              >
                {t(key)}
              </li>
            ))}
          </ol>
        </div>

        <LandingImage
          src="/images/landing/tanzania-gis-context.jpg"
          altKey="landing.gis.photoAlt"
          fallback={{
            kind: 'placeholder',
            subjectKey: 'landing.gis.imageSubject',
            altKey: 'landing.gis.imageAlt',
          }}
        />
      </div>
    </section>
  )
}
