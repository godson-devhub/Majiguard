import { useMutation, useQueries, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'

import { isNotFound } from '@/lib/api-client'
import { NOT_STORED, stored, type StoredResult } from '@/lib/api-result'
import { OBSERVED_STATUS_VALUES, REGION_VALUES } from '@/lib/register-reference'
import {
  getConsequence,
  getImpact,
  getPrediction,
  getWaterPoint,
  getWaterPointByMasterId,
  listMapPoints,
  listAdministrativeRegions, listAdministrativeDistricts, listAdministrativeWards,
  getAdministrativeMetadata,
  listWaterPoints,
  computeWaterPoint,
} from '@/services/water-points'
import type { MapPageMeta, WaterPointListParams } from '@/types/api'

/**
 * Typed React Query layer over the frozen Step 8 API.
 *
 * The result endpoints return 404 when a water point has no stored result yet.
 * That is mapped to an explicit `not-stored` state here, at the data layer, so
 * no screen ever has to turn a missing result into a zero, a band or a guess.
 */

export const waterPointKeys = {
  all: ['water-points'] as const,
  lists: () => [...waterPointKeys.all, 'list'] as const,
  adminRegions: () => [...waterPointKeys.all, 'admin-regions'] as const,
  adminDistricts: (region: string) => [...waterPointKeys.all, 'admin-districts', region] as const,
  adminWards: (region: string, district: string) => [...waterPointKeys.all, 'admin-wards', region, district] as const,
  list: (params: WaterPointListParams) =>
    [...waterPointKeys.lists(), params] as const,
  maps: () => [...waterPointKeys.all, 'map'] as const,
  map: (params: WaterPointListParams) =>
    [...waterPointKeys.maps(), params] as const,
  mapAll: (params: WaterPointListParams) =>
    [...waterPointKeys.maps(), 'all', params] as const,
  detail: (id: number) => [...waterPointKeys.all, 'detail', id] as const,
  byMasterId: (masterId: string) =>
    [...waterPointKeys.all, 'master', masterId] as const,
  prediction: (id: number) => [...waterPointKeys.all, 'prediction', id] as const,
  impact: (id: number) => [...waterPointKeys.all, 'impact', id] as const,
  consequence: (id: number) => [...waterPointKeys.all, 'consequence', id] as const,
}

export function useAdministrativeRegionsQuery() { return useQuery({ queryKey: waterPointKeys.adminRegions(), queryFn: ({ signal }) => listAdministrativeRegions(signal), staleTime: Infinity }) }
export function useAdministrativeDistrictsQuery(region: string | null) { return useQuery({ queryKey: waterPointKeys.adminDistricts(region ?? ''), queryFn: ({ signal }) => listAdministrativeDistricts(region ?? '', signal), enabled: Boolean(region), staleTime: Infinity }) }
export function useAdministrativeWardsQuery(region: string | null, district: string | null) { return useQuery({ queryKey: waterPointKeys.adminWards(region ?? '', district ?? ''), queryFn: ({ signal }) => listAdministrativeWards(region ?? '', district ?? '', signal), enabled: Boolean(region && district), staleTime: Infinity }) }

/** Read-only provenance of the administrative boundaries (source and version). */
export function useAdministrativeMetadataQuery() { return useQuery({ queryKey: [...waterPointKeys.all, 'admin-metadata'] as const, queryFn: ({ signal }) => getAdministrativeMetadata(signal), staleTime: Infinity }) }

export function waterPointListQueryOptions(params: WaterPointListParams = {}) {
  return queryOptions({
    queryKey: waterPointKeys.list(params),
    queryFn: ({ signal }) => listWaterPoints(params, signal),
  })
}

export function mapPointsQueryOptions(params: WaterPointListParams = {}) {
  return queryOptions({
    queryKey: waterPointKeys.map(params),
    queryFn: ({ signal }) => listMapPoints(params, signal),
  })
}

/**
 * Fetch every page of the register's map endpoint for one filter combination
 * and return the complete estate as a single list.
 *
 * The frozen API caps `page_size` at 500 and has no aggregation endpoint, so a
 * national map that represents the whole estate fetches every page â€” in
 * bounded-parallel batches â€” through the existing contract. The envelope's
 * `total` still names the register's own count for the filter.
 *
 * A smaller `page_size` was tried (and measured) as a possible fix for the
 * Analytics "select a Region" slowdown, since an isolated single request at
 * `page_size=500` with an `nbs_region` filter measured ~8-9s versus ~0.15s at
 * `page_size=100`. But under the real access pattern this function actually
 * uses - every page fetched concurrently (`MAP_ESTATE_CONCURRENCY` at a time)
 * - that isolated-request number was misleading: fetching Dodoma's full
 * 2,731 points measured ~15.7s at `page_size=500`/concurrency=6 (today's
 * settings) versus ~24-43s at smaller page sizes (more, smaller concurrent
 * requests was *slower* in aggregate, not faster - all measured directly
 * against the live backend, reproduced). `page_size=500` is therefore left
 * as the better of the two, not changed.
 */
const MAP_ESTATE_PAGE_SIZE = 500
const MAP_ESTATE_CONCURRENCY = 6

export function mapPointsAllQueryOptions(params: WaterPointListParams = {}) {
  return queryOptions({
    queryKey: waterPointKeys.mapAll(params),
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const base = { ...params, page_size: MAP_ESTATE_PAGE_SIZE }
      const first = await listMapPoints({ ...base, page: 1 }, signal)
      const totalPages = Math.max(first.total_pages, 1)

      if (totalPages === 1) {
        return first
      }

      const pages: MapPageMeta[] = [first]
      let next = 2
      const workers = Array.from(
        { length: Math.min(MAP_ESTATE_CONCURRENCY, totalPages - 1) },
        async () => {
          for (;;) {
            if (signal.aborted) {
              throw new DOMException('Aborted', 'AbortError')
            }
            const page = next
            next += 1
            if (page > totalPages) {
              break
            }
            pages.push(await listMapPoints({ ...base, page }, signal))
          }
        },
      )
      await Promise.all(workers)

      const items = pages
        .flatMap((page) => page.items)
        .sort((a, b) => a.id - b.id)
      return { ...first, items }
    },
  })
}

/** Lower than `MAP_ESTATE_CONCURRENCY`: the Decision Map now renders while
 * this is still running in the background, so other same-origin requests it
 * shares the browser's per-origin connection limit with (the Region/
 * District/Ward dropdowns, the admin boundary layer) need slots left free -
 * especially important for the unfiltered national view, where page>1 hangs
 * indefinitely (see below) and would otherwise tie up every slot forever. */
const DECISION_MAP_CONCURRENCY = 3

/**
 * Progressive variant of `mapPointsAllQueryOptions`, for the Decision Map
 * only (Overview, Analytics and Priority keep using the original, which this
 * does not touch - separate `queryKey`, separate cache entry).
 *
 * Page 1 is published to the query cache the moment it arrives via
 * `queryClient.setQueryData` - the standard TanStack Query pattern for a
 * query whose data should update before its own `queryFn` promise resolves.
 * Every active `useQuery` observer for this key (i.e. the Decision Map
 * route) re-renders with that partial data immediately, with `isPending`
 * already `false`, while remaining pages continue loading in the background
 * and are merged in as each one arrives. The register's `GET
 * /water-points/map` has a confirmed, frozen-backend fault where `page=2`
 * onward hangs indefinitely for an *unfiltered* (national) request
 * specifically (reconfirmed directly against it: page 1 in 0.66s, page 2
 * timed out) - region/district/ward-filtered multi-page requests do not
 * share this fault. This hook does not and cannot fix that; what it changes
 * is that the hang now happens quietly in the background after the map has
 * already rendered page 1's real points, instead of blocking the entire
 * route behind a full-screen spinner forever.
 */
export function useProgressiveMapPoints(
  params: WaterPointListParams = {},
  options: { enabled?: boolean } = {},
) {
  const queryClient = useQueryClient()
  const queryKey = [...waterPointKeys.maps(), 'progressive', params] as const

  return useQuery({
    queryKey,
    staleTime: 5 * 60_000,
    enabled: options.enabled ?? true,
    queryFn: async ({ signal }) => {
      const base = { ...params, page_size: MAP_ESTATE_PAGE_SIZE }
      const first = await listMapPoints({ ...base, page: 1 }, signal)
      const totalPages = Math.max(first.total_pages, 1)
      let accumulated = first.items

      if (totalPages === 1) {
        return first
      }

      queryClient.setQueryData(queryKey, { ...first, items: accumulated })

      let next = 2
      const workers = Array.from(
        { length: Math.min(DECISION_MAP_CONCURRENCY, totalPages - 1) },
        async () => {
          for (;;) {
            if (signal.aborted) {
              throw new DOMException('Aborted', 'AbortError')
            }
            const page = next
            next += 1
            if (page > totalPages) {
              break
            }
            const pageData = await listMapPoints({ ...base, page }, signal)
            accumulated = accumulated.concat(pageData.items).sort((a, b) => a.id - b.id)
            queryClient.setQueryData(queryKey, { ...first, items: accumulated })
          }
        },
      )
      await Promise.all(workers)

      return { ...first, items: accumulated }
    },
  })
}

export function waterPointQueryOptions(id: number) {
  return queryOptions({
    queryKey: waterPointKeys.detail(id),
    queryFn: ({ signal }) => getWaterPoint(id, signal),
  })
}

export function waterPointByMasterIdQueryOptions(masterId: string) {
  return queryOptions({
    queryKey: waterPointKeys.byMasterId(masterId),
    queryFn: ({ signal }) => getWaterPointByMasterId(masterId, signal),
    enabled: masterId.length > 0,
  })
}

function resultQueryOptions<TData>(
  queryKey: readonly unknown[],
  queryFn: (signal: AbortSignal) => Promise<TData>,
) {
  return queryOptions({
    queryKey,
    queryFn: async ({ signal }): Promise<StoredResult<TData>> => {
      try {
        return stored(await queryFn(signal))
      } catch (error) {
        if (isNotFound(error)) {
          return NOT_STORED
        }
        throw error
      }
    },
    // A missing result is a settled answer, not a failure, so it is not
    // retried. Any other failure still gets the client's single retry.
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 1,
  })
}

export function predictionQueryOptions(id: number) {
  return resultQueryOptions(waterPointKeys.prediction(id), (signal) =>
    getPrediction(id, signal),
  )
}

export function impactQueryOptions(id: number) {
  return resultQueryOptions(waterPointKeys.impact(id), (signal) =>
    getImpact(id, signal),
  )
}

export function consequenceQueryOptions(id: number) {
  return resultQueryOptions(waterPointKeys.consequence(id), (signal) =>
    getConsequence(id, signal),
  )
}

export function useWaterPointByMasterIdQuery(masterId: string | null) {
  return useQuery({
    ...waterPointByMasterIdQueryOptions(masterId ?? ''),
    enabled: masterId !== null && masterId.length > 0,
  })
}

export function useWaterPointListQuery(params: WaterPointListParams = {}) {
  return useQuery(waterPointListQueryOptions(params))
}

export function useMapPointsQuery(params: WaterPointListParams = {}) {
  return useQuery(mapPointsQueryOptions(params))
}

export function useMapPointsAll(params: WaterPointListParams = {}) {
  return useQuery(mapPointsAllQueryOptions(params))
}

export function useWaterPointQuery(id: number | null) {
  return useQuery({
    ...waterPointQueryOptions(id ?? 0),
    enabled: id !== null,
  })
}

export function usePredictionQuery(id: number | null) {
  return useQuery({
    ...predictionQueryOptions(id ?? 0),
    enabled: id !== null,
  })
}

export function useImpactQuery(id: number | null) {
  return useQuery({
    ...impactQueryOptions(id ?? 0),
    enabled: id !== null,
  })
}

export function useConsequenceQuery(id: number | null) {
  return useQuery({
    ...consequenceQueryOptions(id ?? 0),
    enabled: id !== null,
  })
}

/** Run the existing frozen backend assessment and refresh all stored-result views. */
export function useComputeWaterPointMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => computeWaterPoint(id),
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: waterPointKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: waterPointKeys.prediction(id) })
      void queryClient.invalidateQueries({ queryKey: waterPointKeys.impact(id) })
      void queryClient.invalidateQueries({ queryKey: waterPointKeys.consequence(id) })
      void queryClient.invalidateQueries({ queryKey: waterPointKeys.maps() })
    },
  })
}

/**
 * Condition summary for the overview: the register's own count for each observed
 * status value.
 *
 * Every number comes from the register, one filtered count per status. Nothing
 * is tallied in the browser and no category is invented here â€” the vocabulary
 * lives in `register-reference.ts` and a value the register does not hold simply
 * reports zero. `region`/`district`/`ward` narrow the whole summary to the
 * same administrative scope as the rest of the filtered view.
 */
export function useObservedStatusSummary(
  region: string | null = null,
  district: string | null = null,
  ward: string | null = null,
  statuses: readonly (typeof OBSERVED_STATUS_VALUES)[number][] = OBSERVED_STATUS_VALUES,
) {
  return useQueries({
    queries: statuses.map((status) =>
      waterPointListQueryOptions({
        page: 1,
        page_size: 1,
        observed_status: status,
        nbs_region: region,
        nbs_district: district,
        nbs_ward: ward,
      }),
    ),
  })
}

/**
 * Regional totals: the register's own count for each NBS region, one filtered
 * count per region. Combine with an unfiltered count to present each region's
 * share of the estate. 23 regions is a bounded, stable vocabulary read from the
 * register, so this stays inside the frozen API's filter contract.
 */
export function useRegionTotals(enabled: boolean = true) {
  return useQueries({
    queries: REGION_VALUES.map((region) => ({
      ...waterPointListQueryOptions({ page: 1, page_size: 1, nbs_region: region }),
      enabled,
    })),
  })
}

/**
 * Per-region Non-Functional totals - the same one-filtered-count-per-region
 * pattern as `useRegionTotals`, with `observed_status` added. Safe at
 * national scale (`page_size: 1`, so it never touches the register's
 * documented page>1 fault on the full-record map endpoint): this is a count,
 * never a fetch of rows.
 */
export function useRegionNonFunctionalTotals() {
  return useQueries({
    queries: REGION_VALUES.map((region) =>
      waterPointListQueryOptions({
        page: 1,
        page_size: 1,
        nbs_region: region,
        observed_status: OBSERVED_STATUS_VALUES[3],
      }),
    ),
  })
}

/** Both raw statuses `conditionGroup()` (lib/decision-map-filters.ts) groups
 * as "Non-Functional" - "Non-Functional" itself and "Non-Functional, dry
 * season" - summed per region. */
const NONFUNCTIONAL_GROUP_STATUSES = [OBSERVED_STATUS_VALUES[3], OBSERVED_STATUS_VALUES[4]]

export type RegionConditionTotal = {
  region: string
  total: number | null
  /** The Non-Functional group's count, summed across both its raw statuses. */
  nonFunctional: number | null
  /** Derived as `total - nonFunctional` - a presentational remainder (lumping
   * the small Abandoned/Others residual in with Functional) used only for
   * the Analytics condition-by-location comparison, never for a KPI figure. */
  functional: number | null
  isPending: boolean
  isError: boolean
}

/**
 * Per-region Functional/Non-Functional totals for the Analytics "Condition by
 * location" chart at national scope - safe at national scale (`page_size: 1`
 * counts only, one query per region per relevant status; never a row-level
 * fetch, so it never touches the register's documented page>1 fault on the
 * map endpoint).
 *
 * `enabled` (default `true`) lets a caller switch off all 46+23 of these
 * requests at once - e.g. Analytics passes `!hasRegion`, since once a Region
 * is selected this national-scope data is not read by anything and firing it
 * anyway was pure waste (confirmed: every one of these requests was still
 * going out even while a Region-scoped view was loading).
 */
export function useRegionConditionGroupTotals(enabled: boolean = true): RegionConditionTotal[] {
  const totals = useRegionTotals(enabled)
  const nonFunctionalQueries = useQueries({
    queries: REGION_VALUES.flatMap((region) =>
      NONFUNCTIONAL_GROUP_STATUSES.map((status) => ({
        ...waterPointListQueryOptions({ page: 1, page_size: 1, nbs_region: region, observed_status: status }),
        enabled,
      })),
    ),
  })

  return REGION_VALUES.map((region, regionIndex) => {
    const totalQuery = totals[regionIndex]
    const nonFunctionalSlice = nonFunctionalQueries.slice(
      regionIndex * NONFUNCTIONAL_GROUP_STATUSES.length,
      (regionIndex + 1) * NONFUNCTIONAL_GROUP_STATUSES.length,
    )
    const allQueries = [totalQuery, ...nonFunctionalSlice]
    const nonFunctional = nonFunctionalSlice.every((query) => query.isSuccess)
      ? nonFunctionalSlice.reduce((sum, query) => sum + (query.data?.total ?? 0), 0)
      : null
    const total = totalQuery?.data?.total ?? null
    return {
      region,
      total,
      nonFunctional,
      functional: total !== null && nonFunctional !== null ? total - nonFunctional : null,
      isPending: allQueries.some((query) => query?.isPending),
      isError: allQueries.some((query) => query?.isError),
    }
  })
}

