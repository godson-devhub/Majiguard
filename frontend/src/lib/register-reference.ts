/**
 * Filter vocabulary for the water-point register.
 *
 * These are the *labels* a user needs in order to filter â€” nothing more. Every
 * number shown next to them comes from the API at runtime, never from this file.
 *
 * Provenance: both lists were read once, read-only, from the frozen register
 * (`observed_status` has 7 distinct values; `nbs_region` has 23). They are held
 * here because the frozen API exposes no "distinct values" endpoint, and a
 * free-text box would be a worse control for a 7- and 23-value vocabulary.
 *
 * If the register's vocabulary changes, the API totals for the affected entries
 * fall to zero rather than showing a stale count.
 */

/**
 * Survey status exactly as recorded in the register. These strings are free
 * survey text, not a controlled vocabulary: they are displayed and filtered
 * verbatim and are never assigned semantic colours.
 */
export const OBSERVED_STATUS_VALUES = [
  'Functional',
  'Functional, needs repair',
  'Functional, not in use',
  'Non-Functional',
  'Non-Functional, dry season',
  'Abandoned/Decommissioned',
  'Others',
] as const

export type ObservedStatusValue = (typeof OBSERVED_STATUS_VALUES)[number]

/** NBS regions present in the register, used to populate the region filter. */
export const REGION_VALUES = [
  'Arusha',
  'Dodoma',
  'Geita',
  'Iringa',
  'Kagera',
  'Kigoma',
  'Kilimanjaro',
  'Lindi',
  'Manyara',
  'Mara',
  'Morogoro',
  'Mtwara',
  'Mwanza',
  'Njombe',
  'Pwani',
  'Rukwa',
  'Ruvuma',
  'Shinyanga',
  'Simiyu',
  'Singida',
  'Songwe',
  'Tabora',
  'Tanga',
] as const

export type RegionValue = (typeof REGION_VALUES)[number]

/** Maps an arbitrary stored status string onto a filter value, if it is one. */
export function isKnownObservedStatus(
  value: string,
): value is ObservedStatusValue {
  return (OBSERVED_STATUS_VALUES as readonly string[]).includes(value)
}

export function isKnownRegion(value: string): value is RegionValue {
  return (REGION_VALUES as readonly string[]).includes(value)
}

/** The register's two supported filters. `null` means "no filter on this field". */
export type RegisterFilters = {
  region: string | null
  status: string | null
  district?: string | null
  ward?: string | null
}

export const EMPTY_FILTERS: RegisterFilters = { region: null, status: null, district: null, ward: null }
