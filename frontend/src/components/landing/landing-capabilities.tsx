import {
  ChartNoAxesColumn,
  Map,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

type Capability = {
  icon: LucideIcon
  titleKey: MessageKey
  bodyKey: MessageKey
}

const capabilities: Capability[] = [
  { icon: TriangleAlert, titleKey: 'landing.cap.risk.title', bodyKey: 'landing.cap.risk.body' },
  { icon: Users, titleKey: 'landing.cap.impact.title', bodyKey: 'landing.cap.impact.body' },
  { icon: ShieldCheck, titleKey: 'landing.cap.preventive.title', bodyKey: 'landing.cap.preventive.body' },
  { icon: Wrench, titleKey: 'landing.cap.restoration.title', bodyKey: 'landing.cap.restoration.body' },
  { icon: ChartNoAxesColumn, titleKey: 'landing.cap.analytics.title', bodyKey: 'landing.cap.analytics.body' },
  { icon: Map, titleKey: 'landing.cap.map.title', bodyKey: 'landing.cap.map.body' },
]

export function LandingCapabilities() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-cap-title"
      className="border-b border-border bg-muted/40"
    >
      <div className="mx-auto w-full max-w-[var(--content-max-width)] space-y-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.cap.eyebrow')}
          </p>
          <h2
            id="landing-cap-title"
            className="text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl"
          >
            {t('landing.cap.title')}
          </h2>
          <p className="text-mg-body text-muted-foreground">{t('landing.cap.body')}</p>
        </div>

        <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map(({ icon: Icon, titleKey, bodyKey }) => (
            <li
              key={titleKey}
              className="flex min-w-0 gap-4 border-t-2 border-primary/30 pt-5"
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0 space-y-1.5">
                <h3 className="text-mg-title-sm font-semibold text-foreground">
                  {t(titleKey)}
                </h3>
                <p className="text-mg-body-sm text-muted-foreground">{t(bodyKey)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
