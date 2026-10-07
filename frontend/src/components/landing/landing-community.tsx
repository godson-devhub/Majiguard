import { useI18n } from '@/app/providers/locale-provider'
import { LandingImage } from '@/components/landing/landing-image'
import type { MessageKey } from '@/i18n/messages'

const steps: MessageKey[] = [
  'landing.community.step1',
  'landing.community.step2',
  'landing.community.step3',
  'landing.community.step4',
]

export function LandingCommunity() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-community-title"
      className="border-b border-border bg-muted/40"
    >
      <div className="mx-auto grid w-full max-w-[var(--content-max-width)] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-16">
        <div className="order-2 min-w-0 lg:order-1">
          <LandingImage
            src="/images/landing/community-impact.jpg"
            altKey="landing.community.photoAlt"
            fallback={{
              kind: 'placeholder',
              subjectKey: 'landing.community.imageSubject',
              altKey: 'landing.community.imageAlt',
            }}
          />
        </div>

        <div className="order-1 min-w-0 space-y-5 lg:order-2">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.community.eyebrow')}
          </p>
          <h2
            id="landing-community-title"
            className="text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl"
          >
            {t('landing.community.title')}
          </h2>
          <p className="text-mg-body text-muted-foreground">
            {t('landing.community.body')}
          </p>

          <ol
            aria-label={t('landing.community.flowLabel')}
            className="border-s-2 border-primary/30"
          >
            {steps.map((key, index) => (
              <li
                key={key}
                className="relative pb-4 ps-5 text-mg-body-sm font-medium text-foreground last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute -start-[7px] top-1 size-3 rounded-full bg-primary ring-4 ring-muted"
                />
                <span className="sr-only">{index + 1}. </span>
                {t(key)}
              </li>
            ))}
          </ol>

          <p className="text-mg-body-sm text-muted-foreground">
            {t('landing.community.note')}
          </p>
        </div>
      </div>
    </section>
  )
}
