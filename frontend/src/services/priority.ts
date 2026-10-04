import { apiRequest } from '@/lib/api-client'
import type { PriorityListParams, PriorityPageMeta, PrioritySummaryOut } from '@/types/api'

/**
 * Transport-only wrappers around the backend Priority Engine endpoints.
 *
 * Nothing here ranks, scores or filters: rank, priority_score, why_prioritized
 * and recommended_action are passed through exactly as the backend computed
 * them, for both pathways.
 */

export function listPreventivePriority(
  params: PriorityListParams = {},
  signal?: AbortSignal,
): Promise<PriorityPageMeta> {
  return apiRequest<PriorityPageMeta>('/priority/preventive', { params, signal })
}

export function listRestorationPriority(
  params: PriorityListParams = {},
  signal?: AbortSignal,
): Promise<PriorityPageMeta> {
  return apiRequest<PriorityPageMeta>('/priority/restoration', { params, signal })
}

export function getPrioritySummary(signal?: AbortSignal): Promise<PrioritySummaryOut> {
  return apiRequest<PrioritySummaryOut>('/priority/summary', { signal })
}
