import { useMemo } from 'react'
import { divIcon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { useTheme } from '@/app/providers/theme-provider'
import { EmptyState, FailureState, LoadingState } from '@/components/data/data-states'
import { encodeMarker } from '@/components/map/map-layers'
import {
  BASEMAP_ATTRIBUTION,
  getBasemapTileUrl,
  TILE_SUBDOMAINS,
} from '@/components/map/water-point-map'
import { Button } from '@/components/ui/button'
import { buildDensityLayer } from '@/lib/map-density'
import type { MapPointOut } from '@/types/api'

const FIXED_ZOOM = 5
const FIXED_CENTER: [number, number] = [-6.4, 34.9]

function dotIcon(color: string, size: number) {
  return divIcon({
    className: 'mg-overview-dot',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:1px solid rgba(255,255,255,0.65);box-shadow:0 0 0 1px rgba(0,0,0,0.15);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

type OverviewSpatialSummaryProps = {
  points: readonly MapPointOut[]
  total: number
  isPending: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  /** True when `points` is the *complete* set for an active Region/District/
   * Ward filter (small enough to fetch in full); false when it is a bounded,
   * explicitly-partial national sample. Only changes which caption wording
   * is used - never the filtering or colour logic. */
  isScoped: boolean
}

/**
 * Compact, read-only spatial summary - deliberately not the full Decision
 * Map. Receives already-fetched points from the parent (shared with the KPI
 * calculation, so this view causes zero network requests of its own), keeps
 * only the points already flagged eligible for one of the two priority
 * pathways, and plots them with the exact same `encodeMarker()` colour logic
 * the full map uses - no new encoding, no recomputed score. No pan, zoom, or
 * selection: its only job is "does this cluster anywhere?" before handing off
 * to the real map. Responds to the same global Region/District/Ward filter
 * as the rest of the Overview because the parent passes it the same scoped
 * data it fetched for the KPI row.
 */
export function OverviewSpatialSummary({
  points,
  isPending,
  isError,
  error,
  onRetry,
}: OverviewSpatialSummaryProps) {
  const { t } = useI18n()
  const { theme } = useTheme()

  const eligiblePoints = useMemo(
    () =>
      points.filter(
        (point) =>
          point.preventive_priority_eligible === true ||
          point.restoration_priority_eligible === true,
      ),
    [points],
  )

  const layer = useMemo(() => buildDensityLayer(eligiblePoints, FIXED_ZOOM, 40), [eligiblePoints])

  return (
    <section aria-labelledby="overview-spatial-heading" className="mg-glass flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-9 items-center justify-between gap-x-6 px-4 pb-2 pt-3">
        <div>
          <h2 id="overview-spatial-heading" className="text-mg-title-md text-foreground">
            {t('overview.spatial.title')}
          </h2>
          
        </div>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link to="/decision-map" />}>
          {t('overview.spatial.cta')}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        {isPending ? (
          <div className="flex min-h-40 flex-1 items-center justify-center p-4">
            <LoadingState label={t('data.loading')} />
          </div>
        ) : isError ? (
          <div className="p-4">
            <FailureState error={error} onRetry={onRetry} />
          </div>
        ) : eligiblePoints.length === 0 ? (
          <div className="p-4">
            <EmptyState body={t('overview.list.empty')} />
          </div>
        ) : (
          <>
            <div className="mg-leaflet relative min-h-52 flex-1 overflow-hidden rounded-xl bg-map-surface" aria-hidden="true">
              <MapContainer
                center={FIXED_CENTER}
                zoom={FIXED_ZOOM}
                minZoom={FIXED_ZOOM}
                maxZoom={FIXED_ZOOM}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                boxZoom={false}
                keyboard={false}
                touchZoom={false}
                attributionControl={false}
                className="absolute inset-0 h-full w-full"
              >
                <TileLayer
                  key={theme}
                  url={getBasemapTileUrl(theme)}
                  subdomains={TILE_SUBDOMAINS}
                  attribution={BASEMAP_ATTRIBUTION}
                />
                {layer.clusters.map((cluster) => (
                  <Marker
                    key={cluster.key}
                    position={[cluster.latitude, cluster.longitude]}
                    icon={dotIcon('var(--mg-blue-600)', Math.min(10 + cluster.count, 18))}
                  />
                ))}
                {layer.singles.map((point) => {
                  const encoding =
                    point.preventive_priority_eligible === true
                      ? encodeMarker(point, 'preventive')
                      : encodeMarker(point, 'restoration')
                  const color = encoding.kind === 'ramp' ? encoding.color : 'var(--mg-n-400)'
                  return (
                    <Marker
                      key={point.id}
                      position={[point.latitude, point.longitude]}
                      icon={dotIcon(color, 7)}
                    />
                  )
                })}
              </MapContainer>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
