const DEFAULT_API_BASE_URL = '/api/v1'

function readApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (typeof configured !== 'string' || configured.length === 0) {
    return DEFAULT_API_BASE_URL
  }
  return configured
}

function readCartoBasemapKey(): string | undefined {
  const configured = import.meta.env.VITE_CARTO_BASEMAP_KEY
  return typeof configured === 'string' && configured.length > 0 ? configured : undefined
}

export const env = {
  apiBaseUrl: readApiBaseUrl(),
  cartoBasemapKey: readCartoBasemapKey(),
  isDev: import.meta.env.DEV,
} as const
