import { Moon, Sun } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'

import { useTheme, type Theme } from '@/app/providers/theme-provider'
import { availableLocales, useI18n } from '@/app/providers/locale-provider'
import { SectionPage } from '@/app/shell/section-page'
import { formatNumber, formatPercent } from '@/components/data/format'
import { useHealthQuery } from '@/hooks/health'
import { usePrioritySummaryQuery } from '@/hooks/priority'
import { useAdministrativeMetadataQuery, useWaterPointListQuery } from '@/hooks/water-points'
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
      className="scroll-mt-24 rounded-panel border border-border bg-card"
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

/** A value that is still loading or could not be read is stated, never guessed. */
function Loadable({
  loading,
  failed,
  children,
}: {
  loading: boolean
  failed: boolean
  children: ReactNode
}) {
  const { t } = useI18n()
  if (loading) {
    return (
      <span role="status" aria-live="polite">
        <span className="sr-only">{t('state.loadingSection')}</span>
        <span aria-hidden="true" className="inline-block h-4 w-24 animate-pulse rounded-control bg-muted" />
      </span>
    )
  }
  if (failed) {
    return <span className="text-muted-foreground">{t('state.unavailable')}</span>
  }
  return <>{children}</>
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

function MethodologySection() {
  const { t } = useI18n()
  const summary = usePrioritySummaryQuery()
  const data = summary.data

  return (
    <SettingsSection
      id="methodology"
      title={t('settings.methodology.title')}
      body={t('settings.methodology.body')}
    >
      <dl className="divide-y divide-border">
        <Row label={t('settings.methodology.priorityVersion')}>
          <Loadable loading={summary.isPending} failed={summary.isError}>
            {data?.priority_methodology_version}
          </Loadable>
        </Row>
        <Row
          label={t('settings.methodology.impactThreshold')}
          hint={t('settings.methodology.impactThresholdNote')}
        >
          <Loadable loading={summary.isPending} failed={summary.isError}>
            {data === undefined ? null : `${formatNumber(data.impact_high_threshold)} (${formatPercent(data.impact_high_threshold)})`}
          </Loadable>
        </Row>
        <Row label={t('settings.methodology.impactThresholdVersion')}>
          <Loadable loading={summary.isPending} failed={summary.isError}>
            {data?.impact_high_threshold_version}
          </Loadable>
        </Row>
        <Row label={t('settings.methodology.highImpactCount')}>
          <Loadable loading={summary.isPending} failed={summary.isError}>
            {data === undefined ? null : formatNumber(data.impact_high_national_count)}
          </Loadable>
        </Row>
        <Row label={t('settings.methodology.eligiblePreventive')}>
          <Loadable loading={summary.isPending} failed={summary.isError}>
            {data === undefined ? null : formatNumber(data.eligible_preventive)}
          </Loadable>
        </Row>
        <Row
          label={t('settings.methodology.eligibleRestoration')}
          hint={t('settings.methodology.pathwaysNote')}
        >
          <Loadable loading={summary.isPending} failed={summary.isError}>
            {data === undefined ? null : formatNumber(data.eligible_restoration)}
          </Loadable>
        </Row>
      </dl>
    </SettingsSection>
  )
}

function StatusSection() {
  const { t } = useI18n()
  const health = useHealthQuery()
  const metadata = useAdministrativeMetadataQuery()
  // Same parameters as the Overview total, so this is a cache hit when the
  // user has already seen the Overview.
  const register = useWaterPointListQuery({
    page: 1,
    page_size: 1,
    nbs_region: null,
    nbs_district: null,
    nbs_ward: null,
  })

  return (
    <SettingsSection id="status" title={t('settings.status.title')} body={t('settings.status.body')}>
      <dl className="divide-y divide-border">
        <Row label={t('settings.status.service')} hint={t('settings.status.note')}>
          <Loadable loading={health.isPending} failed={false}>
            {health.isSuccess ? t('settings.status.online') : t('settings.status.offline')}
          </Loadable>
        </Row>
        <Row label={t('settings.status.register')} hint={t('data.source')}>
          <Loadable loading={register.isPending} failed={register.isError}>
            {register.data === undefined ? null : formatNumber(register.data.total)}
          </Loadable>
        </Row>
        <Row label={t('settings.status.boundaries')}>
          <Loadable loading={metadata.isPending} failed={metadata.isError}>
            {metadata.data === undefined
              ? null
              : t('settings.status.boundariesValue', {
                  source: metadata.data.source,
                  version: metadata.data.version,
                })}
          </Loadable>
        </Row>
      </dl>
    </SettingsSection>
  )
}

function AboutSection() {
  const { t } = useI18n()

  return (
    <SettingsSection id="about" title={t('settings.about.title')}>
      <dl className="divide-y divide-border">
        <Row label={t('app.product.name')}>{t('app.brand.name')}</Row>
        <Row label={t('settings.about.officialName')}>{t('app.brand.officialName')}</Row>
        <Row label={t('settings.about.description')}>
          <span className="block">{t('app.product.descriptor')}</span>
          <span className="mt-1 block text-muted-foreground">{t('app.footer.descriptor')}</span>
        </Row>
        <Row label={t('settings.about.notice')}>{t('app.footer.disclaimer')}</Row>
      </dl>
    </SettingsSection>
  )
}

/**
 * Settings: only what this application genuinely supports. Appearance edits
 * the two preferences it already stores (theme and language); Methodology and
 * Data/system status are read-only views of values the backend already
 * exposes; About restates the product identity and the independent-tool
 * notice. There are no accounts, notifications, editable thresholds or API
 * keys, because none exist.
 */
export function SettingsRoute() {
  const { hash } = useLocation()

  // Footer links point at a section (`/settings#about`); a client-side
  // navigation does not scroll to a hash by itself.
  useEffect(() => {
    if (hash.length === 0) {
      return
    }
    const timer = window.setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
    }, 60)
    return () => {
      window.clearTimeout(timer)
    }
  }, [hash])

  return (
    <SectionPage
      titleKey="page.settings.title"
      descriptionKey="page.settings.body"
      eyebrowKey="page.settings.eyebrow"
    >
      <div className="max-w-4xl space-y-6">
        <AppearanceSection />
        <MethodologySection />
        <StatusSection />
        <AboutSection />
      </div>
    </SectionPage>
  )
}
