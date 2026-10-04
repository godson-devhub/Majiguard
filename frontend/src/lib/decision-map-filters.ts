import { riskBandTone, type RiskTone } from '@/lib/priority-presentation'
import type { MapPointOut } from '@/types/api'

/**
 * The Decision Map's Condition/Risk/Impact/Priority filters.
 *
 * Every predicate here reads an already-stored backend field (`observed_status`,
 * `risk_band`, `impact_score`/`impact_high`, `*_priority_eligible`) - nothing is
 * recomputed, re-thresholded or re-ranked. The one exception is a presentation-only
 * split of "not High" impact points into Medium/Low for the Impact filter's extra
 * granularity; it never touches what counts as High, which stays exactly the
 * backend's own `impact_high` flag (impact_high_threshold_v1, 0.6856).
 */

export type ConditionFilter = 'all' | 'functional' | 'nonfunctional'
export type RiskFilter = 'all' | RiskTone
export type ImpactFilter = 'all' | 'high' | 'moderate' | 'low'

export type DecisionMapFilterState = {
  condition: ConditionFilter
  risk: RiskFilter
  impact: ImpactFilter
  /** HIGH RISK + HIGH IMPACT combined view: eligible for either priority_v2 pathway. */
  priorityView: boolean
}

export const DEFAULT_DECISION_MAP_FILTERS: DecisionMapFilterState = {
  condition: 'all',
  risk: 'all',
  impact: 'all',
  priorityView: false,
}

/** A point's condition group, from its real recorded `observed_status` -
 * never invented for statuses outside the two groups (e.g. "Abandoned"). */
export function conditionGroup(point: MapPointOut): ConditionFilter | null {
  const status = point.observed_status
  if (status === null) {
    return null
  }
  if (status.startsWith('Functional')) {
    return 'functional'
  }
  if (status.startsWith('Non-Functional')) {
    return 'nonfunctional'
  }
  return null
}

/** Medium/Low only ever apply below the backend's own High cutoff; High is
 * always `impact_high` read verbatim. */
export function impactFilterBand(point: MapPointOut): ImpactFilter | null {
  if (point.impact_available !== true || point.impact_score === null) {
    return null
  }
  if (point.impact_high === true) {
    return 'high'
  }
  return point.impact_score >= 0.33 ? 'moderate' : 'low'
}

function priorityEligible(point: MapPointOut): boolean {
  return point.preventive_priority_eligible === true || point.restoration_priority_eligible === true
}

export function applyDecisionMapFilters(
  points: readonly MapPointOut[],
  filters: DecisionMapFilterState,
): MapPointOut[] {
  return points.filter((point) => {
    if (filters.condition !== 'all' && conditionGroup(point) !== filters.condition) {
      return false
    }
    if (filters.risk !== 'all' && riskBandTone(point.risk_band) !== filters.risk) {
      return false
    }
    if (filters.impact !== 'all' && impactFilterBand(point) !== filters.impact) {
      return false
    }
    if (filters.priorityView && !priorityEligible(point)) {
      return false
    }
    return true
  })
}
