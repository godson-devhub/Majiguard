import { getAuthToken } from '@/lib/auth-token'
import { env } from '@/lib/env'

export type ApiQueryValue = string | number | boolean | null | undefined

export type ApiRequestOptions = {
  params?: Record<string, ApiQueryValue>
  method?: 'GET' | 'POST'
  /** JSON request body (POST). */
  body?: unknown
  /** Cancellation signal, normally supplied by React Query. */
  signal?: AbortSignal
}

/**
 * Transport-level failure. `detail` is the backend's own short explanation and
 * is kept for diagnostics only — it is never rendered to a user, so a stack
 * trace or internal message can never reach the interface.
 */
export class ApiError extends Error {
  readonly status: number
  readonly detail: string | null

  constructor(status: number, detail: string | null) {
    super(detail ?? `MajiGuard API request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/** Thrown when the request never reached the API, so the user can be told the service is unreachable. */
export function isUnreachable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0
}

export function buildApiUrl(
  path: string,
  params?: Record<string, ApiQueryValue>,
): string {
  const base = env.apiBaseUrl.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value))
    }
  }

  const query = search.toString()
  return `${base}${suffix}${query ? `?${query}` : ''}`
}

async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail
      if (typeof detail === 'string') {
        return detail
      }
    }
  } catch {
    return null
  }
  return null
}

export async function apiRequest<T>(
  path: string,
  { params, method = 'GET', signal, body }: ApiRequestOptions = {},
): Promise<T> {
  let response: Response

  try {
    response = await fetch(buildApiUrl(path, params), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(getAuthToken() === null ? {} : { Authorization: `Bearer ${getAuthToken()}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    // An aborted request is a cancellation, not a failure: React Query handles
    // it, so it is rethrown untouched.
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw cause
    }
    throw new ApiError(0, null)
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorDetail(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  try {
    return (await response.json()) as T
  } catch {
    // A 2xx response whose body is not the agreed JSON shape is still a failed
    // contract, so it is reported as an API failure rather than crashing.
    throw new ApiError(response.status, null)
  }
}
