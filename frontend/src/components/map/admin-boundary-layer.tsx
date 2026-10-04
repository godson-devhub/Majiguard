import { useMemo } from 'react'
import type { Layer } from 'leaflet'
import { GeoJSON } from 'react-leaflet'

import {
  useDistrictBoundaries,
  useRegionBoundaries,
  useWardBoundaries,
} from '@/hooks/admin-boundaries'
import type { RegisterFilters } from '@/lib/register-reference'

/**
 * Progressive Tanzania → Region → District → Ward boundary reveal.
 *
 * Exactly one level is ever rendered at a time - the national outline
 * (`TANZANIA_OUTLINE`, drawn separately) already orients the national view,
 * so stacking every level at once would just be noise. Below `DISTRICT_ZOOM`
 * region outlines show; between that and `WARD_ZOOM` district outlines show;
 * at `WARD_ZOOM` and above, ward outlines show for the currently filtered
 * region only (a nationwide ward layer is 4,344 polygons - too dense to be
 * useful or fast at once) and district outlines remain the fallback until a
 * region is actually selected.
 *
 * These polygons are reference cartography only, generated once from the
 * authoritative NBS 2022 PHC ward shapefile - clicking one only sets the
 * existing Region/District/Ward filter (the same filter the dropdowns use);
 * it never changes what is plotted beyond that filter, and no water-point
 * value is read from or written into this layer.
 */

export const REGION_BOUNDARY_ZOOM = 6
export const DISTRICT_BOUNDARY_ZOOM = 8
export const WARD_BOUNDARY_ZOOM = 10

type Level = 'region' | 'district' | 'ward'

function activeLevel(zoom: number, regionSelected: boolean): Level | null {
  if (zoom < REGION_BOUNDARY_ZOOM) {
    return null
  }
  if (zoom < DISTRICT_BOUNDARY_ZOOM) {
    return 'region'
  }
  if (zoom < WARD_BOUNDARY_ZOOM) {
    return 'district'
  }
  return regionSelected ? 'ward' : 'district'
}

type AdminBoundaryLayerProps = {
  zoom: number
  filters: RegisterFilters
  theme: 'light' | 'dark'
  onSelectRegion: (region: string) => void
  onSelectDistrict: (region: string, district: string) => void
  onSelectWard: (region: string, district: string, ward: string) => void
}

export function AdminBoundaryLayer({
  zoom,
  filters,
  theme,
  onSelectRegion,
  onSelectDistrict,
  onSelectWard,
}: AdminBoundaryLayerProps) {
  const level = activeLevel(zoom, filters.region !== null)

  const regions = useRegionBoundaries(level === 'region')
  const districts = useDistrictBoundaries(level === 'district')
  const wards = useWardBoundaries(filters.region, level === 'ward')

  const boundaryColor = theme === 'dark' ? '#5a93d0' : '#144c87'
  const selectedColor = theme === 'dark' ? '#fbbf24' : '#b45309'

  const baseStyle = useMemo(() => {
    if (level === 'region') {
      return { color: boundaryColor, weight: 1.75, opacity: 0.85, fillOpacity: 0 }
    }
    if (level === 'district') {
      return { color: boundaryColor, weight: 1.1, opacity: 0.7, fillOpacity: 0 }
    }
    return { color: boundaryColor, weight: 0.75, opacity: 0.55, dashArray: '2 3', fillOpacity: 0 }
  }, [level, boundaryColor])

  if (level === 'region' && regions.data !== undefined) {
    return (
      <GeoJSON
        key={`region-${theme}`}
        data={regions.data as never}
        style={(geoJsonFeature) => {
          const name = geoJsonFeature?.properties.region as string | undefined
          const isSelected = name !== undefined && name === filters.region
          return isSelected
            ? { ...baseStyle, color: selectedColor, weight: 2.5, fillOpacity: 0.06 }
            : baseStyle
        }}
        onEachFeature={(geoJsonFeature, layer: Layer) => {
          const name = geoJsonFeature.properties.region as string
          layer.bindTooltip(name, { sticky: true })
          layer.on('click', () => {
            onSelectRegion(name)
          })
        }}
      />
    )
  }

  if (level === 'district' && districts.data !== undefined) {
    return (
      <GeoJSON
        key={`district-${theme}`}
        data={districts.data as never}
        style={(geoJsonFeature) => {
          const name = geoJsonFeature?.properties.district as string | undefined
          const isSelected = name !== undefined && name === filters.district
          return isSelected
            ? { ...baseStyle, color: selectedColor, weight: 2, fillOpacity: 0.06 }
            : baseStyle
        }}
        onEachFeature={(geoJsonFeature, layer: Layer) => {
          const region = geoJsonFeature.properties.region as string
          const district = geoJsonFeature.properties.district as string
          layer.bindTooltip(`${district} · ${region}`, { sticky: true })
          layer.on('click', () => {
            onSelectDistrict(region, district)
          })
        }}
      />
    )
  }

  if (level === 'ward' && wards.data !== undefined) {
    return (
      <GeoJSON
        key={`ward-${filters.region}-${theme}`}
        data={wards.data as never}
        style={(geoJsonFeature) => {
          const name = geoJsonFeature?.properties.ward as string | undefined
          const isSelected = name !== undefined && name === filters.ward
          return isSelected
            ? { ...baseStyle, color: selectedColor, weight: 1.75, dashArray: undefined, fillOpacity: 0.08 }
            : baseStyle
        }}
        onEachFeature={(geoJsonFeature, layer: Layer) => {
          const region = geoJsonFeature.properties.region as string
          const district = geoJsonFeature.properties.district as string
          const ward = geoJsonFeature.properties.ward as string
          layer.bindTooltip(`${ward} · ${district}`, { sticky: true })
          layer.on('click', () => {
            onSelectWard(region, district, ward)
          })
        }}
      />
    )
  }

  return null
}
