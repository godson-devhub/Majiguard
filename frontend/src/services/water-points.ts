import { apiRequest } from '@/lib/api-client'
import type {
  ComputeResponse,
  ConsequenceResponse,
  ImpactResponse,
  MapPageMeta,
  PageMeta,
  PredictionResponse,
  WaterPointListParams,
  WaterPointOut,
  AdministrativeArea,
  AdministrativeMetadata,
} from '@/types/api'

/**
 * Transport-only wrappers around the frozen Step 8 endpoints.
 *
 * Nothing here interprets a response: probabilities, risk bands, impact scores
 * and the consequence signal are passed through exactly as the backend computed
 * them, and nothing is derived in the browser.
 */

export function listAdministrativeRegions(signal?: AbortSignal): Promise<AdministrativeArea[]> { return apiRequest<AdministrativeArea[]>('/water-points/administrative/regions', { signal }) }
export function listAdministrativeDistricts(region: string, signal?: AbortSignal): Promise<AdministrativeArea[]> { return apiRequest<AdministrativeArea[]>('/water-points/administrative/districts', { params: { region }, signal }) }
export function listAdministrativeWards(region: string, district: string, signal?: AbortSignal): Promise<AdministrativeArea[]> { return apiRequest<AdministrativeArea[]>('/water-points/administrative/wards', { params: { region, district }, signal }) }
export function getAdministrativeMetadata(signal?: AbortSignal): Promise<AdministrativeMetadata> { return apiRequest<AdministrativeMetadata>('/water-points/administrative/metadata', { signal }) }

export function listWaterPoints(
  params: WaterPointListParams = {},
  signal?: AbortSignal,
): Promise<PageMeta> {
  return apiRequest<PageMeta>('/water-points', { params, signal })
}

export function listMapPoints(
  params: WaterPointListParams = {},
  signal?: AbortSignal,
): Promise<MapPageMeta> {
  return apiRequest<MapPageMeta>('/water-points/map', { params, signal })
}

export function getWaterPoint(
  id: number,
  signal?: AbortSignal,
): Promise<WaterPointOut> {
  return apiRequest<WaterPointOut>(`/water-points/${id}`, { signal })
}

export function getWaterPointByMasterId(
  masterId: string,
  signal?: AbortSignal,
): Promise<WaterPointOut> {
  return apiRequest<WaterPointOut>(
    `/water-points/master/${encodeURIComponent(masterId)}`,
    { signal },
  )
}

export function getPrediction(
  id: number,
  signal?: AbortSignal,
): Promise<PredictionResponse> {
  return apiRequest<PredictionResponse>(`/water-points/${id}/prediction`, { signal })
}

export function getImpact(
  id: number,
  signal?: AbortSignal,
): Promise<ImpactResponse> {
  return apiRequest<ImpactResponse>(`/water-points/${id}/impact`, { signal })
}

export function getConsequence(
  id: number,
  signal?: AbortSignal,
): Promise<ConsequenceResponse> {
  return apiRequest<ConsequenceResponse>(`/water-points/${id}/consequence`, { signal })
}

/**
 * Writes a fresh prediction, impact and consequence result set for one water
 * point. No screen in Step 9.4 calls this: the interface reads stored results
 * only, so the database is never changed by browsing the application.
 */
export function computeWaterPoint(
  id: number,
  signal?: AbortSignal,
): Promise<ComputeResponse> {
  return apiRequest<ComputeResponse>(`/water-points/${id}/compute`, {
    method: 'POST',
    signal,
  })
}
