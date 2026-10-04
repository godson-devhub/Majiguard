import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { SectionPage } from '@/app/shell/section-page'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { formatNumber } from '@/components/data/format'
import { RegisterFilterBar } from '@/components/data/register-filter-bar'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { preventivePriorityAllQueryOptions, restorationPriorityAllQueryOptions } from '@/hooks/priority'
import {
  mapPointsAllQueryOptions,
  useRegionConditionGroupTotals,
} from '@/hooks/water-points'
import type { MessageKey } from '@/i18n/messages'
import {
  filterPoints,
  groupPointsByArea,
  groupPriorityByArea,
  riskImpactQuadrant,
  type AnalyticsFilterState,
  type AreaBreakdown,
  type AreaMetricKey,
  type ImpactFilterValue,
  type PathwayFilterValue,
  type RiskFilterValue,
} from '@/lib/analytics-aggregation'
import { type ConditionFilter } from '@/lib/decision-map-filters'
import { scopeLabel } from '@/lib/priority-presentation'
import type { RegisterFilters } from '@/lib/register-reference'
import { cn } from '@/lib/utils'

const AREA_TOP_N = 10

/* ------------------------------------------------------------------ *
 * Small, reusable, zero-dependency chart primitives. Every one of these
 * renders real counts handed to it by the caller - none of them fetch,
 * threshold, rank or invent a value themselves.
 * ------------------------------------------------------------------ */

type RankedRow = { area: string; value: number }

/** A ranked horizontal bar list - one real count per location, widths drawn
 * to a shared scale (the top row's value) so magnitude is comparable across
 * rows, not just each row's own share. */
function RankedBarList({
  rows,
  onSelectArea,
  emptyBody,
}: {
  rows: RankedRow[]
  onSelectArea?: (area: string) => void
  emptyBody?: string
}) {
  const { t } = useI18n()
  if (rows.length === 0) {
    return <EmptyState body={emptyBody ?? t('analytics.breakdown.empty')} />
  }
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.area} className="flex items-center gap-3">
          {onSelectArea ? (
            <button
              type="button"
              onClick={() => {
                onSelectArea(row.area)
              }}
              title={row.area}
              className="w-32 shrink-0 truncate text-start text-mg-body-sm font-medium text-primary underline-offset-2 hover:underline sm:w-40"
            >
              {row.area}
            </button>
          ) : (
            <span
              title={row.area}
              className="w-32 shrink-0 truncate text-mg-body-sm font-medium text-foreground sm:w-40"
            >
              {row.area}
            </span>
          )}
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <span className="mg-figure w-14 shrink-0 text-end text-mg-body-sm font-medium text-foreground">
            {formatNumber(row.value)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Chart 1: a two-segment stacked bar per location (Functional / Non-
 * Functional), widths drawn to a shared scale across all rows. */
function ConditionStackedBars({
  rows,
  onSelectArea,
}: {
  rows: { area: string; functional: number; nonFunctional: number }[]
  onSelectArea?: (area: string) => void
}) {
  const { t } = useI18n()
  if (rows.length === 0) {
    return <EmptyState body={t('analytics.breakdown.empty')} />
  }
  const max = Math.max(...rows.map((row) => row.functional + row.nonFunctional), 1)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-mg-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-status-functional" />
          {t('status.functional')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-status-nonfunctional" />
          {t('status.nonfunctional')}
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.area} className="flex items-center gap-3">
            {onSelectArea ? (
              <button
                type="button"
                onClick={() => {
                  onSelectArea(row.area)
                }}
                title={row.area}
                className="w-32 shrink-0 truncate text-start text-mg-body-sm font-medium text-primary underline-offset-2 hover:underline sm:w-40"
              >
                {row.area}
              </button>
            ) : (
              <span
                title={row.area}
                className="w-32 shrink-0 truncate text-mg-body-sm font-medium text-foreground sm:w-40"
              >
                {row.area}
              </span>
            )}
            <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-status-functional" style={{ width: `${(row.functional / max) * 100}%` }} />
              <div
                className="h-full bg-status-nonfunctional"
                style={{ width: `${(row.nonFunctional / max) * 100}%` }}
              />
            </div>
            <span className="mg-figure w-24 shrink-0 text-end text-mg-caption text-foreground">
              {formatNumber(row.functional)} / {formatNumber(row.nonFunctional)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Chart 4: the Risk x Impact relationship as four counted categories - the
 * highest-count cell gets a visibly stronger accent, never a new score. */
function RiskImpactQuadrantGrid({
  highRiskHighImpact,
  highRiskLowerImpact,
  lowerRiskHighImpact,
  lowerRiskLowerImpact,
  total,
}: {
  highRiskHighImpact: number
  highRiskLowerImpact: number
  lowerRiskHighImpact: number
  lowerRiskLowerImpact: number
  total: number
}) {
  const { t } = useI18n()
  const cells = [
    {
      key: 'highHigh',
      label: t('analytics.quadrant.highHigh'),
      value: highRiskHighImpact,
      toneClass: 'border-risk-high bg-risk-high-soft/30',
    },
    {
      key: 'highLow',
      label: t('analytics.quadrant.highLow'),
      value: highRiskLowerImpact,
      toneClass: 'border-status-warning bg-status-warning-soft/25',
    },
    {
      key: 'lowHigh',
      label: t('analytics.quadrant.lowHigh'),
      value: lowerRiskHighImpact,
      toneClass: 'border-status-warning bg-status-warning-soft/25',
    },
    {
      key: 'lowLow',
      label: t('analytics.quadrant.lowLow'),
      value: lowerRiskLowerImpact,
      toneClass: 'border-border bg-muted/30',
    },
  ]
  const maxValue = Math.max(highRiskHighImpact, highRiskLowerImpact, lowerRiskHighImpact, lowerRiskLowerImpact)

  return (
    <div className="grid grid-cols-2 gap-3">
      {cells.map((cell) => {
        const share = total > 0 ? Math.round((cell.value / total) * 1000) / 10 : 0
        const isTop = cell.value === maxValue && cell.value > 0
        return (
          <div
            key={cell.key}
            className={cn(
              'rounded-md border p-4 transition-colors',
              cell.toneClass,
              isTop && 'ring-2 ring-risk-high ring-offset-1 ring-offset-background',
            )}
          >
            <p className="text-mg-caption font-medium text-muted-foreground">{cell.label}</p>
            <p className="mg-figure mt-1 text-mg-title-lg font-semibold text-foreground">
              {formatNumber(cell.value)}
            </p>
            <p className="text-mg-caption text-muted-foreground">{share}%</p>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * The Analytics page itself.
 * ------------------------------------------------------------------ */

const RISK_FILTER_VALUES: RiskFilterValue[] = ['all', 'high', 'lower']
const IMPACT_FILTER_VALUES: ImpactFilterValue[] = ['all', 'high', 'lower']
const PATHWAY_FILTER_VALUES: PathwayFilterValue[] = ['all', 'preventive', 'restoration']

const RANKING_METRICS: AreaMetricKey[] = [
  'nonFunctional',
  'highRisk',
  'highImpact',
  'functionalHighRisk',
  'highImpactNonFunctional',
  'preventiveEligible',
  'restorationEligible',
  'total',
]

/** The metrics computable without selecting a Region - safe, count-only
 * national data (see `useRegionConditionGroupTotals` and the Priority
 * Engine's own, separately-paginating endpoints). Everything else needs
 * row-level data, which is only ever fetched once a Region narrows the
 * estate (see the module docstring below). */
const NATIONAL_SAFE_METRICS = new Set<AreaMetricKey>(['nonFunctional', 'total', 'preventiveEligible', 'restorationEligible'])

const METRIC_ACCESSOR: Record<AreaMetricKey, (row: AreaBreakdown) => number> = {
  total: (row) => row.total,
  nonFunctional: (row) => row.nonFunctional,
  highRisk: (row) => row.highRisk,
  highImpact: (row) => row.highImpact,
  functionalHighRisk: (row) => row.functionalHighRisk,
  highImpactNonFunctional: (row) => row.highImpactNonFunctional,
  preventiveEligible: (row) => row.preventiveEligible,
  restorationEligible: (row) => row.restorationEligible,
}

const METRIC_LABEL_KEY: Record<AreaMetricKey, MessageKey> = {
  total: 'analytics.ranking.metric.total',
  nonFunctional: 'analytics.ranking.metric.nonFunctional',
  highRisk: 'analytics.ranking.metric.highRisk',
  highImpact: 'analytics.ranking.metric.highImpact',
  functionalHighRisk: 'analytics.ranking.metric.functionalHighRisk',
  highImpactNonFunctional: 'analytics.ranking.metric.highImpactNonFunctional',
  preventiveEligible: 'analytics.ranking.metric.preventiveEligible',
  restorationEligible: 'analytics.ranking.metric.restorationEligible',
}

function isAreaMetricKey(value: string | null): value is AreaMetricKey {
  return value !== null && (RANKING_METRICS as string[]).includes(value)
}

/**
 * Analytics: comparisons, distributions, rankings and relationships across
 * Location x Condition x Risk x Impact x Priority - deliberately not a
 * second Overview. Every chart answers one operational question from
 * already-stored backend fields (`observed_status`, `risk_band`,
 * `impact_high`, `preventive_priority_eligible`, `restoration_priority_eligible`);
 * nothing here recomputes `priority_v2`, the risk model or the impact
 * classification, and no new combined score is introduced (see
 * `src/lib/analytics-aggregation.ts`'s module docstring).
 *
 * Deliberate scale limit, reported rather than patched: the register's
 * `GET /water-points/map` endpoint hangs past `page=1` at national scale (a
 * frozen-backend fault, confirmed directly against it). Row-level charts
 * (Risk, Impact, Risk x Impact, Functional risk, High-impact Non-Functional,
 * and the risk/impact-dependent rankings) therefore require a Region first,
 * where the scoped fetch stays inside one or a few pages - the same
 * precedent Overview and the Decision Map already rely on for a location
 * filter. Condition-by-location and Preventive/Restoration-by-location stay
 * available nationally because they are answerable from safe, count-only
 * per-region queries and the Priority Engine's own endpoints (confirmed to
 * paginate correctly, unlike the map endpoint).
 */
export function AnalyticsRoute() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()

  const locationFilters: RegisterFilters = {
    region: searchParams.get('region'),
    status: null,
    district: searchParams.get('district'),
    ward: searchParams.get('ward'),
  }
  const conditionParam = searchParams.get('condition')
  const condition: ConditionFilter =
    conditionParam === 'functional' || conditionParam === 'nonfunctional' ? conditionParam : 'all'
  const riskParam = searchParams.get('risk')
  const risk: RiskFilterValue = riskParam === 'high' || riskParam === 'lower' ? riskParam : 'all'
  const impactParam = searchParams.get('impact')
  const impact: ImpactFilterValue = impactParam === 'high' || impactParam === 'lower' ? impactParam : 'all'
  const pathwayParam = searchParams.get('pathway')
  const pathway: PathwayFilterValue =
    pathwayParam === 'preventive' || pathwayParam === 'restoration' ? pathwayParam : 'all'
  const rankParam = searchParams.get('rank')
  const rankingMetric: AreaMetricKey = isAreaMetricKey(rankParam) ? rankParam : 'nonFunctional'

  const analyticsFilters: AnalyticsFilterState = { condition, risk, impact, pathway }

  const hasRegion = locationFilters.region !== null
  const hasDistrict = Boolean(locationFilters.district)

  const level: 'region' | 'district' | 'ward' = hasDistrict ? 'ward' : hasRegion ? 'district' : 'region'
  const breakdownField: 'nbs_region' | 'nbs_district' | 'nbs_ward' =
    level === 'region' ? 'nbs_region' : level === 'district' ? 'nbs_district' : 'nbs_ward'
  const priorityAreaField: 'region' | 'district' | 'ward' = level

  function buildParams(overrides: {
    location?: RegisterFilters
    condition?: ConditionFilter
    risk?: RiskFilterValue
    impact?: ImpactFilterValue
    pathway?: PathwayFilterValue
    rank?: AreaMetricKey
  }): URLSearchParams {
    const nextLocation = overrides.location ?? locationFilters
    const nextCondition = overrides.condition ?? condition
    const nextRisk = overrides.risk ?? risk
    const nextImpact = overrides.impact ?? impact
    const nextPathway = overrides.pathway ?? pathway
    const nextRank = overrides.rank ?? rankingMetric

    const params = new URLSearchParams()
    if (nextLocation.region !== null) params.set('region', nextLocation.region)
    if (nextLocation.district) params.set('district', nextLocation.district)
    if (nextLocation.ward) params.set('ward', nextLocation.ward)
    if (nextCondition !== 'all') params.set('condition', nextCondition)
    if (nextRisk !== 'all') params.set('risk', nextRisk)
    if (nextImpact !== 'all') params.set('impact', nextImpact)
    if (nextPathway !== 'all') params.set('pathway', nextPathway)
    if (nextRank !== 'nonFunctional') params.set('rank', nextRank)
    return params
  }

  function setLocationFilters(next: RegisterFilters) {
    setSearchParams(buildParams({ location: next }), { replace: true })
  }
  function setCondition(next: ConditionFilter) {
    setSearchParams(buildParams({ condition: next }), { replace: true })
  }
  function setRisk(next: RiskFilterValue) {
    setSearchParams(buildParams({ risk: next }), { replace: true })
  }
  function setImpact(next: ImpactFilterValue) {
    setSearchParams(buildParams({ impact: next }), { replace: true })
  }
  function setPathway(next: PathwayFilterValue) {
    setSearchParams(buildParams({ pathway: next }), { replace: true })
  }
  function setRankingMetric(next: AreaMetricKey) {
    setSearchParams(buildParams({ rank: next }), { replace: true })
  }
  function drillToRegion(region: string) {
    setSearchParams(buildParams({ location: { region, status: null, district: null, ward: null } }), {
      replace: true,
    })
  }
  function drillToDistrict(district: string) {
    setSearchParams(buildParams({ location: { ...locationFilters, district, ward: null } }), { replace: true })
  }
  function drillToWard(ward: string) {
    setSearchParams(buildParams({ location: { ...locationFilters, ward } }), { replace: true })
  }
  function drillTo(area: string) {
    if (level === 'region') drillToRegion(area)
    else if (level === 'district') drillToDistrict(area)
    else drillToWard(area)
  }

  // --- National-safe data sources (no row-level fetch). Disabled once a
  // Region is selected: nothing reads this national-scope data in that case
  // (see the `hasRegion` branches below), so there is no reason to keep
  // firing its ~70 count requests while a Region-scoped view is loading.
  const nationalConditionTotals = useRegionConditionGroupTotals(!hasRegion)
  const preventiveAll = useQuery(
    preventivePriorityAllQueryOptions({
      nbs_region: locationFilters.region,
      nbs_district: locationFilters.district,
      nbs_ward: locationFilters.ward,
    }),
  )
  const restorationAll = useQuery(
    restorationPriorityAllQueryOptions({
      nbs_region: locationFilters.region,
      nbs_district: locationFilters.district,
      nbs_ward: locationFilters.ward,
    }),
  )

  // --- Row-level data, only ever fetched once a Region narrows the scope ---
  // (see `mapPointsAllQueryOptions`'s own docstring for why its page size is
  // left at the existing 500, not reduced for this call)
  const scopedMapPoints = useQuery({
    ...mapPointsAllQueryOptions({
      nbs_region: locationFilters.region,
      nbs_district: locationFilters.district,
      nbs_ward: locationFilters.ward,
    }),
    enabled: hasRegion,
  })

  const scopedItems = scopedMapPoints.data?.items ?? []
  const filteredItems = filterPoints(scopedItems, analyticsFilters)
  const areaRows = hasRegion ? groupPointsByArea(filteredItems, breakdownField) : []
  const quadrant = riskImpactQuadrant(filteredItems)

  // --- Chart 1: Condition by location ---
  const conditionRows = hasRegion
    ? areaRows
        .map((row) => ({ area: row.area, functional: row.functional, nonFunctional: row.nonFunctional }))
        .toSorted((a, b) => b.nonFunctional - a.nonFunctional)
        .slice(0, AREA_TOP_N)
    : nationalConditionTotals
        .filter((row) => row.functional !== null && row.nonFunctional !== null)
        .map((row) => ({ area: row.region, functional: row.functional ?? 0, nonFunctional: row.nonFunctional ?? 0 }))
        .toSorted((a, b) => b.nonFunctional - a.nonFunctional)
        .slice(0, AREA_TOP_N)
  const conditionPending = hasRegion
    ? scopedMapPoints.isPending
    : nationalConditionTotals.some((row) => row.isPending)

  // --- Chart 7: Preventive vs Restoration by location ---
  const showPreventiveSide = condition !== 'nonfunctional' && pathway !== 'restoration'
  const showRestorationSide = condition !== 'functional' && pathway !== 'preventive'
  const preventiveAreaRows = groupPriorityByArea(preventiveAll.data?.items ?? [], priorityAreaField)
    .map((row) => ({ area: row.area, value: row.count }))
    .slice(0, AREA_TOP_N)
  const restorationAreaRows = groupPriorityByArea(restorationAll.data?.items ?? [], priorityAreaField)
    .map((row) => ({ area: row.area, value: row.count }))
    .slice(0, AREA_TOP_N)

  // --- Chart 8: Location ranking ---
  const rankingAvailable = hasRegion || NATIONAL_SAFE_METRICS.has(rankingMetric)
  const rankingRows: RankedRow[] = !rankingAvailable
    ? []
    : hasRegion
      ? areaRows
          .map((row) => ({ area: row.area, value: METRIC_ACCESSOR[rankingMetric](row) }))
          .toSorted((a, b) => b.value - a.value)
          .slice(0, AREA_TOP_N)
      : rankingMetric === 'preventiveEligible'
        ? preventiveAreaRows.toSorted((a, b) => b.value - a.value)
        : rankingMetric === 'restorationEligible'
          ? restorationAreaRows.toSorted((a, b) => b.value - a.value)
          : nationalConditionTotals
              .filter((row) => row.total !== null && row.nonFunctional !== null)
              .map((row) => ({
                area: row.region,
                value: rankingMetric === 'total' ? (row.total ?? 0) : (row.nonFunctional ?? 0),
              }))
              .toSorted((a, b) => b.value - a.value)
              .slice(0, AREA_TOP_N)

  const rankingPending = !rankingAvailable
    ? false
    : hasRegion
      ? scopedMapPoints.isPending
      : rankingMetric === 'preventiveEligible'
        ? preventiveAll.isPending
        : rankingMetric === 'restorationEligible'
          ? restorationAll.isPending
          : nationalConditionTotals.some((row) => row.isPending)

  const topRanked = rankingRows[0] ?? null
  const scopeBadge = scopeLabel(locationFilters, t)
  const levelLabel = t(level === 'region' ? 'analytics.level.region' : level === 'district' ? 'analytics.level.district' : 'analytics.level.ward')

  return (
    <SectionPage
      titleKey="page.analytics.title"
      descriptionKey="page.analytics.body"
      eyebrowKey="page.analytics.eyebrow"
      sourceNote={t('data.source')}
    >
      <div className="space-y-10">
        {/* Filters */}
        <section aria-labelledby="analytics-filters-heading" className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2
              id="analytics-filters-heading"
              className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t('overview.filters.label')}
            </h2>
            <Badge variant="outline" className="mg-figure border-sidebar-border bg-sidebar text-sidebar-accent-foreground">
              {scopeBadge}
            </Badge>
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <RegisterFilterBar value={locationFilters} onChange={setLocationFilters} showStatus={false} />

            <div className="flex flex-col gap-1">
              <Label htmlFor="analytics-condition" className="text-mg-caption font-medium text-muted-foreground">
                {t('analytics.condition.label')}
              </Label>
              <select
                id="analytics-condition"
                value={condition}
                onChange={(event) => setCondition(event.target.value as ConditionFilter)}
                className="h-9 min-w-[9rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
              >
                <option value="all">{t('map.filter.condition.all')}</option>
                <option value="functional">{t('map.filter.condition.functional')}</option>
                <option value="nonfunctional">{t('map.filter.condition.nonfunctional')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="analytics-risk" className="text-mg-caption font-medium text-muted-foreground">
                {t('analytics.filter.risk.label')}
              </Label>
              <select
                id="analytics-risk"
                value={risk}
                onChange={(event) => setRisk(event.target.value as RiskFilterValue)}
                className="h-9 min-w-[9rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
              >
                {RISK_FILTER_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(`analytics.filter.risk.${value}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="analytics-impact" className="text-mg-caption font-medium text-muted-foreground">
                {t('analytics.filter.impact.label')}
              </Label>
              <select
                id="analytics-impact"
                value={impact}
                onChange={(event) => setImpact(event.target.value as ImpactFilterValue)}
                className="h-9 min-w-[9rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
              >
                {IMPACT_FILTER_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(`analytics.filter.impact.${value}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="analytics-pathway" className="text-mg-caption font-medium text-muted-foreground">
                {t('analytics.filter.pathway.label')}
              </Label>
              <select
                id="analytics-pathway"
                value={pathway}
                onChange={(event) => setPathway(event.target.value as PathwayFilterValue)}
                className="h-9 min-w-[9rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
              >
                {PATHWAY_FILTER_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {t(`analytics.filter.pathway.${value}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!hasRegion ? <p className="max-w-[72ch] text-mg-caption text-muted-foreground">{t('analytics.scope.nationalNotice')}</p> : null}
        </section>

        {/* Chart 1: Condition by location */}
        <section aria-labelledby="chart-condition-heading" className="space-y-3 border-t border-border pt-8">
          <div>
            <h2 id="chart-condition-heading" className="text-mg-title-md font-semibold text-foreground">
              {t('analytics.chart.condition.title')} — {levelLabel}
            </h2>
            <p className="max-w-[68ch] text-mg-body-sm text-muted-foreground">{t('analytics.chart.condition.body')}</p>
          </div>
          {conditionPending ? (
            <LoadingState label={t('data.loading')} />
          ) : (
            <ConditionStackedBars rows={conditionRows} onSelectArea={level === 'ward' ? undefined : drillTo} />
          )}
        </section>

        {/* Charts 2-6: row-level breakdowns. Each always shows its own
            title/question; the body is a "select a Region" prompt until
            `hasRegion` makes the scoped, row-level fetch safe (see the
            module docstring above for why national scope cannot). */}
        <section aria-labelledby="chart-risk-heading" className="space-y-3 border-t border-border pt-8">
          <div>
            <h2 id="chart-risk-heading" className="text-mg-title-md font-semibold text-foreground">
              {t('analytics.chart.risk.title')}
              {hasRegion ? ` — ${levelLabel}` : ''}
            </h2>
            <p className="max-w-[68ch] text-mg-body-sm text-muted-foreground">{t('analytics.chart.risk.body')}</p>
          </div>
          {!hasRegion ? (
            <EmptyState body={t('analytics.scope.selectRegionPrompt')} />
          ) : scopedMapPoints.isPending ? (
            <LoadingState label={t('data.loading')} />
          ) : scopedMapPoints.isError ? (
            <FailureState error={scopedMapPoints.error} onRetry={() => void scopedMapPoints.refetch()} />
          ) : (
            <RankedBarList
              rows={areaRows
                .map((row) => ({ area: row.area, value: row.highRisk }))
                .toSorted((a, b) => b.value - a.value)
                .slice(0, AREA_TOP_N)}
              onSelectArea={level === 'ward' ? undefined : drillTo}
            />
          )}
        </section>

        <section aria-labelledby="chart-impact-heading" className="space-y-3 border-t border-border pt-8">
          <div>
            <h2 id="chart-impact-heading" className="text-mg-title-md font-semibold text-foreground">
              {t('analytics.chart.impact.title')}
              {hasRegion ? ` — ${levelLabel}` : ''}
            </h2>
            <p className="max-w-[68ch] text-mg-body-sm text-muted-foreground">{t('analytics.chart.impact.body')}</p>
          </div>
          {!hasRegion ? (
            <EmptyState body={t('analytics.scope.selectRegionPrompt')} />
          ) : scopedMapPoints.isPending ? (
            <LoadingState label={t('data.loading')} />
          ) : scopedMapPoints.isError ? (
            <FailureState error={scopedMapPoints.error} onRetry={() => void scopedMapPoints.refetch()} />
          ) : (
            <RankedBarList
              rows={areaRows
                .map((row) => ({ area: row.area, value: row.highImpact }))
                .toSorted((a, b) => b.value - a.value)
                .slice(0, AREA_TOP_N)}
              onSelectArea={level === 'ward' ? undefined : drillTo}
            />
          )}
        </section>

        <section aria-labelledby="chart-quadrant-heading" className="space-y-3 border-t border-border pt-8">
          <div>
            <h2 id="chart-quadrant-heading" className="text-mg-title-md font-semibold text-foreground">
              {t('analytics.chart.quadrant.title')}
            </h2>
            <p className="max-w-[68ch] text-mg-body-sm text-muted-foreground">{t('analytics.chart.quadrant.body')}</p>
          </div>
          {!hasRegion ? (
            <EmptyState body={t('analytics.scope.selectRegionPrompt')} />
          ) : scopedMapPoints.isPending ? (
            <LoadingState label={t('data.loading')} />
          ) : scopedMapPoints.isError ? (
            <FailureState error={scopedMapPoints.error} onRetry={() => void scopedMapPoints.refetch()} />
          ) : (
            <RiskImpactQuadrantGrid
              highRiskHighImpact={quadrant.highRiskHighImpact}
              highRiskLowerImpact={quadrant.highRiskLowerImpact}
              lowerRiskHighImpact={quadrant.lowerRiskHighImpact}
              lowerRiskLowerImpact={quadrant.lowerRiskLowerImpact}
              total={quadrant.total}
            />
          )}
        </section>

        <section aria-labelledby="chart-functional-risk-heading" className="space-y-3 border-t border-border pt-8">
          <div>
            <h2 id="chart-functional-risk-heading" className="text-mg-title-md font-semibold text-foreground">
              {t('analytics.chart.functionalRisk.title')}
              {hasRegion ? ` — ${levelLabel}` : ''}
            </h2>
            <p className="max-w-[68ch] text-mg-body-sm text-muted-foreground">
              {t('analytics.chart.functionalRisk.body')}
            </p>
          </div>
          {!hasRegion ? (
            <EmptyState body={t('analytics.scope.selectRegionPrompt')} />
          ) : scopedMapPoints.isPending ? (
            <LoadingState label={t('data.loading')} />
          ) : scopedMapPoints.isError ? (
            <FailureState error={scopedMapPoints.error} onRetry={() => void scopedMapPoints.refetch()} />
          ) : (
            <RankedBarList
              rows={areaRows
                .map((row) => ({ area: row.area, value: row.functionalHighRisk }))
                .toSorted((a, b) => b.value - a.value)
                .slice(0, AREA_TOP_N)}
              onSelectArea={level === 'ward' ? undefined : drillTo}
            />
          )}
        </section>

        <section
          aria-labelledby="chart-high-impact-nonfunctional-heading"
          className="space-y-3 border-t border-border pt-8"
        >
          <div>
            <h2 id="chart-high-impact-nonfunctional-heading" className="text-mg-title-md font-semibold text-foreground">
              {t('analytics.chart.highImpactNonFunctional.title')}
              {hasRegion ? ` — ${levelLabel}` : ''}
            </h2>
            <p className="max-w-[68ch] text-mg-body-sm text-muted-foreground">
              {t('analytics.chart.highImpactNonFunctional.body')}
            </p>
          </div>
          {!hasRegion ? (
            <EmptyState body={t('analytics.scope.selectRegionPrompt')} />
          ) : scopedMapPoints.isPending ? (
            <LoadingState label={t('data.loading')} />
          ) : scopedMapPoints.isError ? (
            <FailureState error={scopedMapPoints.error} onRetry={() => void scopedMapPoints.refetch()} />
          ) : (
            <RankedBarList
              rows={areaRows
                .map((row) => ({ area: row.area, value: row.highImpactNonFunctional }))
                .toSorted((a, b) => b.value - a.value)
                .slice(0, AREA_TOP_N)}
              onSelectArea={level === 'ward' ? undefined : drillTo}
            />
          )}
        </section>

        {/* Chart 7: Preventive vs Restoration */}
        <section aria-labelledby="chart-pathway-heading" className="space-y-3 border-t border-border pt-8">
          <div>
            <h2 id="chart-pathway-heading" className="text-mg-title-md font-semibold text-foreground">
              {t('analytics.chart.pathway.title')} — {levelLabel}
            </h2>
            <p className="max-w-[68ch] text-mg-body-sm text-muted-foreground">{t('analytics.chart.pathway.body')}</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {showPreventiveSide ? (
              <div className="space-y-2">
                <h3 className="text-mg-body-sm font-semibold text-foreground">{t('overview.preventive.title')}</h3>
                {preventiveAll.isPending ? (
                  <LoadingState label={t('data.loading')} />
                ) : preventiveAll.isError ? (
                  <FailureState error={preventiveAll.error} onRetry={() => void preventiveAll.refetch()} />
                ) : (
                  <>
                    <p className="mg-figure text-mg-caption text-muted-foreground">
                      {t(hasRegion ? 'analytics.priority.eligibleScoped' : 'analytics.priority.eligible', {
                        count: formatNumber(preventiveAll.data.total),
                      })}
                    </p>
                    <RankedBarList rows={preventiveAreaRows} emptyBody={t('analytics.priority.empty')} />
                  </>
                )}
              </div>
            ) : null}
            {showRestorationSide ? (
              <div className="space-y-2">
                <h3 className="text-mg-body-sm font-semibold text-foreground">{t('overview.restoration.title')}</h3>
                {restorationAll.isPending ? (
                  <LoadingState label={t('data.loading')} />
                ) : restorationAll.isError ? (
                  <FailureState error={restorationAll.error} onRetry={() => void restorationAll.refetch()} />
                ) : (
                  <>
                    <p className="mg-figure text-mg-caption text-muted-foreground">
                      {t(hasRegion ? 'analytics.priority.eligibleScoped' : 'analytics.priority.eligible', {
                        count: formatNumber(restorationAll.data.total),
                      })}
                    </p>
                    <RankedBarList rows={restorationAreaRows} emptyBody={t('analytics.priority.empty')} />
                  </>
                )}
              </div>
            ) : null}
          </div>
        </section>

        {/* Chart 8: Location ranking */}
        <section aria-labelledby="chart-ranking-heading" className="space-y-3 border-t border-border pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="chart-ranking-heading" className="text-mg-title-md font-semibold text-foreground">
                {t('analytics.chart.ranking.title')} — {levelLabel}
              </h2>
              <p className="max-w-[68ch] text-mg-body-sm text-muted-foreground">{t('analytics.chart.ranking.body')}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="analytics-ranking-metric" className="text-mg-caption font-medium text-muted-foreground">
                {t('analytics.ranking.metric.label')}
              </Label>
              <select
                id="analytics-ranking-metric"
                value={rankingMetric}
                onChange={(event) => setRankingMetric(event.target.value as AreaMetricKey)}
                className="h-9 min-w-[14rem] rounded-sm border border-input bg-background px-2.5 text-mg-body-sm text-foreground"
              >
                {RANKING_METRICS.map((metric) => {
                  const disabled = !hasRegion && !NATIONAL_SAFE_METRICS.has(metric)
                  return (
                    <option key={metric} value={metric} disabled={disabled}>
                      {t(METRIC_LABEL_KEY[metric])}
                      {disabled ? ` (${t('analytics.ranking.needsRegion')})` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
          <h3 className="text-mg-caption font-semibold uppercase tracking-wider text-muted-foreground">
            {t('analytics.ranking.heading', { metric: t(METRIC_LABEL_KEY[rankingMetric]) })}
          </h3>
          {!rankingAvailable ? (
            <EmptyState body={t('analytics.scope.selectRegionPrompt')} />
          ) : rankingPending ? (
            <LoadingState label={t('data.loading')} />
          ) : (
            <RankedBarList rows={rankingRows} onSelectArea={level === 'ward' ? undefined : drillTo} />
          )}
        </section>

        {/* Decision-oriented insight, derived from the current ranking above */}
        {topRanked !== null ? (
          <p className="max-w-[68ch] border-t border-border pt-6 text-mg-body text-foreground">
            {t('analytics.insight.top', {
              area: topRanked.area,
              metric: t(METRIC_LABEL_KEY[rankingMetric]),
              value: formatNumber(topRanked.value),
            })}
          </p>
        ) : null}
      </div>
    </SectionPage>
  )
}
