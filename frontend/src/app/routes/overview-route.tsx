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
import { RegisterFilterBar } from '@/components/data/register-filter-bar'
import { OverviewSpatialSummary } from '@/components/overview/overview-spatial-summary'
import { SemanticChip } from '@/components/status/semantic-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  scopeLabel,
} from '@/lib/priority-presentation'
import type { RegisterFilters } from '@/lib/register-reference'
import { observedStatusLabel } from '@/lib/status-labels'
import { cn } from '@/lib/utils'
import type { MapPointOut, PriorityPageMeta } from '@/types/api'

/** Both pathways show the same top-8, so the two "Where should we act
 * first?" columns stay visually and structurally balanced - neither pool's
 * size (preventive's is small, restoration's is much larger) changes how
 * many of its own top-ranked rows are shown here. */
const PREVENTIVE_TOP_N = 8
const RESTORATION_TOP_N = 8

/** One shared row grid for the top lists, so the header row lines up. */
const LIST_ROW_GRID =
  'grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[1.75rem_6.5rem_minmax(0,1fr)_auto_3.5rem]'

/**
 * One decision pathway's summary: the backend's own scoped total (the
 * paginated response's `total`, already filtered by whatever Region/
 * District/Ward is selected - never a separate unscoped count) and the
 * single highest-ranked eligible point. Neither pathway's score or rank is
 * ever combined with the other's.
 */
function DecisionCard({
  variant,
  listQuery,
}: {
  variant: 'preventive' | 'restoration'
  listQuery: UseQueryResult<PriorityPageMeta>
}) {
  const { t } = useI18n()
  const isPreventive = variant === 'preventive'
  const titleKey: MessageKey = isPreventive ? 'overview.preventive.title' : 'overview.restoration.title'
  const descriptionKey: MessageKey = isPreventive
    ? 'overview.preventive.description'
    : 'overview.restoration.description'
  const countKey: MessageKey = isPreventive ? 'overview.preventive.count' : 'overview.restoration.count'
  const ctaKey: MessageKey = isPreventive ? 'overview.preventive.cta' : 'overview.restoration.cta'

  const count = listQuery.isSuccess ? listQuery.data.total : null
  const highest = listQuery.isSuccess ? (listQuery.data.items[0] ?? null) : null

  return (
    <section
      aria-labelledby={`decision-${variant}-title`}
      className="flex flex-col rounded-panel border border-border bg-card"
    >
      <div className="space-y-1 border-b border-border px-5 py-4">
        <h3 id={`decision-${variant}-title`} className="text-mg-title-md font-semibold text-foreground">
          {t(titleKey)}
        </h3>
        <p className="text-mg-body-sm text-muted-foreground">{t(descriptionKey)}</p>
      </div>

      <div className="flex-1 space-y-4 px-5 py-4">
        <div>
          {listQuery.isPending ? (
            <div role="status" aria-live="polite">
              <span className="sr-only">{t('state.loadingSection')}</span>
              <div aria-hidden="true" className="h-9 w-24 animate-pulse rounded-control bg-muted" />
            </div>
          ) : listQuery.isError ? (
            <p className="text-mg-title-sm font-semibold text-muted-foreground">
              {t('state.unavailable')}
            </p>
          ) : (
            <p className="mg-figure text-mg-display font-semibold text-foreground">
              {formatNumber(count)}
            </p>
          )}
          {listQuery.isSuccess && count !== null ? (
            <p className="mt-1 text-mg-caption text-muted-foreground">
              {t(countKey, { count: formatNumber(count) })}
            </p>
          ) : null}
        </div>

        <div className="rounded-control border border-border bg-surface-subtle p-3">
          <p className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
            {t('overview.highestRanked')}
          </p>
          <div className="mt-2">
            {listQuery.isPending ? (
              <LoadingState label={t('data.loading')} />
            ) : listQuery.isError ? (
              <FailureState error={listQuery.error} onRetry={() => void listQuery.refetch()} />
            ) : highest === null ? (
              <p className="text-mg-caption text-muted-foreground">{t('overview.noEligible')}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <RankBadge rank={highest.rank} />
                <span className="mg-figure text-mg-body-sm font-semibold text-foreground">
                  {highest.master_id}
                </span>
                <span className="min-w-0 text-mg-caption text-muted-foreground">
                  {formatLocation(highest)}
                </span>
                <span className="ms-auto flex flex-col items-end leading-tight">
                  <span className="text-mg-caption text-muted-foreground">
                    {t('priority.column.priority')}
                  </span>
                  <span className="mg-figure text-mg-body-sm font-semibold text-foreground">
                    {formatScorePercent(highest.priority_score)}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-border px-5 py-3">
        <Button className="w-full sm:w-auto" nativeButton={false} render={<Link to={priorityHref(variant)} />}>
          {t(ctaKey)}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </section>
  )
}

/**
 * One pathway's compact ranked list. Rows are real `PriorityItemOut` records,
 * server-paginated and server-filtered at the source (the Region/District/
 * Ward filter is passed straight into the query, never applied client-side).
 * Ordering is exactly the backend's own `rank` field - never re-sorted here.
 */
function TopPriorityList({
  titleKey,
  variant,
  query,
}: {
  titleKey: MessageKey
  variant: 'preventive' | 'restoration'
  query: UseQueryResult<PriorityPageMeta>
}) {
  const { t } = useI18n()
  const headingId = `top-${variant}-heading`

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2 id={headingId} className="text-mg-title-md font-semibold text-foreground">
        {t(titleKey)}
      </h2>

      {query.isPending ? (
        <LoadingState label={t('data.loading')} />
      ) : query.isError ? (
        <FailureState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState body={t('overview.list.empty')} />
      ) : (
        <div className="overflow-hidden rounded-panel border border-border bg-card">
          <div
            aria-hidden="true"
            className={cn(
              LIST_ROW_GRID,
              'border-b border-border bg-surface-subtle px-4 py-2 text-mg-caption font-medium text-muted-foreground',
            )}
          >
            <span>{t('priority.column.rank')}</span>
            <span className="hidden sm:block">{t('priority.column.waterPoint')}</span>
            <span>{t('priority.column.location')}</span>
            <span className="hidden sm:block">{t('priority.column.condition')}</span>
            <span className="text-end">{t('priority.column.priority')}</span>
          </div>
          <ul className="divide-y divide-border">
            {query.data.items.map((item) => {
              const isPreventive = variant === 'preventive'
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
                      'px-4 py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      accent,
                    )}
                  >
                    <RankBadge rank={item.rank} />
                    <span className="mg-figure hidden truncate text-mg-body-sm font-medium text-foreground sm:block">
                      {item.master_id}
                    </span>
                    <span className="min-w-0 truncate text-mg-caption text-muted-foreground">
                      <span className="mg-figure font-medium text-foreground sm:hidden">
                        {item.master_id}
                      </span>
                      <span className="sm:hidden"> · </span>
                      {formatLocation(item)}
                    </span>
                    <span className="hidden sm:block">
                      {isPreventive ? (
                        riskBandTone(item.risk_band) !== null ? (
                          <SemanticChip kind="risk" tone={riskBandTone(item.risk_band) ?? 'low'} />
                        ) : null
                      ) : (
                        <ObservedStatusChip value={item.observed_status} />
                      )}
                    </span>
                    <span className="mg-figure text-end text-mg-body-sm font-semibold text-foreground">
                      {formatScorePercent(item.priority_score)}
                    </span>
                  </Link>
                </li>
              )
            })}
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
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: RegisterFilters = {
    region: searchParams.get('region'),
    status: null,
    district: searchParams.get('district'),
    ward: searchParams.get('ward'),
  }
  const hasLocationFilter = filters.region !== null

  function setFilters(next: RegisterFilters) {
    const params = new URLSearchParams()
    if (next.region !== null) {
      params.set('region', next.region)
    }
    if (next.district) {
      params.set('district', next.district)
    }
    if (next.ward) {
      params.set('ward', next.ward)
    }
    setSearchParams(params, { replace: true })
  }

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
    >
      <div className="space-y-10">
        {/* 1. Scope */}
        <section aria-labelledby="overview-filters-heading" className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id="overview-filters-heading"
              className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t('overview.filters.label')}
            </h2>
            <Badge variant="outline" className="mg-figure">
              {scopeLabel(filters, t)}
            </Badge>
          </div>
          <RegisterFilterBar value={filters} onChange={setFilters} showStatus={false} />
        </section>

        {/* 2. Where should we act first? - the two pathways, never combined */}
        <section aria-labelledby="decision-heading" className="space-y-4">
          <div className="max-w-[72ch] space-y-1">
            <h2 id="decision-heading" className="text-mg-title-lg font-semibold text-foreground">
              {t('overview.decision.heading')}
            </h2>
            <p className="text-mg-body-sm text-muted-foreground">
              {t('overview.decision.subheading')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DecisionCard variant="preventive" listQuery={preventive} />
            <DecisionCard variant="restoration" listQuery={restoration} />
          </div>
        </section>

        {/* 3. Estate condition */}
        <div className="space-y-6">
        <section aria-labelledby="kpi-functional-heading" className="space-y-3">
          <h2
            id="kpi-functional-heading"
            className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t('overview.kpi.sectionFunctional')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t('dashboard.kpi.total')}
              icon={Droplets}
              state={totals.isPending ? 'loading' : totals.isError ? 'error' : 'ready'}
              value={totals.isSuccess ? formatNumber(totals.data.total) : ''}
              hint={totalHint}
            />
            <KpiCard
              label={observedStatusLabel(FUNCTIONAL_STATUS, t)}
              icon={CircleCheck}
              tone="functional"
              state={statusPending ? 'loading' : 'ready'}
              value={formatNumber(functionalCount)}
              hint={t('dashboard.kpi.functionalHint')}
            />
            <KpiCard
              label={t('overview.kpi.functionalHighRisk')}
              icon={TriangleAlert}
              tone="warning"
              state={functionalHighRiskPending ? 'loading' : functionalHighRiskError ? 'error' : 'ready'}
              value={formatNumber(functionalHighRiskCount)}
              hint={t('overview.kpi.functionalHighRiskHint')}
            />
            <KpiCard
              label={t('overview.kpi.highImpact')}
              icon={Waves}
              tone="info"
              state={highImpactPending ? 'loading' : highImpactError ? 'error' : 'ready'}
              value={formatNumber(highImpactCount)}
              hint={highImpactHint}
            />
          </div>
        </section>

        <section aria-labelledby="kpi-nonfunctional-heading" className="space-y-3">
          <h2
            id="kpi-nonfunctional-heading"
            className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t('overview.kpi.sectionNonFunctional')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard
              label={observedStatusLabel(NON_FUNCTIONAL_STATUS, t)}
              icon={CircleSlash}
              tone="nonfunctional"
              state={statusPending ? 'loading' : 'ready'}
              value={formatNumber(nonFunctionalCount)}
              hint={t('dashboard.kpi.nonFunctionalHint')}
            />
            <KpiCard
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

        {/* 4 & 5. Top priorities, one list per pathway */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TopPriorityList
            titleKey="overview.topPreventive.title"
            variant="preventive"
            query={preventive}
          />
          <TopPriorityList
            titleKey="overview.topRestoration.title"
            variant="restoration"
            query={restoration}
          />
        </div>

        {/* 6. Spatial summary */}
        <OverviewSpatialSummary
          points={spatialPoints}
          total={spatialTotal}
          isPending={spatialPending}
          isError={spatialIsError}
          error={spatialError}
          onRetry={spatialRetry}
          isScoped={hasLocationFilter}
        />
      </div>
    </SectionPage>
  )
}
