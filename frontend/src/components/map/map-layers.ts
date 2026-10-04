import type { MessageKey } from '@/i18n/messages'

import {
  HAZARD_RAMP,
  IMPACT_RAMP,
  mapConsequenceBand,
  mapImpactBand,
  scoreColor,
  type MapBand,
  type MapTrilevel,
} from '@/lib/data-ramps'
import type { MapPointOut } from '@/types/api'

/**
 * The business concepts the map can plot, and how a marker looks under each.
 * A layer is *available* only when its stored results exist: condition is
 * available whenever the plotted records carry a recorded `observed_status`,
 * and risk/impact/consequence/preventive/restoration layers become available
 * only when the underlying stored results exist; the UI never fakes them.
 * Preventive and restoration read the backend's own stored
 * `*_priority_eligible`/`*_priority_score` fields verbatim - no ranking,
 * banding or threshold is computed here beyond the same presentation-only
 * colour binning already used for risk/impact/consequence.
 */
export const MAP_LAYERS = [
  'condition',
  'risk',
  'impact',
  'priority',
  'consequence',
  'preventive',
  'restoration',
] as const

export type MapLayerId = (typeof MAP_LAYERS)[number]

export type MarkerEncoding =
  | { kind: 'status'; tone: 'functional' | 'nonfunctional' | 'warning' | 'info' | 'neutral' }
  | { kind: 'ramp'; color: string; band: MapBand | MapTrilevel }

/** The label key for each layer, rendered by the layer switcher and legend. */
export const LAYER_LABEL_KEYS: Record<MapLayerId, MessageKey> = {
  condition: 'map.layer.condition',
  risk: 'map.layer.risk',
  impact: 'map.layer.impact',
  priority: 'map.layer.priority',
  consequence: 'map.layer.consequence',
  preventive: 'map.layer.preventive',
  restoration: 'map.layer.restoration',
}

/**
 * Derive the marker encoding for one real record under the active layer.
 * Records missing the value the layer encodes stay neutral — never recoloured
 * to imply zero risk or zero impact.
 */
export function encodeMarker(
  point: MapPointOut,
  layer: MapLayerId,
): MarkerEncoding {
  if (layer === 'condition') {
    const status = point.observed_status
    if (status === 'Functional') return { kind: 'status', tone: 'functional' }
    if (status === 'Non-Functional') return { kind: 'status', tone: 'nonfunctional' }
    if (status === 'Functional, needs repair') return { kind: 'status', tone: 'warning' }
    if (status === 'Non-Functional, dry season') return { kind: 'status', tone: 'warning' }
    if (status === 'Functional, not in use') return { kind: 'status', tone: 'info' }
    if (status === 'Abandoned/Decommissioned') return { kind: 'status', tone: 'neutral' }
    return { kind: 'status', tone: 'neutral' }
  }

  if (layer === 'risk') {
    if (point.probability_non_functional === null) {
      return { kind: 'status', tone: 'neutral' }
    }
    const value = point.probability_non_functional
    const band =
      value >= 0.75 ? 'high' : value >= 0.5 ? 'elevated' : value >= 0.25 ? 'moderate' : 'low'
    return { kind: 'ramp', color: scoreColor(value, 'risk'), band }
  }

  if (layer === 'impact') {
    if (point.impact_available !== true || point.impact_score === null) {
      return { kind: 'status', tone: 'neutral' }
    }
    const value = point.impact_score
    return { kind: 'ramp', color: scoreColor(value, 'impact'), band: mapImpactBand(value) }
  }

  if (layer === 'priority') {
    // Combined "High Risk + High Impact" view: each point reads whichever
    // backend priority_v2 pathway it actually qualifies for (never both, a
    // point is only ever eligible preventive XOR restoration by the backend's
    // own gating) - the score is never recomputed or blended here.
    if (point.preventive_priority_eligible === true && point.preventive_priority_score !== null) {
      const value = point.preventive_priority_score
      return { kind: 'ramp', color: scoreColor(value, 'consequence'), band: mapConsequenceBand(value) }
    }
    if (point.restoration_priority_eligible === true && point.restoration_priority_score !== null) {
      const value = point.restoration_priority_score
      return { kind: 'ramp', color: scoreColor(value, 'consequence'), band: mapConsequenceBand(value) }
    }
    return { kind: 'status', tone: 'neutral' }
  }

  if (layer === 'consequence') {
    if (point.risk_impact_index_available !== true || point.risk_impact_index === null) {
      return { kind: 'status', tone: 'neutral' }
    }
    const value = point.risk_impact_index
    return { kind: 'ramp', color: scoreColor(value, 'consequence'), band: mapConsequenceBand(value) }
  }

  if (layer === 'preventive') {
    if (point.preventive_priority_eligible !== true || point.preventive_priority_score === null) {
      return { kind: 'status', tone: 'neutral' }
    }
    const value = point.preventive_priority_score
    return { kind: 'ramp', color: scoreColor(value, 'consequence'), band: mapConsequenceBand(value) }
  }

  if (layer === 'restoration') {
    if (point.restoration_priority_eligible !== true || point.restoration_priority_score === null) {
      return { kind: 'status', tone: 'neutral' }
    }
    const value = point.restoration_priority_score
    return { kind: 'ramp', color: scoreColor(value, 'consequence'), band: mapConsequenceBand(value) }
  }

  return { kind: 'status', tone: 'neutral' }
}

/**
 * Availability of the risk layer, read from the real plotted records: it needs
 * at least one record with a stored probability. Nothing here invents risk.
 */
export function riskLayerAvailable(points: readonly MapPointOut[]): boolean {
  return points.some((point) => point.probability_non_functional !== null)
}

/** Availability of the impact layer: at least one plotted record has a
 * stored impact score. Nothing here invents an impact value. */
export function impactLayerAvailable(points: readonly MapPointOut[]): boolean {
  return points.some((point) => point.impact_available === true)
}

/** Availability of the consequence layer: at least one plotted record has a
 * stored risk-impact index. Nothing here invents a consequence value. */
export function consequenceLayerAvailable(points: readonly MapPointOut[]): boolean {
  return points.some((point) => point.risk_impact_index_available === true)
}

/** Availability of the combined priority layer: at least one plotted record
 * is eligible for either backend priority_v2 pathway. */
export function priorityLayerAvailable(points: readonly MapPointOut[]): boolean {
  return points.some(
    (point) => point.preventive_priority_eligible === true || point.restoration_priority_eligible === true,
  )
}

/** Availability of the preventive-priority layer: at least one plotted record
 * is actually eligible per the backend's own stored flag. */
export function preventiveLayerAvailable(points: readonly MapPointOut[]): boolean {
  return points.some((point) => point.preventive_priority_eligible === true)
}

/** Availability of the restoration-priority layer: at least one plotted record
 * is actually eligible per the backend's own stored flag. */
export function restorationLayerAvailable(points: readonly MapPointOut[]): boolean {
  return points.some((point) => point.restoration_priority_eligible === true)
}

/** Continuous ramp colours for the score layers' legend. */
export function layerRampStops(layer: MapLayerId): readonly string[] | null {
  if (layer === 'impact') {
    return IMPACT_RAMP
  }
  if (
    layer === 'risk' ||
    layer === 'priority' ||
    layer === 'consequence' ||
    layer === 'preventive' ||
    layer === 'restoration'
  ) {
    // Same hazard ramp the risk encoding uses; consequence/preventive/restoration
    // are combined relative signals so they share the hazard vocabulary, scaled 0–1.
    return HAZARD_RAMP
  }
  return null
}
