import { queryOptions, useQuery } from '@tanstack/react-query'

/**
 * Administrative boundary polygons, generated once from the authoritative
 * NBS 2022 PHC ward shapefile (see `frontend/scripts/generate-admin-boundaries.py`)
 * and served as static assets under `public/geo/`. These are reference
 * cartography, like the national outline: no water-point value, count or
 * status lives in them, and nothing here computes or re-derives geometry at
 * runtime - it only fetches and caches the pre-generated files.
 *
 * Ward files are split one-per-region (`public/geo/wards/<slug>.geojson`) so
 * the browser never downloads more than one region's wards at a time.
 */

export type BoundaryGeoJson = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: unknown
    properties: Record<string, string | null>
  }>
}

export type WardManifestEntry = {
  region: string
  slug: string
  wardCount: number
}

async function fetchGeoJson(path: string, signal?: AbortSignal): Promise<BoundaryGeoJson> {
  const response = await fetch(path, { signal })
  if (!response.ok) {
    throw new Error(`Failed to load boundary asset ${path}: ${response.status}`)
  }
  return (await response.json()) as BoundaryGeoJson
}

const boundaryKeys = {
  regions: ['admin-boundaries', 'regions'] as const,
  districts: ['admin-boundaries', 'districts'] as const,
  wardManifest: ['admin-boundaries', 'ward-manifest'] as const,
  wards: (slug: string) => ['admin-boundaries', 'wards', slug] as const,
}

export function regionBoundariesQueryOptions() {
  return queryOptions({
    queryKey: boundaryKeys.regions,
    queryFn: ({ signal }) => fetchGeoJson('/geo/tz-regions.geojson', signal),
    staleTime: Infinity,
  })
}

export function districtBoundariesQueryOptions() {
  return queryOptions({
    queryKey: boundaryKeys.districts,
    queryFn: ({ signal }) => fetchGeoJson('/geo/tz-districts.geojson', signal),
    staleTime: Infinity,
  })
}

function wardManifestQueryOptions() {
  return queryOptions({
    queryKey: boundaryKeys.wardManifest,
    queryFn: async ({ signal }): Promise<WardManifestEntry[]> => {
      const response = await fetch('/geo/wards/manifest.json', { signal })
      if (!response.ok) {
        throw new Error(`Failed to load ward manifest: ${response.status}`)
      }
      return (await response.json()) as WardManifestEntry[]
    },
    staleTime: Infinity,
  })
}

export function useRegionBoundaries(enabled: boolean) {
  return useQuery({ ...regionBoundariesQueryOptions(), enabled })
}

export function useDistrictBoundaries(enabled: boolean) {
  return useQuery({ ...districtBoundariesQueryOptions(), enabled })
}

export function useWardManifest(enabled: boolean) {
  return useQuery({ ...wardManifestQueryOptions(), enabled })
}

/** One region's ward boundaries, resolved through the manifest's slug. */
export function useWardBoundaries(region: string | null, enabled: boolean) {
  const manifest = useWardManifest(enabled && region !== null)
  const slug = manifest.data?.find((entry) => entry.region === region)?.slug ?? null

  return useQuery({
    queryKey: boundaryKeys.wards(slug ?? ''),
    queryFn: ({ signal }) => fetchGeoJson(`/geo/wards/${slug}.geojson`, signal),
    enabled: enabled && slug !== null,
    staleTime: Infinity,
  })
}
