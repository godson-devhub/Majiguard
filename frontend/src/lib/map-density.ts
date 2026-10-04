/**
 * Screen-space density bucketing for the water-point layer.
 *
 * Points are bucketed into a world-pixel grid at the map's current zoom; a
 * bucket holding more than one record renders as a single count marker, so
 * dense survey areas stay readable. Presentational only: no record is dropped,
 * merged or modified, every cluster reports the exact number of real records it
 * contains, and a bucket with a single record stays an individual marker.
 *
 * The map decides when to aggregate (national zoom, or a viewport too dense to
 * draw record by record) and how large a bucket is at that zoom.
 */

/** From this zoom upward, the map draws individual markers unless the viewport overflows. */
export const DENSITY_ZOOM = 8

/** Edge of one grid cell, in world pixels, at the current zoom. */
const DEFAULT_CELL_PX = 56

const MAX_LATITUDE = 85.05112878

export type DensityPoint = {
  id: number
  latitude: number
  longitude: number
}

export type DensityCluster = {
  key: string
  latitude: number
  longitude: number
  count: number
}

export type DensityLayer<T extends DensityPoint = DensityPoint> = {
  clusters: DensityCluster[]
  singles: readonly T[]
}

function worldPixels(
  longitude: number,
  latitude: number,
  zoom: number,
): [number, number] {
  const worldSize = 256 * 2 ** zoom
  const x = ((longitude + 180) / 360) * worldSize
  const clamped = Math.max(Math.min(latitude, MAX_LATITUDE), -MAX_LATITUDE)
  const radians = (clamped * Math.PI) / 180
  const mercator = Math.log(Math.tan(radians) + 1 / Math.cos(radians))
  const y = ((1 - mercator / Math.PI) / 2) * worldSize
  return [x, y]
}

/**
 * Bucket `points` into a world-pixel grid at `zoom`.
 *
 * `cellPx` sizes one grid cell in world pixels: a large cell at national zoom
 * groups whole survey regions, a small cell at street zoom groups only the
 * truly overlapping.
 */
export function buildDensityLayer<T extends DensityPoint>(
  points: readonly T[],
  zoom: number,
  cellPx = DEFAULT_CELL_PX,
): DensityLayer<T> {
  if (points.length === 0) {
    return { clusters: [], singles: points }
  }

  type Bucket = { sumLat: number; sumLng: number; count: number }
  const buckets = new Map<string, Bucket>()

  for (const point of points) {
    const [x, y] = worldPixels(point.longitude, point.latitude, zoom)
    const key = `${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`
    const bucket = buckets.get(key)
    if (bucket === undefined) {
      buckets.set(key, { sumLat: point.latitude, sumLng: point.longitude, count: 1 })
    } else {
      bucket.sumLat += point.latitude
      bucket.sumLng += point.longitude
      bucket.count += 1
    }
  }

  const clusters: DensityCluster[] = []
  for (const [key, bucket] of buckets) {
    if (bucket.count > 1) {
      clusters.push({
        key,
        latitude: bucket.sumLat / bucket.count,
        longitude: bucket.sumLng / bucket.count,
        count: bucket.count,
      })
    }
  }

  const singles = points.filter((point) => {
    const [x, y] = worldPixels(point.longitude, point.latitude, zoom)
    const key = `${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`
    return buckets.get(key)?.count === 1
  })

  return { clusters, singles }
}
