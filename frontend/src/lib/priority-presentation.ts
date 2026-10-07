import { mapImpactBand, type MapTrilevel } from '@/lib/data-ramps'
import type { MessageKey } from '@/i18n/messages'
import type { RegisterFilters } from '@/lib/register-reference'
import type { PriorityItemOut } from '@/types/api'

/**
 * Shared presentation logic for both Priority pathways (Overview's preview
 * and the full Priority page) - one design system, not two. Nothing here
 * computes risk, impact or priority: every function only maps an
 * already-backend-computed value onto a display tone or label.
 */

export type RiskTone = 'low' | 'moderate' | 'high'

/** The backend's fixed `recommended_action` enum, mapped to translated,
 * human-readable labels - the raw snake_case value never reaches the UI. An
 * unmapped value returns `null` so the caller can show it verbatim. */
const RECOMMENDED_ACTION_KEYS: Record<string, MessageKey> = {
  preventive_maintenance_assessment: 'priority.action.preventiveMaintenance',
  priority_restoration_assessment: 'priority.action.restorationAssessment',
}

/** The backend's fixed, small `why_prioritized` vocabulary (never free text),
 * mapped to translated labels. An unmapped string returns `null` so the caller
 * can show it verbatim rather than hide it. */
const WHY_REASON_KEYS: Record<string, MessageKey> = {
  'high risk of non-functionality': 'priority.why.highRisk',
  'observed non-functional': 'priority.why.observedNonFunctional',
  'high relative community impact': 'priority.why.highImpact',
  'high population exposure component': 'priority.why.populationExposure',
  'limited nearby water-point alternatives': 'priority.why.limitedAlternatives',
}

export function whyReasonLabelKey(reason: string): MessageKey | null {
  return WHY_REASON_KEYS[reason] ?? null
}

export function recommendedActionLabelKey(action: string): MessageKey | null {
  return RECOMMENDED_ACTION_KEYS[action] ?? null
}

/**
 * The frozen ML methodology's own `risk_band` vocabulary
 * (majiguard_ml/predict.py), mapped onto the three semantic risk tones used
 * throughout the application.
 */
export function riskBandTone(riskBand: string | null): RiskTone | null {
  if (riskBand === 'Functional') {
    return 'low'
  }
  if (riskBand === 'Non-Functional / Moderate Risk') {
    return 'moderate'
  }
  if (riskBand === 'Non-Functional / High Risk') {
    return 'high'
  }
  return null
}

/**
 * A restrained, non-alarming semantic tint for a whole row/card - the
 * existing `*-soft` surface at reduced opacity plus a thin leading-edge
 * accent border, never the saturated marker colour itself. Written as literal
 * class strings (not template-built) because Tailwind's build-time scanner
 * only picks up literal strings in source.
 */
const RISK_ROW_ACCENT: Record<RiskTone, string> = {
  low: 'border-s-2 border-risk-low bg-risk-low-soft/35 hover:bg-risk-low-soft/60',
  moderate: 'border-s-2 border-risk-moderate bg-risk-moderate-soft/35 hover:bg-risk-moderate-soft/60',
  high: 'border-s-2 border-risk-high bg-risk-high-soft/35 hover:bg-risk-high-soft/60',
}

const IMPACT_ROW_ACCENT: Record<MapTrilevel, string> = {
  low: 'border-s-2 border-impact-low bg-impact-low-soft/35 hover:bg-impact-low-soft/60',
  moderate: 'border-s-2 border-impact-moderate bg-impact-moderate-soft/35 hover:bg-impact-moderate-soft/60',
  high: 'border-s-2 border-impact-high bg-impact-high-soft/35 hover:bg-impact-high-soft/60',
}

export function riskRowAccent(tone: RiskTone | null): string {
  return tone === null ? '' : RISK_ROW_ACCENT[tone]
}

export function impactRowAccent(tone: MapTrilevel): string {
  return IMPACT_ROW_ACCENT[tone]
}

/** Preventive rows tint by the pathway's own gate signal (risk_band).
 * Restoration rows have no risk gate (they are already observed
 * non-functional), so they tint by the existing, already-presentation-only
 * `mapImpactBand()` helper instead - the same one the map legend uses. Both
 * are display only, never a count or a classification claim. */
export function priorityRowAccent(item: PriorityItemOut): string {
  if (item.priority_type === 'preventive') {
    return riskRowAccent(riskBandTone(item.risk_band))
  }
  return impactRowAccent(mapImpactBand(item.priority_score ?? 0))
}

export function formatLocation(item: PriorityItemOut): string {
  return [item.region, item.district, item.ward]
    .filter((part): part is string => part !== null)
    .join(' · ')
}

/** The required deep-link contract: `/priority?type=preventive|restoration` -
 * never a generic, context-free `/priority` link. */
export function priorityHref(variant: 'preventive' | 'restoration'): string {
  return `/priority?type=${variant}`
}

/** The active Region/District/Ward scope, as one human-readable label -
 * shared by every screen that filters through `RegisterFilterBar` (Overview,
 * the Priority page, the Decision Map), so the same filter always reads the
 * same way. */
export function scopeLabel(filters: RegisterFilters, t: (key: MessageKey) => string): string {
  if (filters.region === null) {
    return t('filters.allRegions')
  }
  return [filters.region, filters.district, filters.ward].filter((part) => part !== null).join(' · ')
}
