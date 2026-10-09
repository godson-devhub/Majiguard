import type { UseQueryResult } from '@tanstack/react-query'
import {
  ArrowRight,
  CircleCheck,
  CircleSlash,
  Droplets,
  TriangleAlert,
  Waves,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { SectionPage } from '@/app/shell/section-page'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { formatNumber, formatScorePercent } from '@/components/data/format'
import { KpiCard } from '@/components/data/kpi-card'
import { ObservedStatusChip } from '@/components/data/observed-status'
import { RankBadge } from '@/components/data/rank-badge'
import { OverviewSpatialSummary } from '@/components/overview/overview-spatial-summary'
import { SemanticChip } from '@/components/status/semantic-chip'
import { usePreventivePriorityQuery, useRestorationPriorityQuery } from '@/hooks/priority'
import { FUNCTIONAL_STATUS, NON_FUNCTIONAL_STATUS, useEstateKpis } from '@/hooks/estate-kpis'
import type { MessageKey } from '@/i18n/messages'
import { mapImpactBand } from '@/lib/data-ramps'
import {
  formatLocation,
  impactRowAccent,
  priorityHref,
  riskBandTone,
  riskRowAccent,
} from '@/lib/priority-presentation'
import type { RegisterFilters } from '@/lib/register-reference'
import { observedStatusLabel } from '@/lib/status-labels'
import { cn } from '@/lib/utils'
import type { MapPointOut, PriorityPageMeta } from '@/types/api'

/** Both pathways show the same top-1, so the two "Where should we act
 * first?" columns stay visually and structurally balanced - neither pool's
 * size (preventive's is small, restoration's is much larger) changes how
 * many of its own top-ranked rows are shown here. */
const PREVENTIVE_TOP_N = 1
const RESTORATION_TOP_N = 1

/** One shared row grid for the top lists, so the header row lines up. */
const LIST_ROW_GRID =
  'grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-2 sm:grid-cols-[1.75rem_5.5rem_minmax(0,1fr)_7rem_3rem]'

/**
 * One pathway as a single "problem to solve now" card: an alert-toned header
 * with the backend's own scoped eligible count (the paginated response's
 * `total`, already filtered by the active Region/District/Ward), the top-8
 * rows exactly as the backend ranked them, and a link to the full worklist.
 * Ordering and scores are verbatim - never re-sorted or combined across the
 * two pathways.
 */
function PriorityCard({
  variant,
  query,
}: {
  variant: 'preventive' | 'restoration'
  query: UseQueryResult<PriorityPageMeta>
}) {
  const { t } = useI18n()
  const isPreventive = variant === 'preventive'
  const titleKey: MessageKey = isPreventive ? 'overview.preventive.title' : 'overview.restoration.title'
  const ctaKey: MessageKey = isPreventive ? 'overview.preventive.cta' : 'overview.restoration.cta'
  const headingId = `priority-${variant}-title`
  const Icon = isPreventive ? TriangleAlert : CircleSlash
  const count = query.isSuccess ? query.data.total : null

  return (
    <section aria-labelledby={headingId} className="mg-glass flex flex-col overflow-hidden">
      <div
        className={cn(
          'relative flex items-center gap-3 px-4 py-1.5',
          isPreventive
            ? 'bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-transparent'
            : 'bg-gradient-to-br from-red-500/20 via-red-500/5 to-transparent',
        )}
      >
        <span
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-lg shadow-mg-2',
            isPreventive ? 'bg-amber-500 text-white' : 'bg-red-600 text-white',
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="text-mg-title-sm text-foreground">
            {t(titleKey)}
          </h3>
        </div>
        <div className="text-end">
          {query.isPending ? (
            <div role="status" aria-live="polite">
              <span className="sr-only">{t('state.loadingSection')}</span>
              <div aria-hidden="true" className="h-10 w-20 animate-pulse rounded-control bg-muted" />
            </div>
          ) : query.isError ? (
            <p className="text-mg-body-sm font-semibold text-muted-foreground">{t('state.unavailable')}</p>
          ) : (
            <>
              <p
                className={cn(
                  'mg-figure font-serif text-2xl leading-none font-semibold',
                  isPreventive ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
                )}
              >
                {formatNumber(count)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 px-2">
        {query.isPending ? (
          <div className="p-4">
            <LoadingState label={t('data.loading')} />
          </div>
        ) : query.isError ? (
          <div className="p-4">
            <FailureState error={query.error} onRetry={() => void query.refetch()} />
          </div>
        ) : query.data.items.length === 0 ? (
          <div className="p-4">
            <EmptyState body={t('overview.list.empty')} />
          </div>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={cn(
                LIST_ROW_GRID,
                'px-3 py-0.5 text-mg-caption font-medium text-muted-foreground',
              )}
            >
              <span>{t('priority.column.rank')}</span>
              <span className="hidden sm:block">{t('priority.column.waterPoint')}</span>
              <span>{t('priority.column.location')}</span>
              <span className="hidden sm:block">{t('priority.column.condition')}</span>
              <span className="text-end">{t('priority.column.priority')}</span>
            </div>
            <ul className="divide-y divide-border/60">
              {query.data.items.map((item) => {
                const tone = isPreventive
                  ? riskBandTone(item.risk_band)
                  : mapImpactBand(item.priority_score ?? 0)
                const accent = isPreventive ? riskRowAccent(tone) : impactRowAccent(tone ?? 'low')
                return (
                  <li key={item.water_point_id}>
                    <Link
                      to={priorityHref(variant)}
                      className={cn(
                        LIST_ROW_GRID,
                        'rounded-lg px-3 py-1 outline-none transition-colors hover:bg-accent/70 focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        accent,
                      )}
                    >
                      <RankBadge rank={item.rank} />
                      <span className="mg-figure hidden truncate text-mg-caption font-semibold text-foreground sm:block">
                        {item.master_id}
                      </span>
                      <span className="min-w-0 truncate text-mg-caption text-muted-foreground">
                        <span className="mg-figure font-medium text-foreground sm:hidden">
                          {item.master_id}
                        </span>
                        <span className="sm:hidden"> · </span>
                        {formatLocation(item)}
                      </span>
                      <span className="hidden min-w-0 overflow-hidden whitespace-nowrap text-mg-caption sm:block">
                        {isPreventive ? (
                          riskBandTone(item.risk_band) !== null ? (
                            <SemanticChip kind="risk" tone={riskBandTone(item.risk_band) ?? 'low'} />
                          ) : null
                        ) : (
                          <ObservedStatusChip value={item.observed_status} />
                        )}
                      </span>
                      <span className="mg-figure text-end text-mg-caption font-semibold text-foreground">
                        {formatScorePercent(item.priority_score)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <div className="border-t border-border/60 px-4 py-1">
        <Link
          to={priorityHref(variant)}
          className="group inline-flex items-center gap-1.5 text-mg-body-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t(ctaKey)}
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </section>
  )
}

/**
 * Functional vs non-functional at a glance: a donut and a legend of the same
 * backend counts shown in the KPI row (never recomputed). The remainder is
 * whatever the register records as neither - shown as its own segment so the
 * three always add up to the register total.
 */
function ConditionAnalytics({
  total,
  functional,
  nonFunctional,
  isPending,
}: {
  total: number | null
  functional: number | null
  nonFunctional: number | null
  isPending: boolean
}) {
  const { t } = useI18n()
  const ready = total !== null && functional !== null && nonFunctional !== null && total > 0
  const other = ready ? Math.max(total - functional - nonFunctional, 0) : 0

  const segments = ready
    ? [
        { key: 'functional', label: t('overview.analytics.functional'), value: functional, color: 'var(--status-functional)' },
        { key: 'nonfunctional', label: t('overview.analytics.nonFunctional'), value: nonFunctional, color: 'var(--status-nonfunctional)' },
        { key: 'other', label: t('overview.analytics.other'), value: other, color: 'var(--mg-n-300)' },
      ]
    : []

  const radius = 52
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <section aria-labelledby="overview-analytics-title" className="mg-glass flex min-h-0 flex-col px-4 pb-3 pt-3">
      <div className="flex h-9 items-center">
        <h2 id="overview-analytics-title" className="text-mg-title-md text-foreground">
          {t('overview.analytics.title')}
        </h2>
      </div>


      {isPending ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <LoadingState label={t('data.loading')} />
        </div>
      ) : !ready ? (
        <div className="flex-1 pt-4">
          <EmptyState body={t('overview.list.empty')} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-2">
          <div className="relative size-36 shrink-0">
            <svg viewBox="0 0 128 128" role="img" aria-label={t('overview.analytics.title')} className="size-full -rotate-90">
              <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--border)" strokeWidth="14" />
              {segments.map((segment) => {
                const length = (segment.value / total) * circumference
                const dash = `${length} ${circumference - length}`
                const node = (
                  <circle
                    key={segment.key}
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="14"
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                  />
                )
                offset += length
                return node
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="mg-figure font-serif text-2xl font-semibold text-foreground">{formatNumber(total)}</span>
              <span className="text-mg-caption text-muted-foreground">{t('dashboard.kpi.total')}</span>
            </div>
          </div>

          <ul className="w-full space-y-1.5">
            {segments.map((segment) => (
              <li key={segment.key} className="flex items-center gap-3 text-mg-body-sm">
                <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: segment.color }} />
                <span className="flex-1 text-muted-foreground">{segment.label}</span>
                <span className="mg-figure font-semibold text-foreground">{formatNumber(segment.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/**
 * The decision-first Overview. Reading order: scope, then "where should we
 * act first?", then the estate-condition figures, then the ranked lists, then
 * the spatial summary. A global Region/District/Ward filter scopes every
 * section on the page - KPIs, both priority rankings, and the spatial summary.
 * Every number is read from the backend (`/water-points`, `/priority/*`) or
 * derived by counting an already-stored field across already-fetched rows
 * (the same pattern this codebase already uses for "high risk" counts) -
 * nothing is computed, ranked, banded, or invented here, and the two priority
 * pathways are never combined.
 */
export function OverviewRoute() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()

  const filters: RegisterFilters = {
    region: searchParams.get('region'),
    status: null,
    district: searchParams.get('district'),
    ward: searchParams.get('ward'),
  }
  const hasLocationFilter = filters.region !== null

  // --- Estate-condition KPIs: one shared definition with Analytics (see
  // `useEstateKpis`) so the two screens can never show different numbers for
  // the same real backend-derived measure.
  const {
    totals,
    statusPending,
    functionalCount,
    nonFunctionalCount,
    nationalSummary,
    scopedMapPoints,
    sampleMapPoints,
    functionalHighRiskPending,
    functionalHighRiskError,
    functionalHighRiskCount,
    highImpactPending,
    highImpactError,
    highImpactCount,
    highImpactNonFunctionalCount,
  } = useEstateKpis(filters)

  // --- Priority rankings, both pathways, server-filtered by the same scope.
  const preventive = usePreventivePriorityQuery({
    page: 1,
    page_size: PREVENTIVE_TOP_N,
    nbs_region: filters.region,
    nbs_district: filters.district,
    nbs_ward: filters.ward,
  })
  const restoration = useRestorationPriorityQuery({
    page: 1,
    page_size: RESTORATION_TOP_N,
    nbs_region: filters.region,
    nbs_district: filters.district,
    nbs_ward: filters.ward,
  })

  // --- Spatial summary: the same scoped/sample fetch used for KPI 3 above,
  // so selecting a location never triggers a second map fetch.
  const spatialPoints: readonly MapPointOut[] = hasLocationFilter
    ? (scopedMapPoints.data?.items ?? [])
    : (sampleMapPoints.data?.items ?? [])
  const spatialTotal = hasLocationFilter
    ? (scopedMapPoints.data?.total ?? 0)
    : (sampleMapPoints.data?.total ?? 0)
  const spatialPending = hasLocationFilter ? scopedMapPoints.isPending : sampleMapPoints.isPending
  const spatialIsError = hasLocationFilter ? scopedMapPoints.isError : sampleMapPoints.isError
  const spatialError = hasLocationFilter ? scopedMapPoints.error : sampleMapPoints.error
  const spatialRetry = hasLocationFilter
    ? () => void scopedMapPoints.refetch()
    : () => void sampleMapPoints.refetch()

  const totalHint =
    filters.region === null
      ? t('dashboard.kpi.totalHint')
      : t('dashboard.kpi.totalFiltered', { region: filters.region })

  const highImpactHint = t('overview.kpi.highImpactHint', {
    threshold: nationalSummary.isSuccess
      ? formatScorePercent(nationalSummary.data.impact_high_threshold)
      : '—',
  })

  return (
    <SectionPage
      titleKey="page.dashboard.title"
      descriptionKey="page.dashboard.body"
      eyebrowKey="page.dashboard.eyebrow"
      sourceNote={t('data.source')}
      titleOnly
    >
      <div className="space-y-4 lg:grid lg:h-[calc(100dvh-5.5rem)] lg:min-h-[34rem] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:gap-4 lg:space-y-0">
        {/* 1. Estate condition: two groups side by side on wide screens */}
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <section aria-labelledby="kpi-functional-heading" className="space-y-0">
            <h2
              id="kpi-functional-heading"
              className="sr-only"
            >
              {t('overview.kpi.sectionFunctional')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                compact
                label={t('dashboard.kpi.total')}
                icon={Droplets}
                state={totals.isPending ? 'loading' : totals.isError ? 'error' : 'ready'}
                value={totals.isSuccess ? formatNumber(totals.data.total) : ''}
                hint={totalHint}
              />
              <KpiCard
                compact
                label={observedStatusLabel(FUNCTIONAL_STATUS, t)}
                icon={CircleCheck}
                tone="functional"
                state={statusPending ? 'loading' : 'ready'}
                value={formatNumber(functionalCount)}
                hint={t('dashboard.kpi.functionalHint')}
              />
              <KpiCard
                compact
                label={t('overview.kpi.functionalHighRisk')}
                icon={TriangleAlert}
                tone="warning"
                state={functionalHighRiskPending ? 'loading' : functionalHighRiskError ? 'error' : 'ready'}
                value={formatNumber(functionalHighRiskCount)}
                hint={t('overview.kpi.functionalHighRiskHint')}
              />
              <KpiCard
                compact
                label={t('overview.kpi.highImpact')}
                icon={Waves}
                tone="info"
                state={highImpactPending ? 'loading' : highImpactError ? 'error' : 'ready'}
                value={formatNumber(highImpactCount)}
                hint={highImpactHint}
              />
            </div>
          </section>

          <section aria-labelledby="kpi-nonfunctional-heading" className="space-y-0">
            <h2
              id="kpi-nonfunctional-heading"
              className="sr-only"
            >
              {t('overview.kpi.sectionNonFunctional')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <KpiCard
                compact
                label={observedStatusLabel(NON_FUNCTIONAL_STATUS, t)}
                icon={CircleSlash}
                tone="nonfunctional"
                state={statusPending ? 'loading' : 'ready'}
                value={formatNumber(nonFunctionalCount)}
                hint={t('dashboard.kpi.nonFunctionalHint')}
              />
              <KpiCard
                compact
                label={t('overview.kpi.highImpactNonFunctional')}
                icon={Waves}
                tone="info"
                state={highImpactPending ? 'loading' : highImpactError ? 'error' : 'ready'}
                value={formatNumber(highImpactNonFunctionalCount)}
                hint={t('overview.kpi.highImpactNonFunctionalHint')}
              />
            </div>
          </section>
        </div>

        {/* 2. Spatial summary (left) and condition analytics (right) */}
        <div className="grid gap-4 lg:min-h-0 lg:grid-cols-[2fr_1fr]">
          <OverviewSpatialSummary
            points={spatialPoints}
            total={spatialTotal}
            isPending={spatialPending}
            isError={spatialIsError}
            error={spatialError}
            onRetry={spatialRetry}
            isScoped={hasLocationFilter}
          />
          <ConditionAnalytics
            total={totals.isSuccess ? totals.data.total : null}
            functional={functionalCount}
            nonFunctional={nonFunctionalCount}
            isPending={totals.isPending || statusPending}
          />
        </div>

        {/* 3. The two pathways, never combined: count + top 8 + link */}
        <div className="grid gap-4 lg:grid-cols-2">
          <PriorityCard variant="preventive" query={preventive} />
          <PriorityCard variant="restoration" query={restoration} />
        </div>
      </div>
    </SectionPage>
  )
}
