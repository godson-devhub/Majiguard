from datetime import datetime
from pydantic import BaseModel


class PriorityItemOut(BaseModel):
    rank: int
    water_point_id: int
    master_id: str
    region: str | None
    district: str | None
    ward: str | None
    observed_status: str | None
    risk_band: str | None
    probability_non_functional: float | None
    impact_score: float | None
    impact_high: bool | None
    priority_score: float | None
    priority_type: str
    priority_methodology_version: str
    why_prioritized: list[str]
    recommended_action: str
    computed_at: datetime


class PriorityPageMeta(BaseModel):
    items: list[PriorityItemOut]
    page: int
    page_size: int
    total: int
    total_pages: int


class PrioritySummaryOut(BaseModel):
    total_water_points: int
    eligible_preventive: int
    eligible_restoration: int
    high_risk_functional: int
    observed_non_functional: int
    impact_available: int
    priority_methodology_version: str
    impact_high_threshold: float
    impact_high_threshold_version: str
    impact_high_national_count: int
    impact_high_preventive_count: int
    impact_high_restoration_count: int
