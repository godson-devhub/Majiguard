import { ClipboardList, Droplets, Landmark, Wrench, type LucideIcon } from 'lucide-react'

import { useI18n } from '@/app/providers/locale-provider'
import type { MessageKey } from '@/i18n/messages'

const users: { icon: LucideIcon; key: MessageKey }[] = [
  { icon: Landmark, key: 'landing.users.dwa' },
  { icon: Droplets, key: 'landing.users.ruwasa' },
  { icon: Wrench, key: 'landing.users.managers' },
  { icon: ClipboardList, key: 'landing.users.planners' },
]

export function LandingUsers() {
  const { t } = useI18n()

  return (
    <section
      aria-labelledby="landing-users-title"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto grid w-full max-w-[var(--content-max-width)] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-5 lg:gap-14 lg:px-8 lg:py-16">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <p className="text-mg-caption font-medium uppercase tracking-wider text-primary">
            {t('landing.users.eyebrow')}
          </p>
          <h2
            id="landing-users-title"
            className="text-mg-title-lg font-semibold tracking-tight text-foreground [text-wrap:balance] sm:text-3xl"
          >
            {t('landing.users.title')}
          </h2>
          <p className="text-mg-body text-muted-foreground">{t('landing.users.body')}</p>
          <p className="text-mg-body-sm text-muted-foreground">
            {t('landing.users.disclaimer')}
          </p>
        </div>

        <ul className="min-w-0 divide-y divide-border border-y border-border lg:col-span-3">
          {users.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-center gap-4 py-4">
              <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <span className="text-mg-title-sm font-semibold text-foreground">
                {t(key)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
