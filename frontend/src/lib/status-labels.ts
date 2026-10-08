import type { MessageKey } from '@/i18n/messages'

/**
 * Display labels for backend vocabulary. The stored value is never changed:
 * these only choose which translated label is shown for a known string, and
 * an unknown value is shown verbatim rather than guessed at.
 */
const OBSERVED_LABEL_KEYS: Record<string, MessageKey> = {
  Functional: 'observed.functional',
  'Functional, needs repair': 'observed.functionalNeedsRepair',
  'Functional, not in use': 'observed.functionalNotInUse',
  'Non-Functional': 'observed.nonFunctional',
  'Non-Functional, dry season': 'observed.nonFunctionalDrySeason',
  'Abandoned/Decommissioned': 'observed.abandoned',
  Others: 'observed.others',
}

const RISK_BAND_LABEL_KEYS: Record<string, MessageKey> = {
  Functional: 'riskBand.functional',
  'Non-Functional / Moderate Risk': 'riskBand.moderate',
  'Non-Functional / High Risk': 'riskBand.high',
}

export function observedStatusLabelKey(value: string | null): MessageKey | null {
  return value === null ? null : (OBSERVED_LABEL_KEYS[value] ?? null)
}

export function riskBandLabelKey(value: string | null): MessageKey | null {
  return value === null ? null : (RISK_BAND_LABEL_KEYS[value] ?? null)
}

/** Translated label for a known observed status, otherwise the stored text verbatim. */
export function observedStatusLabel(value: string, t: (key: MessageKey) => string): string {
  const key = observedStatusLabelKey(value)
  return key === null ? value : t(key)
}

/** Translated label for a known `risk_band`, otherwise the stored text verbatim. */
export function riskBandLabel(value: string, t: (key: MessageKey) => string): string {
  const key = riskBandLabelKey(value)
  return key === null ? value : t(key)
}
