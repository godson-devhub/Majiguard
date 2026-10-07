import {
  Activity,
  Database,
  ListOrdered,
  TriangleAlert,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

type Stage = {
  icon: LucideIcon
  titleKey: MessageKey
  bodyKey: MessageKey
}

const stages: Stage[] = [
  { icon: Database, titleKey: 'landing.chain.data.title', bodyKey: 'landing.chain.data.body' },
  { icon: Activity, titleKey: 'landing.chain.condition.title', bodyKey: 'landing.chain.condition.body' },
  { icon: TriangleAlert, titleKey: 'landing.chain.risk.title', bodyKey: 'landing.chain.risk.body' },
  { icon: Users, titleKey: 'landing.chain.impact.title', bodyKey: 'landing.chain.impact.body' },
  { icon: ListOrdered, titleKey: 'landing.chain.priority.title', bodyKey: 'landing.chain.priority.body' },
  { icon: Wrench, titleKey: 'landing.chain.action.title', bodyKey: 'landing.chain.action.body' },
]

export function LandingIntelligence() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-chain-title"
      className="border-b border-border bg-muted/40"
    >
      <div className="mx-auto w-full max-w-[var(--content-max-width)] space-y-10 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl space-y-4">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.chain.eyebrow')}
          </p>
          <h2
            id="landing-chain-title"
            className="text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl"
          >
            {t('landing.chain.title')}
          </h2>
          <p className="text-mg-body text-muted-foreground">
            {t('landing.chain.body')}
          </p>
        </div>

        <ol
          aria-label={t('landing.chain.flowLabel')}
          className="grid lg:grid-cols-6"
        >
          {stages.map(({ icon: Icon, titleKey, bodyKey }) => (
            <li
              key={titleKey}
              className="relative flex min-w-0 flex-col gap-2 border-s-2 border-primary/30 pb-8 ps-6 last:pb-0 lg:border-s-0 lg:border-t-2 lg:pe-4 lg:ps-0 lg:pb-0 lg:pt-6"
            >
              <span
                aria-hidden="true"
                className="absolute -start-[7px] top-0 size-3 rounded-full bg-primary ring-4 ring-background lg:start-0 lg:-top-[7px]"
              />
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <h3 className="text-mg-title-sm font-semibold text-foreground">
                {t(titleKey)}
              </h3>
              <p className="text-mg-body-sm text-muted-foreground">{t(bodyKey)}</p>
            </li>
          ))}
        </ol>

        <div className="max-w-3xl space-y-3 border-s-2 border-primary ps-4">
          <p className="text-mg-title-md font-semibold text-foreground">
            {t('landing.chain.question')}
          </p>
          <p className="text-mg-body-sm text-muted-foreground">
            {t('landing.chain.note')}
          </p>
        </div>
      </div>
    </section>
  )
}
