import { isNotFound, isUnreachable } from '@/lib/api-client'

/**
 * A stored model result. The backend returns 404 when a water point has no
 * stored result yet, which is a real state rather than an error, and it is
 * never a zero, a band or an empty number.
 */
export type StoredResult<TData> =
  | { availability: 'stored'; data: TData }
  | { availability: 'not-stored' }

export function stored<TData>(data: TData): StoredResult<TData> {
  return { availability: 'stored', data }
}

export const NOT_STORED: StoredResult<never> = { availability: 'not-stored' }

export function isStored<TData>(
  result: StoredResult<TData>,
): result is { availability: 'stored'; data: TData } {
  return result.availability === 'stored'
}

/** Maps a transport failure onto a state the interface can explain honestly. */
export type ApiFailureKind =
  | 'unreachable'
  | 'server-unavailable'
  | 'invalid-request'
  | 'unexpected'

export function describeApiFailure(error: unknown): ApiFailureKind {
  if (isUnreachable(error)) {
    return 'unreachable'
  }
  if (isNotFound(error)) {
    return 'unexpected'
  }

  const status = typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status: unknown }).status
    : null

  if (status === 503) {
    return 'server-unavailable'
  }
  if (status === 422 || status === 400) {
    return 'invalid-request'
  }
  return 'unexpected'
}
