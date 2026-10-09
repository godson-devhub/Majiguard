import { useQuery } from '@tanstack/react-query'

import {
  mapPointsAllQueryOptions,
  mapPointsQueryOptions,
  useObservedStatusSummary,
  useWaterPointListQuery,
} from '@/hooks/water-points'
import { usePrioritySummaryQuery } from '@/hooks/priority'
import { OBSERVED_STATUS_VALUES } from '@/lib/register-reference'

/**
 * The estate-condition KPI figures shared by Overview and Analytics - one
 * business definition, read once here, so the two screens can never drift
 * apart on what "Functional, high risk" or "High Impact" means. Nothing is
 * computed, ranked, banded or invented: every figure is either the backend's
 * own national summary field, a backend-filtered list count, or a tally of an
 * already-stored field across an already-fetched, complete scoped estate.
 */

/** Bounded, cheap sample for the *unfiltered* (national) view - never the
 * whole 17,518-point estate (see `mapPointsAllQueryOptions`'s own note on the
 * backend's page>1 pagination fault at national scale). Honest about being a
 * sample via its caption wherever it is rendered. */
export const NATIONAL_SAMPLE_PAGE_SIZE = 500

export const FUNCTIONAL_STATUS = OBSERVED_STATUS_VALUES[0]
export const NON_FUNCTIONAL_STATUS = OBSERVED_STATUS_VALUES[3]
const HIGH_RISK_BAND = 'Non-Functional / High Risk'

export type EstateScope = {
  region: string | null
  district?: string | null
  ward?: string | null
}

export function useEstateKpis(scope: EstateScope) {
  const region = scope.region
  const district = scope.district ?? null
  const ward = scope.ward ?? null
  const hasLocationFilter = region !== null

  const totals = useWaterPointListQuery({
    page: 1,
    page_size: 1,
    nbs_region: region,
    nbs_district: district,
    nbs_ward: ward,
  })
  // Only the two statuses this screen reads: 2 requests instead of 7, and
  // the KPI row no longer waits on five counts it never shows.
  const statusSummary = useObservedStatusSummary(region, district, ward, [
    FUNCTIONAL_STATUS,
    NON_FUNCTIONAL_STATUS,
  ])
  const statusPending = statusSummary.some((query) => query.isPending)
  const functionalCount = statusSummary[0]?.data?.total ?? null
  const nonFunctionalCount = statusSummary[1]?.data?.total ?? null

  // --- "Functional, high risk": free at national scope via the Priority
  // Engine's own summary (not location-filterable); counted from the scoped
  // map fetch when a filter narrows the view (small enough to fetch in full).
  const nationalSummary = usePrioritySummaryQuery()
  const scopedMapPoints = useQuery({
    ...mapPointsAllQueryOptions({
      nbs_region: region,
      nbs_district: district,
      nbs_ward: ward,
    }),
    enabled: hasLocationFilter,
  })
  const sampleMapPoints = useQuery({
    ...mapPointsQueryOptions({ page: 1, page_size: NATIONAL_SAMPLE_PAGE_SIZE }),
    // The 500-point preview is the heaviest request here and only feeds the
    // small map: let the KPI counts claim the connections first.
    enabled: !hasLocationFilter && (totals.isFetched || totals.isError) && nationalSummary.isFetched,
  })

  const functionalHighRiskPending = hasLocationFilter ? scopedMapPoints.isPending : nationalSummary.isPending
  const functionalHighRiskError = hasLocationFilter ? scopedMapPoints.isError : nationalSummary.isError
  const functionalHighRiskCount = hasLocationFilter
    ? scopedMapPoints.isSuccess
      ? scopedMapPoints.data.items.filter(
          (point) => point.observed_status === FUNCTIONAL_STATUS && point.risk_band === HIGH_RISK_BAND,
        ).length
      : null
    : nationalSummary.isSuccess
      ? nationalSummary.data.high_risk_functional
      : null

  // --- High Impact (p90 threshold): same national-summary/scoped-fetch split
  // as "Functional, high risk" above. National counts come straight from the
  // backend's own `impact_high_*` fields; scoped counts are tallied from the
  // already-fetched, *complete* scoped estate (never the 500-point sample).
  const highImpactPending = hasLocationFilter ? scopedMapPoints.isPending : nationalSummary.isPending
  const highImpactError = hasLocationFilter ? scopedMapPoints.isError : nationalSummary.isError
  const highImpactCount = hasLocationFilter
    ? scopedMapPoints.isSuccess
      ? scopedMapPoints.data.items.filter((point) => point.impact_high === true).length
      : null
    : nationalSummary.isSuccess
      ? nationalSummary.data.impact_high_national_count
      : null

  const highImpactNonFunctionalCount = hasLocationFilter
    ? scopedMapPoints.isSuccess
      ? scopedMapPoints.data.items.filter(
          (point) => point.observed_status === NON_FUNCTIONAL_STATUS && point.impact_high === true,
        ).length
      : null
    : nationalSummary.isSuccess
      ? nationalSummary.data.impact_high_restoration_count
      : null

  return {
    hasLocationFilter,
    totals,
    statusSummary,
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
  }
}
