from datetime import datetime
from pydantic import BaseModel, ConfigDict
class AdministrativeAreaOut(BaseModel):
    level: str
    name: str
    code: str | None
    region: str | None
    district: str | None
    bounds: tuple[float, float, float, float]

class AdministrativeMetadataOut(BaseModel):
    source: str
    version: str
    source_crs: str
    assignment_crs: str
    geometry_count: int
    invalid_geometry_count: int
    repaired_geometry_count: int

class WaterPointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; master_id: str; wpdx_id: str; latitude: float|None; longitude: float|None; observed_status: str|None; nbs_region: str|None; nbs_district: str|None; nbs_ward: str|None; nbs_ward_code: str|None; administrative_assignment_status: str|None; administrative_assignment_source: str|None; administrative_assignment_version: str|None; administrative_assignment_crs: str|None; survey_date: object|None; water_source: str|None; water_technology: str|None; water_tech_category: str|None; management_type: str|None; payment_type: str|None; install_year: int|None; age_at_survey_years: float|None; subjective_water_quality: str|None; n_water_points_within_1000m: int|None; dist_nearest_any_water_point_m: float|None; worldpop2022_pop_within_1000m: float|None; rain_3m_prior_mm: float|None; rain_3m_pct_of_normal: float|None; dry_months_prior12_lt30mm: float|None; dist_nearest_health_facility_m: float|None; dist_nearest_school_m: float|None
class MapPointOut(BaseModel):
    id: int; master_id: str; wpdx_id: str; latitude: float; longitude: float; observed_status: str|None; nbs_region: str|None; nbs_district: str|None; nbs_ward: str|None; administrative_assignment_status: str|None
    predicted_status: str|None=None; probability_non_functional: float|None=None; risk_band: str|None=None
    risk_available: bool|None=None
    probability_functional: float|None=None
    decision_threshold: float|None=None
    risk_band_note: str|None=None
    prediction_methodology_version: str|None=None
    impact_available: bool|None=None
    impact_score: float|None=None
    impact_high: bool|None=None
    population_component: float|None=None
    alternative_scarcity_component: float|None=None
    impact_methodology_version: str|None=None
    risk_impact_index_available: bool|None=None
    risk_impact_index: float|None=None
    risk_impact_index_note: str|None=None
    consequence_priority_methodology_version: str|None=None
    consequence_priority_unavailable_reason: str|None=None
    computed_at: datetime|None=None
    preventive_priority_eligible: bool|None=None
    preventive_priority_score: float|None=None
    preventive_priority_rank: int|None=None
    restoration_priority_eligible: bool|None=None
    restoration_priority_score: float|None=None
    restoration_priority_rank: int|None=None
    priority_methodology_version: str|None=None
class PageMeta(BaseModel):
    items: list[WaterPointOut]; page: int; page_size: int; total: int; total_pages: int
class MapPageMeta(BaseModel):
    items: list[MapPointOut]; page: int; page_size: int; total: int; total_pages: int
