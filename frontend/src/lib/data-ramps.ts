/**
 * Presentation-only colour ramps for score-driven data visuals.
 *
 * These interpolate the existing MajiGuard ramp colours by value. They never
 * compute, rank, threshold, band or re-derive any model quantity: a stored
 * score from the API is mapped onto a colour ramp for display only. The bands
 * themselves (`risk_band` etc.) come only from the backend. Where the API
 * supplies its own band, the UI always labels with the API's band; this file's
 * binning (`mapRiskBand`, `mapImpactBand`, `mapConsequenceBand`) exists only
 * because the list endpoint carries a bare score with no band, and the map
 * needs a documented, stable colour mapping for display.
 */

export function mixHex(a: string, b: string, t: number): string {
  const clamped = Math.min(Math.max(t, 0), 1)
  const ar = Number.parseInt(a.slice(1, 3), 16)
  const ag = Number.parseInt(a.slice(3, 5), 16)
  const ab = Number.parseInt(a.slice(5, 7), 16)
  const br = Number.parseInt(b.slice(1, 3), 16)
  const bg = Number.parseInt(b.slice(3, 5), 16)
  const bb = Number.parseInt(b.slice(5, 7), 16)
  const r = Math.round(ar + (br - ar) * clamped)
  const g = Math.round(ag + (bg - ag) * clamped)
  const bl = Math.round(ab + (bb - ab) * clamped)
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`
}

/** Multi-stop ramp: `stops` = pairs of hex colours. `t` in [0, 1]. */
export function rampHex(stops: readonly string[], t: number): string {
  if (stops.length < 2) {
    return stops[0] ?? '#000000'
  }
  const clamped = Math.min(Math.max(t, 0), 1)
  const scaled = clamped * (stops.length - 1)
  const lower = Math.floor(scaled)
  const upper = Math.min(lower + 1, stops.length - 1)
  return mixHex(stops[lower] ?? '#000000', stops[upper] ?? '#000000', scaled - lower)
}

/**
 * Hazard ramp — amber to deep red, derived from the existing hazard primitives.
 * Used for stored risk scores and for the stored consequence index.
 */
export const HAZARD_RAMP = [
  '#fbbf24', // mg-hazard-400
  '#f97316', // mg-hazard-500
  '#ea580c', // mg-hazard-600b
  '#dc2626', // mg-hazard-600c
  '#991b1b', // mg-hazard-800c
] as const

/** Teal ramp — light to deep, derived from the existing impact primitives. */
export const IMPACT_RAMP = [
  '#7dd3fc', // mg-teal-300
  '#22a5b8', // mg-teal-500
  '#0e7490', // mg-teal-600
  '#0f5f75', // mg-teal-700
  '#083744', // mg-teal-900
] as const

export type MapBand = 'low' | 'moderate' | 'elevated' | 'high'

/**
 * Four-way presentation binning of a stored continuous score in [0, 1] into
 * the same vocabulary the tokens already provide (low / moderate / elevated /
 * high). Where the backend supplies `risk_band`, the UI labels use the API's
 * value instead of this function's result.
 */
export function mapRiskBand(value: number): MapBand {
  if (value >= 0.75) return 'high'
  if (value >= 0.5) return 'elevated'
  if (value >= 0.25) return 'moderate'
  return 'low'
}

/** Three-way presentation binning for impact and consequence scores. */
export type MapTrilevel = 'low' | 'moderate' | 'high'

export function mapImpactBand(value: number): MapTrilevel {
  if (value >= 0.67) return 'high'
  if (value >= 0.33) return 'moderate'
  return 'low'
}

export function mapConsequenceBand(value: number): MapTrilevel {
  if (value >= 0.67) return 'high'
  if (value >= 0.33) return 'moderate'
  return 'low'
}

/**
 * Continuous colour for a stored score, chosen from the given ramp, using the
 * banded anchors so the continuous ramp agrees with the discrete map bands.
 */
export function scoreColor(
  value: number,
  kind: 'risk' | 'impact' | 'consequence',
): string {
  const ramp = kind === 'impact' ? IMPACT_RAMP : HAZARD_RAMP
  return rampHex(ramp, value)
}
