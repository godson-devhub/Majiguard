import { apiRequest } from '@/lib/api-client'
import type { HealthStatus } from '@/types/api'

/** Liveness of the frozen Step 8 API. The service returns `{"status":"ok"}`. */
export function fetchHealth(signal?: AbortSignal): Promise<HealthStatus> {
  return apiRequest<HealthStatus>('/health', { signal })
}
