import {
  isKnownObservedStatus,
  type ObservedStatusValue,
} from '@/lib/register-reference'

/**
 * Semantic tone for a recorded observed status.
 *
 * The register holds seven distinct status values (see `register-reference.ts`),
 * and each of them carries real operational meaning, so the known values map to
 * the status colour scale: functional green, hard non-function red, seasonal
 * and degraded conditions amber, idle-but-available teal. Values that are not
 * one of the seven — including any free survey text the register might grow —
 * resolve to no tone and stay neutral. `null` (not recorded) is neutral too.
 *
 * This maps a *stored survey status* to a presentation tone. It never
 * recomputes, ranks or derives anything: risk, impact and consequence are
 * model outputs and never take part in this mapping.
 */
export type StatusTone = 'functional' | 'nonfunctional' | 'warning' | 'info'

const STATUS_TONES: Record<ObservedStatusValue, StatusTone | null> = {
  'Functional': 'functional',
  'Functional, needs repair': 'warning',
  'Functional, not in use': 'info',
  'Non-Functional': 'nonfunctional',
  'Non-Functional, dry season': 'warning',
  // Permanently out of the service lifecycle, and unknown: no alarm tone.
  'Abandoned/Decommissioned': null,
  'Others': null,
}

/** The tone for a stored status, or `null` for unknown/unrecorded values. */
export function statusTone(value: string | null): StatusTone | null {
  if (value === null) {
    return null
  }
  if (!isKnownObservedStatus(value)) {
    return null
  }
  return STATUS_TONES[value]
}
