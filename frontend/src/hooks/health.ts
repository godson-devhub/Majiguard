import { queryOptions, useQuery } from '@tanstack/react-query'

import { fetchHealth } from '@/services/health'

/**
 * Liveness only. The backend's health route does not touch the database, so a
 * healthy response proves the service is up, never that data is available.
 */
export const healthQueryKey = ['health'] as const

export function healthQueryOptions() {
  return queryOptions({
    queryKey: healthQueryKey,
    queryFn: ({ signal }) => fetchHealth(signal),
    staleTime: 30_000,
    retry: false,
  })
}

export function useHealthQuery() {
  return useQuery(healthQueryOptions())
}
