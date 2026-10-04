import { conditionGroup, type ConditionFilter } from '@/lib/decision-map-filters'
import { riskBandTone } from '@/lib/priority-presentation'
import type { MapPointOut, PriorityItemOut } from '@/types/api'

/**
 * Pure, presentation-only aggregation over an already-fetched set of real
 * records for the Analytics page.
 *
 * Every function here only counts or groups fields the backend already
 * computed and stored (`observed_status`, `risk_band`, `impact_high`,
 * `preventive_priority_eligible`, `restoration_priority_eligible`, `region`/
 * `district`/`ward`). Nothing is scored, thresholded, ranked or reclassified -
 * nothing here replaces or recomputes `priority_v2`, the risk model, or the
 * impact classification. Risk and Impact are deliberately binary here (High /
 * Lower) per the Analytics brief - a coarser, comparison-oriented framing
 * than the Decision Map's four-tone risk legend, built from the exact same
 * underlying fields (`riskBandTone`, `impact_high`).
 */

export type RiskGroup = 'high' | 'lower'

/** High is exactly `riskBandTone(point.risk_band) === 'high'` (the frozen
 * model's own "Non-Functional / High Risk" band); everything else - moderate,
 * low, or not yet assessed - is "lower". No new threshold. */
export function riskGroup(point: MapPointOut): RiskGroup {
  return riskBandTone(point.risk_band) === 'high' ? 'high' : 'lower'
}

export type ImpactGroup = 'high' | 'lower'

/** High is exactly the backend's own `impact_high` flag
 * (impact_high_threshold_v1, 0.6856). No new threshold. */
export function impactGroup(point: MapPointOut): ImpactGroup {
  return point.impact_high === true ? 'high' : 'lower'
}

export type RiskFilterValue = 'all' | RiskGroup
export type ImpactFilterValue = 'all' | ImpactGroup
export type PathwayFilterValue = 'all' | 'preventive' | 'restoration'

export type AnalyticsFilterState = {
  condition: ConditionFilter
  risk: RiskFilterValue
  impact: ImpactFilterValue
  pathway: PathwayFilterValue
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  condition: 'all',
  risk: 'all',
  impact: 'all',
  pathway: 'all',
}

/** The single predicate every Analytics chart filters through - one
 * definition, so no two charts can silently disagree about what "High Risk"
 * or "Preventive" means for the current filter selection. */
export function matchesAnalyticsFilters(point: MapPointOut, filters: AnalyticsFilterState): boolean {
  if (filters.condition !== 'all' && conditionGroup(point) !== filters.condition) {
    return false
  }
  if (filters.risk !== 'all' && riskGroup(point) !== filters.risk) {
    return false
  }
  if (filters.impact !== 'all' && impactGroup(point) !== filters.impact) {
    return false
  }
  if (filters.pathway === 'preventive' && point.preventive_priority_eligible !== true) {
    return false
  }
  if (filters.pathway === 'restoration' && point.restoration_priority_eligible !== true) {
    return false
  }
  return true
}

export function filterPoints(
  points: readonly MapPointOut[],
  filters: AnalyticsFilterState,
): MapPointOut[] {
  return points.filter((point) => matchesAnalyticsFilters(point, filters))
}

export type AreaField = 'nbs_region' | 'nbs_district' | 'nbs_ward'

export type AreaBreakdown = {
  area: string
  total: number
  functional: number
  nonFunctional: number
  /** All points (any condition) in the High Risk group. */
  highRisk: number
  lowerRisk: number
  /** All points (any condition) in the High Impact group. */
  highImpact: number
  lowerImpact: number
  /** Functional points only, split by risk - the preventive-pathway lens. */
  functionalHighRisk: number
  functionalLowerRisk: number
  /** Non-Functional, High Impact - the restoration-pathway lens. */
  highImpactNonFunctional: number
  preventiveEligible: number
  restorationEligible: number
}

function emptyBreakdown(area: string): AreaBreakdown {
  return {
    area,
    total: 0,
    functional: 0,
    nonFunctional: 0,
    highRisk: 0,
    lowerRisk: 0,
    highImpact: 0,
    lowerImpact: 0,
    functionalHighRisk: 0,
    functionalLowerRisk: 0,
    highImpactNonFunctional: 0,
    preventiveEligible: 0,
    restorationEligible: 0,
  }
}

/** Groups an already-fetched, already-filtered set of water points by one
 * administrative field, tallying every measure the Analytics charts need.
 * Points with no recorded value for `field` are omitted - never bucketed
 * under an invented "Unknown" area. Callers apply `filterPoints` first; this
 * function only tallies what it is given. */
export function groupPointsByArea(points: readonly MapPointOut[], field: AreaField): AreaBreakdown[] {
  const rows = new Map<string, AreaBreakdown>()
  for (const point of points) {
    const area = point[field]
    if (area === null) {
      continue
    }
    const row = rows.get(area) ?? emptyBreakdown(area)
    row.total += 1

    const group = conditionGroup(point)
    if (group === 'functional') row.functional += 1
    if (group === 'nonfunctional') row.nonFunctional += 1

    const risk = riskGroup(point)
    if (risk === 'high') row.highRisk += 1
    else row.lowerRisk += 1

    const impact = impactGroup(point)
    if (impact === 'high') row.highImpact += 1
    else row.lowerImpact += 1

    if (group === 'functional') {
      if (risk === 'high') row.functionalHighRisk += 1
      else row.functionalLowerRisk += 1
    }
    if (group === 'nonfunctional' && impact === 'high') {
      row.highImpactNonFunctional += 1
    }
    if (point.preventive_priority_eligible === true) row.preventiveEligible += 1
    if (point.restoration_priority_eligible === true) row.restorationEligible += 1

    rows.set(area, row)
  }
  return [...rows.values()]
}

export type RiskImpactQuadrant = {
  highRiskHighImpact: number
  highRiskLowerImpact: number
  lowerRiskHighImpact: number
  lowerRiskLowerImpact: number
  total: number
}

/** The Risk x Impact relationship for an already-filtered set of points -
 * four categories from the two existing binary groups above, nothing
 * recomputed or combined into a new score. */
export function riskImpactQuadrant(points: readonly MapPointOut[]): RiskImpactQuadrant {
  let highRiskHighImpact = 0
  let highRiskLowerImpact = 0
  let lowerRiskHighImpact = 0
  let lowerRiskLowerImpact = 0
  for (const point of points) {
    const risk = riskGroup(point)
    const impact = impactGroup(point)
    if (risk === 'high' && impact === 'high') highRiskHighImpact += 1
    else if (risk === 'high') highRiskLowerImpact += 1
    else if (impact === 'high') lowerRiskHighImpact += 1
    else lowerRiskLowerImpact += 1
  }
  return {
    highRiskHighImpact,
    highRiskLowerImpact,
    lowerRiskHighImpact,
    lowerRiskLowerImpact,
    total: points.length,
  }
}

export type PriorityAreaBreakdown = {
  area: string
  count: number
}

/** Groups an already-fetched, complete priority pathway pool (preventive or
 * restoration, from `*PriorityAllQueryOptions`) by one location field, for a
 * geographic-concentration ranking. Counts eligible points only - every row
 * in the input is already eligible for its pathway by construction (that is
 * what the Priority Engine endpoint returns). `rank`/`priority_score` are
 * never touched here. */
export function groupPriorityByArea(
  items: readonly PriorityItemOut[],
  field: 'region' | 'district' | 'ward',
): PriorityAreaBreakdown[] {
  const rows = new Map<string, number>()
  for (const item of items) {
    const area = item[field]
    if (area === null) {
      continue
    }
    rows.set(area, (rows.get(area) ?? 0) + 1)
  }
  return [...rows.entries()]
    .map(([area, count]) => ({ area, count }))
    .toSorted((a, b) => b.count - a.count)
}

/** The metrics `groupPointsByArea` produces that are safe to rank by once a
 * location scope is set (every one needs row-level data). */
export type AreaMetricKey =
  | 'total'
  | 'nonFunctional'
  | 'highRisk'
  | 'highImpact'
  | 'functionalHighRisk'
  | 'highImpactNonFunctional'
  | 'preventiveEligible'
  | 'restorationEligible'
