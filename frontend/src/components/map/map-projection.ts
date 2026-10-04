/**
 * Web Mercator projection, normalised to the unit square.
 *
 * The whole world maps to x,y in [0,1]. Everything else in the map — the country
 * outline, the water points, zoom and pan — works in that single space, so the
 * projection is applied exactly once per point.
 *
 * This is a presentation transform only. Nothing here interprets a coordinate or
 * decides whether a water point is inside the country.
 */

const MAX_LATITUDE = 85.05112878

export type ProjectedPoint = readonly [x: number, y: number]

export function projectLongitude(longitude: number): number {
  return (longitude + 180) / 360
}

export function projectLatitude(latitude: number): number {
  const clamped = Math.max(Math.min(latitude, MAX_LATITUDE), -MAX_LATITUDE)
  const radians = (clamped * Math.PI) / 180
  const y = Math.log(Math.tan(radians) + 1 / Math.cos(radians))
  return (1 - y / Math.PI) / 2
}

export function project(longitude: number, latitude: number): ProjectedPoint {
  return [projectLongitude(longitude), projectLatitude(latitude)]
}

export type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function boundsOf(flat: readonly number[]): Bounds {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let index = 0; index + 1 < flat.length; index += 2) {
    const longitude = flat[index]
    const latitude = flat[index + 1]
    if (longitude === undefined || latitude === undefined) {
      continue
    }
    const x = projectLongitude(longitude)
    const y = projectLatitude(latitude)
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  return { minX, minY, maxX, maxY }
}

/** Converts a flat `[lon, lat, …]` ring into an SVG path in projected space. */
export function toProjectedPath(flat: readonly number[]): string {
  if (flat.length < 4) {
    return ''
  }

  let path = ''
  for (let index = 0; index + 1 < flat.length; index += 2) {
    const longitude = flat[index]
    const latitude = flat[index + 1]
    if (longitude === undefined || latitude === undefined) {
      continue
    }
    const x = projectLongitude(longitude).toFixed(6)
    const y = projectLatitude(latitude).toFixed(6)
    path += `${path.length === 0 ? 'M' : 'L'}${x} ${y}`
  }
  return `${path}Z`
}

/**
 * The scale at which a bounds box exactly fits a viewport of the given aspect
 * ratio, with `padding` as a fraction of the fitted size on each side.
 */
export function fitScale(
  bounds: Bounds,
  viewportWidth: number,
  viewportHeight: number,
  padding = 1.12,
): number {
  const worldWidth = (bounds.maxX - bounds.minX) * padding
  const worldHeight = (bounds.maxY - bounds.minY) * padding
  const aspect = viewportHeight === 0 ? 1 : viewportWidth / viewportHeight

  let width = worldWidth
  let height = worldHeight

  if (aspect > worldWidth / worldHeight) {
    width = worldHeight * aspect
  } else {
    height = worldWidth / aspect
  }

  const horizontal = viewportWidth / width
  const vertical = viewportHeight / height

  return Math.min(horizontal, vertical)
}