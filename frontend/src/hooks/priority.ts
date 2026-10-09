import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'

import {
  getPrioritySummary,
  listPreventivePriority,
  listRestorationPriority,
} from '@/services/priority'
import type { PriorityListParams, PriorityPageMeta } from '@/types/api'

/**
 * Typed React Query layer over the backend Priority Engine endpoints. Pages
 * are real server pagination - never fetched in full and sliced client-side.
 */

export const priorityKeys = {
  all: ['priority'] as const,
  preventive: (params: PriorityListParams) => [...priorityKeys.all, 'preventive', params] as const,
  restoration: (params: PriorityListParams) => [...priorityKeys.all, 'restoration', params] as const,
  summary: () => [...priorityKeys.all, 'summary'] as const,
}

export function preventivePriorityQueryOptions(params: PriorityListParams = {}) {
  return queryOptions({
    queryKey: priorityKeys.preventive(params),
    queryFn: ({ signal }) => listPreventivePriority(params, signal),
  })
}

export function restorationPriorityQueryOptions(params: PriorityListParams = {}) {
  return queryOptions({
    queryKey: priorityKeys.restoration(params),
    queryFn: ({ signal }) => listRestorationPriority(params, signal),
  })
}

/**
 * Fetch every page of one priority pathway for one filter combination and
 * return the complete eligible pool as a single list.
 *
 * Unlike the register's `/water-points/map` endpoint (which hangs past
 * `page=1` at national scale - see `mapPointsAllQueryOptions`), the Priority
 * Engine's own endpoints paginate correctly past `page=1` (verified directly
 * against the backend), and both pathways' national eligible pools are small
 * (eligible_preventive=27, eligible_restoration=774 - one and two pages at
 * the register's 500 cap respectively), so fetching every page to compute a
 * real geographic ranking is safe even unfiltered.
 */
const PRIORITY_ESTATE_PAGE_SIZE = 500

async function fetchAllPriorityPages(
  list: (params: PriorityListParams, signal?: AbortSignal) => Promise<PriorityPageMeta>,
  params: PriorityListParams,
  signal: AbortSignal,
): Promise<PriorityPageMeta> {
  const base = { ...params, page_size: PRIORITY_ESTATE_PAGE_SIZE }
  const first = await list({ ...base, page: 1 }, signal)
  const totalPages = Math.max(first.total_pages, 1)
  if (totalPages === 1) {
    return first
  }
  const pages: PriorityPageMeta[] = [first]
  for (let page = 2; page <= totalPages; page += 1) {
    pages.push(await list({ ...base, page }, signal))
  }
  return { ...first, items: pages.flatMap((pageMeta) => pageMeta.items) }
}

export function preventivePriorityAllQueryOptions(params: PriorityListParams = {}) {
  return queryOptions({
    queryKey: [...priorityKeys.preventive(params), 'all'] as const,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => fetchAllPriorityPages(listPreventivePriority, params, signal),
  })
}

export function restorationPriorityAllQueryOptions(params: PriorityListParams = {}) {
  return queryOptions({
    queryKey: [...priorityKeys.restoration(params), 'all'] as const,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => fetchAllPriorityPages(listRestorationPriority, params, signal),
  })
}

export function usePreventivePriorityAllQuery(params: PriorityListParams = {}) {
  return useQuery(preventivePriorityAllQueryOptions(params))
}

export function useRestorationPriorityAllQuery(params: PriorityListParams = {}) {
  return useQuery(restorationPriorityAllQueryOptions(params))
}

export function prioritySummaryQueryOptions() {
  return queryOptions({
    queryKey: priorityKeys.summary(),
    queryFn: ({ signal }) => getPrioritySummary(signal),
  })
}

export function usePreventivePriorityQuery(
  params: PriorityListParams = {},
  options: { keepPrevious?: boolean; enabled?: boolean } = {},
) {
  return useQuery({
    ...preventivePriorityQueryOptions(params),
    enabled: options.enabled ?? true,
    ...(options.keepPrevious === true ? { placeholderData: keepPreviousData } : {}),
  })
}

export function useRestorationPriorityQuery(
  params: PriorityListParams = {},
  options: { keepPrevious?: boolean; enabled?: boolean } = {},
) {
  return useQuery({
    ...restorationPriorityQueryOptions(params),
    enabled: options.enabled ?? true,
    ...(options.keepPrevious === true ? { placeholderData: keepPreviousData } : {}),
  })
}

export function usePrioritySummaryQuery() {
  return useQuery(prioritySummaryQueryOptions())
}

type PointPriorityLookup = {
  waterPointId: number | null
  pathway: 'preventive' | 'restoration' | null
  region: string | null
  district: string | null
  ward: string | null
  enabled: boolean
}

/**
 * Finds one water point's ranked Priority item through the existing list
 * endpoints, narrowed to its own ward (or district / region when those are
 * missing) so the answer is a handful of rows. The item - and with it the
 * national rank, score, reasons and recommended action - is exactly what the
 * Priority page shows; nothing is recomputed. Used by the Decision Map, which
 * otherwise only has the map record, so both entry points explain a point from
 * the same backend item.
 */
export function usePointPriorityItem({
  waterPointId,
  pathway,
  region,
  district,
  ward,
  enabled,
}: PointPriorityLookup) {
  const scope: PriorityListParams | null =
    ward !== null && district !== null && region !== null
      ? { nbs_region: region, nbs_district: district, nbs_ward: ward }
      : district !== null && region !== null
        ? { nbs_region: region, nbs_district: district }
        : region !== null
          ? { nbs_region: region }
          : null
  const params: PriorityListParams = { ...scope, page: 1, page_size: 500 }
  const isRestoration = pathway === 'restoration'
  const query = useQuery({
    queryKey: isRestoration ? priorityKeys.restoration(params) : priorityKeys.preventive(params),
    queryFn: ({ signal }) =>
      isRestoration ? listRestorationPriority(params, signal) : listPreventivePriority(params, signal),
    enabled: enabled && waterPointId !== null && pathway !== null && scope !== null,
    staleTime: 5 * 60 * 1000,
  })
  const item = query.data?.items.find((candidate) => candidate.water_point_id === waterPointId) ?? null
  return { item, isPending: query.isPending && query.fetchStatus !== 'idle', isError: query.isError }
}
