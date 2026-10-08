/**
 * Wire types for the frozen Step 8 MajiGuard API.
 *
 * These mirror `backend/app/schemas/*.py` and the generated OpenAPI document
 * field for field. Nullable in the contract means nullable here — no field is
 * widened to hide a type error, and no value is ever reinterpreted.
 *
 * `survey_date` is declared `object | None` by the backend, so it arrives as an
 * ISO `YYYY-MM-DD` string when present and `null` when it was not surveyed.
 */

export type HealthStatus = {
  status: string
}

export type AdministrativeArea = {
  level: 'region' | 'district' | 'ward'
  name: string
  code: string | null
  region: string | null
  district: string | null
  bounds: [number, number, number, number]
}

export type AdministrativeMetadata = {
  source: string
  version: string
  source_crs: string
  assignment_crs: string
  geometry_count: number
  invalid_geometry_count: number
  repaired_geometry_count: number
}

export type WaterPointOut = {
  id: number
  master_id: string
  wpdx_id: string
  latitude: number | null
  longitude: number | null
  /** Raw survey status, stored exactly as recorded. Never normalised here. */
  observed_status: string | null
  nbs_region: string | null
  nbs_district: string | null
  nbs_ward: string | null
  nbs_ward_code: string | null
  administrative_assignment_status: string | null
  administrative_assignment_source: string | null
  administrative_assignment_version: string | null
  administrative_assignment_crs: string | null
  survey_date: string | null
  water_source: string | null
  water_technology: string | null
  water_tech_category: string | null
  management_type: string | null
  payment_type: string | null
  install_year: number | null
  age_at_survey_years: number | null
  subjective_water_quality: string | null
  n_water_points_within_1000m: number | null
  dist_nearest_any_water_point_m: number | null
  worldpop2022_pop_within_1000m: number | null
  rain_3m_prior_mm: number | null
  rain_3m_pct_of_normal: number | null
  dry_months_prior12_lt30mm: number | null
  dist_nearest_health_facility_m: number | null
  dist_nearest_school_m: number | null
}

export type MapPointOut = {
  id: number
  master_id: string
  wpdx_id: string
  latitude: number
  longitude: number
  observed_status: string | null
  nbs_region: string | null
  nbs_district: string | null
  nbs_ward: string | null
  administrative_assignment_status: string | null
  /** Present only when a prediction has been stored for this water point. */
  predicted_status: string | null
  probability_non_functional: number | null
  risk_band: string | null
  risk_available: boolean | null
  probability_functional: number | null
  decision_threshold: number | null
  risk_band_note: string | null
  prediction_methodology_version: string | null
  impact_available: boolean | null
  impact_score: number | null
  /** Derived, deterministic classification of `impact_score` against the
   * approved national p90 cutoff (see `PrioritySummaryOut.impact_high_threshold`).
   * `null` exactly when `impact_score` itself is unavailable - never a false
   * negative standing in for "unknown". */
  impact_high: boolean | null
  population_component: number | null
  alternative_scarcity_component: number | null
  impact_methodology_version: string | null
  risk_impact_index_available: boolean | null
  risk_impact_index: number | null
  risk_impact_index_note: string | null
  consequence_priority_methodology_version: string | null
  consequence_priority_unavailable_reason: string | null
  computed_at: string | null
  preventive_priority_eligible: boolean | null
  preventive_priority_score: number | null
  preventive_priority_rank: number | null
  restoration_priority_eligible: boolean | null
  restoration_priority_score: number | null
  restoration_priority_rank: number | null
  priority_methodology_version: string | null
}

export type PageMeta = {
  items: WaterPointOut[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type MapPageMeta = {
  items: MapPointOut[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export type PredictionResponse = {
  id: number
  water_point_id: number
  probability_non_functional: number | null
  probability_functional: number | null
  predicted_status: string | null
  decision_threshold: number | null
  risk_band: string | null
  risk_band_note: string | null
  prediction_methodology_version: string
  computed_at: string
}

export type ImpactResponse = {
  id: number
  water_point_id: number
  impact_available: boolean
  impact_score: number | null
  population_component: number | null
  alternative_scarcity_component: number | null
  impact_unavailable_reason: string | null
  impact_methodology_version: string
  computed_at: string
}

export type ConsequenceResponse = {
  id: number
  water_point_id: number
  risk_available: boolean
  probability_non_functional: number | null
  probability_functional: number | null
  predicted_status: string | null
  decision_threshold: number | null
  risk_band: string | null
  risk_band_note: string | null
  prediction_methodology_version: string | null
  impact_available: boolean
  impact_score: number | null
  impact_methodology_version: string | null
  population_component: number | null
  alternative_scarcity_component: number | null
  risk_impact_index_available: boolean
  risk_impact_index: number | null
  risk_impact_index_note: string | null
  consequence_priority_methodology_version: string
  consequence_priority_unavailable_reason: string | null
  computed_at: string
}

export type ComputeResponse = {
  water_point: {
    id: number
    master_id: string
    wpdx_id: string
  }
  prediction: PredictionResponse
  impact: ImpactResponse
  consequence: ConsequenceResponse
}

export type WaterPointListParams = {
  page?: number
  page_size?: number
  observed_status?: string | null
  nbs_region?: string | null
  nbs_district?: string | null
  nbs_ward?: string | null
}

/**
 * Backend-ranked Priority Engine output (`GET /priority/preventive|restoration`).
 * `rank` is the national rank - it is never recomputed or re-ranked client-side,
 * including when a region/district/ward filter narrows the list.
 */
export type PriorityItemOut = {
  rank: number
  water_point_id: number
  master_id: string
  region: string | null
  district: string | null
  ward: string | null
  observed_status: string | null
  risk_band: string | null
  probability_non_functional: number | null
  impact_score: number | null
  /** Same deterministic High Impact classification as `MapPointOut.impact_high`. */
  impact_high: boolean | null
  priority_score: number | null
  priority_type: string
  priority_methodology_version: string
  why_prioritized: string[]
  recommended_action: string
  computed_at: string
}

export type PriorityPageMeta = {
  items: PriorityItemOut[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

/** `GET /priority/summary` - always national, never filtered. */
export type PrioritySummaryOut = {
  total_water_points: number
  eligible_preventive: number
  eligible_restoration: number
  high_risk_functional: number
  observed_non_functional: number
  impact_available: number
  priority_methodology_version: string
  /** Approved operational cutoff (currently the national p90 of `impact_score`)
   * and its own independently versioned classification - see
   * `impact_classification.py`'s docstring on the backend. Never a
   * scientifically "discovered" break; an explicit policy threshold. */
  impact_high_threshold: number
  impact_high_threshold_version: string
  /** National count at/above the cutoff, independent of either pathway's
   * eligibility - unlike `eligible_preventive`/`eligible_restoration`. */
  impact_high_national_count: number
  impact_high_preventive_count: number
  impact_high_restoration_count: number
}

export type PriorityListParams = {
  page?: number
  page_size?: number
  nbs_region?: string | null
  nbs_district?: string | null
  nbs_ward?: string | null
}
