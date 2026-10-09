import { Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'

import { useTheme, type Theme } from '@/app/providers/theme-provider'
import { availableLocales, useI18n } from '@/app/providers/locale-provider'
import { SectionPage } from '@/app/shell/section-page'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

function SettingsSection({
  id,
  title,
  body,
  children,
}: {
  id: string
  title: string
  body?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="mg-glass mg-glass-static scroll-mt-24"
    >
      <div className="border-b border-border px-5 py-4">
        <h2 id={`${id}-heading`} className="text-mg-title-md font-semibold text-foreground">
          {title}
        </h2>
        {body === undefined ? null : (
          <p className="mt-1 max-w-[68ch] text-mg-body-sm text-muted-foreground">{body}</p>
        )}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:gap-6">
      <dt className="text-mg-body-sm font-medium text-foreground">{label}</dt>
      <dd className="min-w-0 text-mg-body-sm text-foreground">
        <div className="mg-figure break-words">{children}</div>
        {hint === undefined ? null : (
          <p className="mt-1 text-mg-caption text-muted-foreground">{hint}</p>
        )}
      </dd>
    </div>
  )
}

type ChoiceOption<T extends string> = { value: T; label: string; icon?: ReactNode }

/** A compact single-choice control: real buttons exposing `aria-pressed`. */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ChoiceOption<T>[]
  onChange: (next: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-control border border-input p-0.5">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              onChange(option.value)
            }}
            className={cn(
              'mg-transition inline-flex h-9 items-center gap-2 rounded-sm px-3 text-mg-body-sm font-medium pointer-coarse:h-11',
              selected
                ? 'bg-brand text-brand-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

function AppearanceSection() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <SettingsSection
      id="appearance"
      title={t('settings.appearance.title')}
      body={t('settings.appearance.body')}
    >
      <dl className="divide-y divide-border">
        <Row label={t('settings.theme.label')}>
          <Choice<Theme>
            label={t('settings.theme.label')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('theme.light'), icon: <Sun aria-hidden="true" className="size-4" /> },
              { value: 'dark', label: t('theme.dark'), icon: <Moon aria-hidden="true" className="size-4" /> },
            ]}
          />
        </Row>
        <Row label={t('locale.label')}>
          <Choice
            label={t('locale.label')}
            value={locale}
            onChange={setLocale}
            options={availableLocales.map((entry) => ({ value: entry.locale, label: t(entry.label) }))}
          />
        </Row>
      </dl>
    </SettingsSection>
  )
}

/**
 * Settings: only what this application genuinely supports - the two
 * preferences it already stores (theme and language). No accounts,
 * notifications, editable thresholds or API keys exist, so none are shown.
 */
export function SettingsRoute() {
  return (
    <SectionPage
      titleKey="page.settings.title"
      descriptionKey="page.settings.body"
      eyebrowKey="page.settings.eyebrow"
    >
      <div className="max-w-4xl">
        <AppearanceSection />
      </div>
    </SectionPage>
  )
}
