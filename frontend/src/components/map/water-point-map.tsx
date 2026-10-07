import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { divIcon } from 'leaflet'
import type { LatLngBounds, LatLngBoundsExpression, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapContainer,
  Marker,
  ScaleControl,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { Link } from 'react-router'

import { useI18n } from '@/app/providers/locale-provider'
import { useTheme } from '@/app/providers/theme-provider'
import { formatNumber } from '@/components/data/format'
import { AdminBoundaryLayer } from '@/components/map/admin-boundary-layer'
import { MapLayerSwitcher } from '@/components/map/map-layer-switcher'
import { MapLegend } from '@/components/map/map-legend'
import { encodeMarker } from '@/components/map/map-layers'
import type { MapLayerId, MarkerEncoding } from '@/components/map/map-layers'
import { TANZANIA_OUTLINE } from '@/components/map/tanzania-outline'
import { env } from '@/lib/env'
import { buildDensityLayer, DENSITY_ZOOM, type DensityCluster } from '@/lib/map-density'
import { EMPTY_FILTERS, type RegisterFilters } from '@/lib/register-reference'
import type { MapPointOut } from '@/types/api'
import { cn } from '@/lib/utils'

const MIN_ZOOM = 5
const MAX_ZOOM = 16
const BASEMAP_MAX_NATIVE_ZOOM = 19
const INITIAL_CENTER: [number, number] = [-6.4, 34.9]

/** Above this many markers in view, the viewport clusters instead of drawing all. */
const MAX_VISIBLE_POINTS = 1200
/** Margin around the viewport so markers just off-screen are not dropped mid-pan. */
const VIEWPORT_PAD = 0.15

/** Legitimate basemap data: CARTO's Voyager raster render of OpenStreetMap.
 * Exported so other, lighter-weight map views (e.g. the Overview spatial
 * summary) use the exact same tile source rather than a second one. CARTO
 * does not publish a separate dark Voyager raster style, so both theme keys
 * resolve to the same endpoint; `theme` is kept as the lookup key so the
 * per-theme architecture (and the TileLayer `key={theme}` remount) stays
 * unchanged if a dark variant is added later. */
const VOYAGER_URL = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
export const BASEMAP_TILES = {
  light: VOYAGER_URL,
  dark: VOYAGER_URL,
} as const

export const TILE_SUBDOMAINS = 'abcd'

/** Appends the free CARTO basemap key (see `.env.example`) when configured;
 * without it CARTO watermarks every tile with "API KEY REQUIRED". */
export function getBasemapTileUrl(theme: keyof typeof BASEMAP_TILES): string {
  const base = BASEMAP_TILES[theme]
  return env.cartoBasemapKey
    ? `${base}?key=${encodeURIComponent(env.cartoBasemapKey)}`
    : base
}

export const BASEMAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'

/**
 * National extent in degrees, derived from the static reference outline.
 * Used only to frame the initial view and keep panning inside context; it is
 * never used to decide whether a water point is inside the country.
 */
const OUTLINE_EXTENT = (() => {
  let south = Number.POSITIVE_INFINITY
  let north = Number.NEGATIVE_INFINITY
  let west = Number.POSITIVE_INFINITY
  let east = Number.NEGATIVE_INFINITY
  for (let index = 0; index + 1 < TANZANIA_OUTLINE.length; index += 2) {
    const longitude = TANZANIA_OUTLINE[index]
    const latitude = TANZANIA_OUTLINE[index + 1]
    if (longitude === undefined || latitude === undefined) {
      continue
    }
    west = Math.min(west, longitude)
    east = Math.max(east, longitude)
    south = Math.min(south, latitude)
    north = Math.max(north, latitude)
  }
  return { south, north, west, east }
})()

const COUNTRY_BOUNDS: LatLngBoundsExpression = [
  [OUTLINE_EXTENT.south, OUTLINE_EXTENT.west],
  [OUTLINE_EXTENT.north, OUTLINE_EXTENT.east],
]

/** Keeps the map inside the Tanzanian context plus margin; zoom is never limited. */
const MAX_PAN_BOUNDS: LatLngBoundsExpression = [
  [OUTLINE_EXTENT.south - 3, OUTLINE_EXTENT.west - 3],
  [OUTLINE_EXTENT.north + 3, OUTLINE_EXTENT.east + 3],
]

/**
 * Marker icons. The base classes stay neutral; condition and ramp encodings
 * add one of the `mg-water-marker--*` modifier classes, so a score colour is
 * carried by a CSS custom property set inline per marker.
 */
function markerIcon(encoding: MarkerEncoding, selected: boolean): ReturnType<typeof divIcon> {
  const size = selected ? 15 : 11
  const anchor = selected ? 7 : 5
  let modifier = ''
  let styleAttribute = ''
  if (encoding.kind === 'status') {
    modifier =
      encoding.tone === 'neutral' ? 'mg-water-marker--neutral' : `mg-water-marker--${encoding.tone}`
  } else {
    modifier = 'mg-water-marker--ramp'
    styleAttribute = ` style="--mg-marker-color: ${encoding.color}"`
  }
  const selectedClass = selected ? ' mg-water-marker--selected' : ''
  return divIcon({
    className: 'mg-divicon',
    html: `<span class="mg-water-marker ${modifier}${selectedClass}"${styleAttribute}></span>`,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
  })
}

/**
 * Icon cache: at most 5 status tones × 2 selection states, plus ramp markers
 * which are cached by colour and selection. Keeps React reconciliation cheap
 * when the viewport redraws during a pan.
 */
const STATUS_ICON_CACHE = new Map<string, ReturnType<typeof divIcon>>()
const RAMP_ICON_CACHE = new Map<string, ReturnType<typeof divIcon>>()

function cachedIcon(encoding: MarkerEncoding, selected: boolean): ReturnType<typeof divIcon> {
  if (encoding.kind === 'status') {
    const key = `${encoding.tone}:${selected ? 1 : 0}`
    let icon = STATUS_ICON_CACHE.get(key)
    if (icon === undefined) {
      icon = markerIcon(encoding, selected)
      STATUS_ICON_CACHE.set(key, icon)
    }
    return icon
  }
  const key = `${encoding.color}:${selected ? 1 : 0}`
  let icon = RAMP_ICON_CACHE.get(key)
  if (icon === undefined) {
    icon = markerIcon(encoding, selected)
    RAMP_ICON_CACHE.set(key, icon)
  }
  return icon
}

function clusterIcon(count: number) {
  const size = count >= 1000 ? 46 : count >= 100 ? 40 : 34
  const large = count >= 1000 ? ' mg-cluster--large' : ''
  return divIcon({
    className: 'mg-divicon',
    html: `<span class="mg-cluster${large}">${formatNumber(count)}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

type MapViewState = {
  zoom: number
  bounds: LatLngBounds | null
}

/**
 * One child that wires the Leaflet instance into React state: initial framing,
 * zoom and viewport reporting, resize handling and the accessible name of the
 * map surface.
 */
function MapChrome({
  label,
  onReady,
  onState,
}: {
  label: string
  onReady: (map: LeafletMap) => void
  onState: (state: MapViewState) => void
}) {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    container.setAttribute('role', 'application')
    container.setAttribute('aria-label', label)
  }, [label, map])

  useEffect(() => {
    onReady(map)
  }, [map, onReady])

  useEffect(() => {
    map.fitBounds(COUNTRY_BOUNDS, { padding: [16, 16] })
  }, [map])

  const events = useMemo(
    () => ({
      zoomend: () => onState({ zoom: map.getZoom(), bounds: map.getBounds() }),
      moveend: () => onState({ zoom: map.getZoom(), bounds: map.getBounds() }),
    }),
    [map, onState],
  )
  useMapEvents(events)

  useEffect(() => {
    onState({ zoom: map.getZoom(), bounds: map.getBounds() })
  }, [map, onState])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  return null
}

/** Pans to a selected water point without animation: calm, institutional movement. */
function SelectionPan({ target }: { target: MapPointOut | null }) {
  const map = useMap()

  useEffect(() => {
    if (target !== null) {
      map.panTo([target.latitude, target.longitude], { animate: false })
    }
  }, [map, target])

  return null
}

/**
 * What the map draws for the current view:
 *  - national zooms: exact count clusters over the whole plotted estate,
 *  - street zooms: the individual records in the (padded) viewport,
 *  - street zooms where the viewport is too dense: fine clusters of the visible set.
 */
type MapLayer = {
  clusters: DensityCluster[]
  singles: readonly MapPointOut[]
}

type WaterPointMapProps = {
  /** Every register record that matches the filter — the complete estate. */
  points: readonly MapPointOut[]
  /** The register's own total for the current filter (equals `points.length`). */
  total: number
  /** Translated label of the filter currently applied. */
  filterLabel: string
  /** Lifted selection so the route can render the detail card below the map. */
  selectedId: number | null
  onSelect: (id: number | null) => void
  /** The active data layer, lifted so surrounding UI can reflect it. */
  layer: MapLayerId
  onLayerChange: (layer: MapLayerId) => void
  /** The Region/District/Ward filter currently applied - read by the boundary
   * layer to highlight the matching polygon and to know which region's ward
   * file to load. Omit to render the map without the boundary layer. */
  boundaryFilters?: RegisterFilters
  onSelectRegion?: (region: string) => void
  onSelectDistrict?: (region: string, district: string) => void
  onSelectWard?: (region: string, district: string, ward: string) => void
  className?: string
}

/**
 * The national water-point map: a real, interactive Tanzania basemap with the
 * register's water points plotted on top under a selectable data layer.
 *
 * The plotted set is the *complete* estate matching the filter, not a page of
 * it. The active layer determines marker colour: observed condition uses the
 * status scale; risk uses the stored probability through the hazard ramp. The
 * impact and consequence layers unlock only when their stored results exist —
 * until then the switcher offers them disabled with an honest note, and no
 * marker ever implies a score the API has not stored.
 */
export function WaterPointMap({
  points,
  total,
  filterLabel,
  selectedId,
  onSelect,
  layer,
  onLayerChange,
  boundaryFilters = EMPTY_FILTERS,
  onSelectRegion,
  onSelectDistrict,
  onSelectWard,
  className,
}: WaterPointMapProps) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const [view, setView] = useState<MapViewState>({ zoom: MIN_ZOOM, bounds: null })
  const mapRef = useRef<LeafletMap | null>(null)

  const handleReady = useCallback((map: LeafletMap) => {
    mapRef.current = map
  }, [])

  // A filter change can remove the selected point from the plotted estate.
  const selected = useMemo(() => {
    if (selectedId === null) {
      return null
    }
    return points.find((point) => point.id === selectedId) ?? null
  }, [points, selectedId])

  const layerState: MapLayer = useMemo(() => {
    if (view.zoom < DENSITY_ZOOM || view.bounds === null) {
      const aggregated = buildDensityLayer(points, view.zoom)
      return { clusters: aggregated.clusters, singles: aggregated.singles }
    }
    const padded = view.bounds.pad(VIEWPORT_PAD)
    const southWest = padded.getSouthWest()
    const northEast = padded.getNorthEast()
    const visible: MapPointOut[] = []
    for (const point of points) {
      if (
        point.latitude >= southWest.lat &&
        point.latitude <= northEast.lat &&
        point.longitude >= southWest.lng &&
        point.longitude <= northEast.lng
      ) {
        visible.push(point)
      }
    }
    if (visible.length <= MAX_VISIBLE_POINTS) {
      return { clusters: [], singles: visible }
    }
    const aggregated = buildDensityLayer(visible, view.zoom, 44)
    return { clusters: aggregated.clusters, singles: aggregated.singles }
  }, [points, view])

  function zoomTowardCluster(latitude: number, longitude: number) {
    const map = mapRef.current
    if (map === null) {
      return
    }
    const target = Math.min(map.getZoom() + 1, MAX_ZOOM)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      map.setView([latitude, longitude], target)
    } else {
      map.flyTo([latitude, longitude], target, { duration: 0.4 })
    }
  }

  const summary = t('map.summary', { total, filter: filterLabel })

  return (
    <figure
      className={cn(
        'flex h-[32rem] min-h-0 flex-col overflow-hidden rounded-panel border border-border-strong bg-card',
        className,
      )}
    >
      <div className="relative isolate z-0 min-h-0 flex-1 bg-map-surface">
        <div className="mg-leaflet absolute inset-0">
          <MapContainer
            center={INITIAL_CENTER}
            zoom={MIN_ZOOM}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            scrollWheelZoom
            zoomControl={false}
            keyboard
            maxBounds={MAX_PAN_BOUNDS}
            maxBoundsViscosity={0.75}
            className="h-full w-full"
          >
            <TileLayer
              key={theme}
              url={getBasemapTileUrl(theme)}
              subdomains={TILE_SUBDOMAINS}
              attribution={BASEMAP_ATTRIBUTION}
              maxNativeZoom={BASEMAP_MAX_NATIVE_ZOOM}
            />

            <ScaleControl position="bottomleft" />

            <MapChrome label={summary} onReady={handleReady} onState={setView} />
            <SelectionPan target={selected} />

            {onSelectRegion !== undefined && onSelectDistrict !== undefined && onSelectWard !== undefined ? (
              <AdminBoundaryLayer
                zoom={view.zoom}
                filters={boundaryFilters}
                theme={theme}
                onSelectRegion={onSelectRegion}
                onSelectDistrict={onSelectDistrict}
                onSelectWard={onSelectWard}
              />
            ) : null}

            {layerState.clusters.map((cluster) => (
              <Marker
                key={cluster.key}
                position={[cluster.latitude, cluster.longitude]}
                icon={clusterIcon(cluster.count)}
                eventHandlers={{
                  click: () => zoomTowardCluster(cluster.latitude, cluster.longitude),
                }}
              >
                <Tooltip direction="top" offset={[0, -14]} className="mg-map-tooltip">
                  {t('map.legend.cluster', { count: cluster.count })}
                </Tooltip>
              </Marker>
            ))}

            {layerState.singles.map((point) => {
              const isSelected = selected?.id === point.id
              const encoding = encodeMarker(point, layer)
              const icon = cachedIcon(encoding, isSelected)
              return (
                <Marker
                  key={point.id}
                  position={[point.latitude, point.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      onSelect(isSelected ? null : point.id)
                    },
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} className="mg-map-tooltip">
                    {point.master_id}
                    {point.nbs_region !== null ? ` · ${point.nbs_region}` : ''}
                  </Tooltip>
                </Marker>
              )
            })}
          </MapContainer>
        </div>

        {/* Top-left: the grouped layer panel. */}
        <div className="absolute top-3 left-3 z-[500]">
          <MapLayerSwitcher layer={layer} onLayerChange={onLayerChange} points={points} />
        </div>

        {/* Bottom-right: the collapsible legend, above the attribution. */}
        <div className="absolute right-3 bottom-8 z-[500]">
          <MapLegend layer={layer} />
        </div>

        {/* Top-right: zoom controls. */}
        <div className="absolute top-3 right-3 z-[500] flex flex-col items-end gap-1.5">
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                mapRef.current?.zoomOut()
              }}
              disabled={view.zoom <= MIN_ZOOM}
              aria-label={t('map.zoomOut')}
              className="flex size-10 items-center justify-center rounded-control border border-map-overlay-border bg-map-overlay text-foreground shadow-mg-2 mg-transition pointer-coarse:size-11 hover:bg-accent disabled:cursor-default disabled:opacity-40"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                mapRef.current?.zoomIn()
              }}
              disabled={view.zoom >= MAX_ZOOM}
              aria-label={t('map.zoomIn')}
              className="flex size-10 items-center justify-center rounded-control border border-map-overlay-border bg-map-overlay text-foreground shadow-mg-2 mg-transition pointer-coarse:size-11 hover:bg-accent disabled:cursor-default disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                mapRef.current?.fitBounds(COUNTRY_BOUNDS, { padding: [16, 16] })
              }}
              aria-label={t('map.resetView')}
              className="flex size-10 items-center justify-center rounded-control border border-map-overlay-border bg-map-overlay text-foreground shadow-mg-2 mg-transition pointer-coarse:size-11 hover:bg-accent"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
            </button>
          </div>

        </div>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-card px-3 py-2">
        <p className="text-mg-caption text-muted-foreground">
          {layer === 'condition'
            ? t('map.legend.note.condition')
            : layer === 'risk'
              ? t('map.legend.note.risk')
              : layer === 'impact'
                ? t('map.legend.note.impact')
                : layer === 'priority'
                  ? t('map.legend.note.priority')
                  : layer === 'preventive'
                    ? t('map.legend.note.preventive')
                    : layer === 'restoration'
                      ? t('map.legend.note.restoration')
                      : t('map.legend.note.consequence')}
        </p>
        <Link
          to="/water-points"
          className="text-mg-caption font-semibold text-primary underline-offset-2 hover:underline"
        >
          {t('dashboard.openRegister')}
        </Link>
      </figcaption>
    </figure>
  )
}
