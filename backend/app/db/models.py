from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class WaterPoint(Base):
    """Stable application identity plus source observation/context fields."""

    __tablename__ = "water_points"
    __table_args__ = (
        UniqueConstraint("master_id", name="uq_water_points_master_id"),
        UniqueConstraint("wpdx_id", name="uq_water_points_wpdx_id"),
        UniqueConstraint("row_id_export", name="uq_water_points_row_id_export"),
        CheckConstraint("latitude IS NULL OR latitude BETWEEN -90 AND 90", name="ck_water_points_latitude"),
        CheckConstraint("longitude IS NULL OR longitude BETWEEN -180 AND 180", name="ck_water_points_longitude"),
        Index("ix_water_points_map_coordinates", "latitude", "longitude"),
        Index("ix_water_points_nbs_region", "nbs_region"),
        Index("ix_water_points_observed_status", "observed_status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    master_id: Mapped[str] = mapped_column(String(128), nullable=False)
    wpdx_id: Mapped[str] = mapped_column(String(128), nullable=False)
    row_id_export: Mapped[str] = mapped_column(String(128), nullable=False)

    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)
    survey_date: Mapped[Optional[date]] = mapped_column(Date)
    survey_year: Mapped[Optional[int]] = mapped_column(Integer)
    survey_month: Mapped[Optional[int]] = mapped_column(Integer)

    source_dataset_title: Mapped[Optional[str]] = mapped_column(Text)
    source_org: Mapped[Optional[str]] = mapped_column(Text)
    observed_status: Mapped[Optional[str]] = mapped_column(Text)
    observed_status_id: Mapped[Optional[str]] = mapped_column(String(32))
    status_raw_text: Mapped[Optional[str]] = mapped_column(Text)
    label_functional_status: Mapped[Optional[float]] = mapped_column(Float)
    label_functional_status_id: Mapped[Optional[int]] = mapped_column(Integer)

    water_source: Mapped[Optional[str]] = mapped_column(Text)
    water_technology: Mapped[Optional[str]] = mapped_column(Text)
    water_tech_category: Mapped[Optional[str]] = mapped_column(Text)
    management_type: Mapped[Optional[str]] = mapped_column(Text)
    payment_type: Mapped[Optional[str]] = mapped_column(Text)
    installer: Mapped[Optional[str]] = mapped_column(Text)
    install_year: Mapped[Optional[int]] = mapped_column(Integer)
    age_at_survey_years: Mapped[Optional[float]] = mapped_column(Float)
    usage_capacity: Mapped[Optional[float]] = mapped_column(Float)
    subjective_water_quality: Mapped[Optional[str]] = mapped_column(Text)

    inside_tz_adm0: Mapped[Optional[bool]] = mapped_column(Boolean)
    dist_to_tz_border_m: Mapped[Optional[float]] = mapped_column(Float)
    nbs_region: Mapped[Optional[str]] = mapped_column(Text)
    nbs_district: Mapped[Optional[str]] = mapped_column(Text)
    nbs_ward: Mapped[Optional[str]] = mapped_column(Text)
    nbs_ward_code: Mapped[Optional[str]] = mapped_column(String(64))
    administrative_assignment_source: Mapped[Optional[str]] = mapped_column(Text)
    administrative_assignment_version: Mapped[Optional[str]] = mapped_column(String(64))
    administrative_assignment_status: Mapped[Optional[str]] = mapped_column(String(64))
    administrative_assignment_crs: Mapped[Optional[str]] = mapped_column(String(64))
    wpdx_adm1_region: Mapped[Optional[str]] = mapped_column(Text)
    wpdx_adm2_district: Mapped[Optional[str]] = mapped_column(Text)
    wpdx_region_matches_nbs: Mapped[Optional[bool]] = mapped_column(Boolean)
    wpdx_is_urban: Mapped[Optional[bool]] = mapped_column(Boolean)

    dist_nearest_any_water_point_m: Mapped[Optional[float]] = mapped_column(Float)
    n_water_points_within_500m: Mapped[Optional[int]] = mapped_column(Integer)
    n_water_points_within_1000m: Mapped[Optional[int]] = mapped_column(Integer)
    n_water_points_within_5000m: Mapped[Optional[int]] = mapped_column(Integer)
    wpdx_is_duplicate_flag: Mapped[Optional[bool]] = mapped_column(Boolean)
    n_history_observations: Mapped[Optional[int]] = mapped_column(Integer)
    wpdx_dist_primary_road_m: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_dist_secondary_road_m: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_dist_tertiary_road_m: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_dist_city_m: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_dist_town_m: Mapped[Optional[float]] = mapped_column(Float)

    wpdx_local_population_1km: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_water_point_population_leaky: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_crucialness_score_leaky: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_pressure_score_leaky: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_rehab_priority_leaky: Mapped[Optional[float]] = mapped_column(Float)
    wpdx_pop_would_gain_access_leaky: Mapped[Optional[float]] = mapped_column(Float)
    dist_nearest_functional_other_m_leaky: Mapped[Optional[float]] = mapped_column(Float)

    rain_3m_prior_mm: Mapped[Optional[float]] = mapped_column(Float)
    rain_3m_pct_of_normal: Mapped[Optional[float]] = mapped_column(Float)
    rain_3m_z: Mapped[Optional[float]] = mapped_column(Float)
    rain_6m_prior_mm: Mapped[Optional[float]] = mapped_column(Float)
    rain_6m_pct_of_normal: Mapped[Optional[float]] = mapped_column(Float)
    rain_6m_z: Mapped[Optional[float]] = mapped_column(Float)
    rain_12m_prior_mm: Mapped[Optional[float]] = mapped_column(Float)
    rain_12m_pct_of_normal: Mapped[Optional[float]] = mapped_column(Float)
    rain_12m_z: Mapped[Optional[float]] = mapped_column(Float)
    rain_mean_annual_1991_2020_mm: Mapped[Optional[float]] = mapped_column(Float)
    dry_months_prior12_lt30mm: Mapped[Optional[float]] = mapped_column(Float)
    rain_features_available: Mapped[Optional[bool]] = mapped_column(Boolean)

    worldpop2022_pop_within_500m: Mapped[Optional[float]] = mapped_column(Float)
    worldpop2022_pop_within_1000m: Mapped[Optional[float]] = mapped_column(Float)
    worldpop2022_pop_within_2000m: Mapped[Optional[float]] = mapped_column(Float)
    worldpop2022_density_per_km2_1km: Mapped[Optional[float]] = mapped_column(Float)
    dist_nearest_health_facility_m: Mapped[Optional[float]] = mapped_column(Float)
    dist_nearest_school_m: Mapped[Optional[float]] = mapped_column(Float)

    prediction_results: Mapped[list["PredictionResult"]] = relationship(back_populates="water_point")
    impact_results: Mapped[list["ImpactResult"]] = relationship(back_populates="water_point")
    consequence_results: Mapped[list["ConsequenceResult"]] = relationship(back_populates="water_point")
    priority_results: Mapped[list["PriorityResult"]] = relationship(back_populates="water_point")


class PredictionResult(Base):
    __tablename__ = "prediction_results"
    __table_args__ = (
        CheckConstraint("probability_non_functional IS NULL OR probability_non_functional BETWEEN 0 AND 1", name="ck_prediction_nonfunctional_probability"),
        CheckConstraint("probability_functional IS NULL OR probability_functional BETWEEN 0 AND 1", name="ck_prediction_functional_probability"),
        CheckConstraint("decision_threshold IS NULL OR decision_threshold BETWEEN 0 AND 1", name="ck_prediction_decision_threshold"),
        Index("ix_prediction_results_predicted_status", "predicted_status"),
        Index("ix_prediction_results_risk_band", "risk_band"),
        Index("ix_prediction_results_probability_non_functional", "probability_non_functional"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    water_point_id: Mapped[int] = mapped_column(ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False)
    probability_non_functional: Mapped[Optional[float]] = mapped_column(Float)
    probability_functional: Mapped[Optional[float]] = mapped_column(Float)
    predicted_status: Mapped[Optional[str]] = mapped_column(String(64))
    decision_threshold: Mapped[Optional[float]] = mapped_column(Float)
    risk_band: Mapped[Optional[str]] = mapped_column(String(32))
    risk_band_note: Mapped[Optional[str]] = mapped_column(Text)
    prediction_methodology_version: Mapped[str] = mapped_column(String(64), nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    water_point: Mapped[WaterPoint] = relationship(back_populates="prediction_results")


class ImpactResult(Base):
    __tablename__ = "impact_results"
    __table_args__ = (
        Index("ix_impact_results_impact_score", "impact_score"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    water_point_id: Mapped[int] = mapped_column(ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False)
    impact_available: Mapped[bool] = mapped_column(Boolean, nullable=False)
    impact_score: Mapped[Optional[float]] = mapped_column(Float)
    population_component: Mapped[Optional[float]] = mapped_column(Float)
    alternative_scarcity_component: Mapped[Optional[float]] = mapped_column(Float)
    impact_unavailable_reason: Mapped[Optional[str]] = mapped_column(Text)
    impact_methodology_version: Mapped[str] = mapped_column(String(64), nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    water_point: Mapped[WaterPoint] = relationship(back_populates="impact_results")


class ConsequenceResult(Base):
    __tablename__ = "consequence_results"
    __table_args__ = (
        Index("ix_consequence_results_risk_impact_index", "risk_impact_index"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    water_point_id: Mapped[int] = mapped_column(ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False)
    risk_available: Mapped[bool] = mapped_column(Boolean, nullable=False)
    probability_non_functional: Mapped[Optional[float]] = mapped_column(Float)
    probability_functional: Mapped[Optional[float]] = mapped_column(Float)
    predicted_status: Mapped[Optional[str]] = mapped_column(String(64))
    decision_threshold: Mapped[Optional[float]] = mapped_column(Float)
    risk_band: Mapped[Optional[str]] = mapped_column(String(32))
    risk_band_note: Mapped[Optional[str]] = mapped_column(Text)
    prediction_methodology_version: Mapped[Optional[str]] = mapped_column(String(64))
    impact_available: Mapped[bool] = mapped_column(Boolean, nullable=False)
    impact_score: Mapped[Optional[float]] = mapped_column(Float)
    impact_methodology_version: Mapped[Optional[str]] = mapped_column(String(64))
    population_component: Mapped[Optional[float]] = mapped_column(Float)
    alternative_scarcity_component: Mapped[Optional[float]] = mapped_column(Float)
    risk_impact_index_available: Mapped[bool] = mapped_column(Boolean, nullable=False)
    risk_impact_index: Mapped[Optional[float]] = mapped_column(Float)
    risk_impact_index_note: Mapped[Optional[str]] = mapped_column(Text)
    consequence_priority_methodology_version: Mapped[str] = mapped_column(String(64), nullable=False)
    consequence_priority_unavailable_reason: Mapped[Optional[str]] = mapped_column(Text)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    water_point: Mapped[WaterPoint] = relationship(back_populates="consequence_results")


class PriorityResult(Base):
    """Backend-owned Priority Engine output. One row per (water_point, priority_type)
    computation pass. `priority_type` is always 'preventive' or 'restoration' - the two
    pathways are never combined into a single ranking. `eligible=False` rows document why
    a point was not ranked (see `priority_unavailable_reason`) rather than being omitted,
    matching the transparency convention already used by ConsequenceResult."""

    __tablename__ = "priority_results"
    __table_args__ = (
        CheckConstraint("priority_type IN ('preventive','restoration')", name="ck_priority_results_type"),
        Index("ix_priority_results_water_point_type", "water_point_id", "priority_type"),
        Index("ix_priority_results_type_rank", "priority_type", "priority_rank"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    water_point_id: Mapped[int] = mapped_column(ForeignKey("water_points.id", ondelete="CASCADE"), nullable=False)
    priority_type: Mapped[str] = mapped_column(String(32), nullable=False)
    eligible: Mapped[bool] = mapped_column(Boolean, nullable=False)
    priority_score: Mapped[Optional[float]] = mapped_column(Float)
    priority_rank: Mapped[Optional[int]] = mapped_column(Integer)
    probability_non_functional: Mapped[Optional[float]] = mapped_column(Float)
    impact_score: Mapped[Optional[float]] = mapped_column(Float)
    risk_band: Mapped[Optional[str]] = mapped_column(String(32))
    observed_status: Mapped[Optional[str]] = mapped_column(Text)
    impact_above_median: Mapped[Optional[bool]] = mapped_column(Boolean)
    population_above_median: Mapped[Optional[bool]] = mapped_column(Boolean)
    alternative_scarcity_above_median: Mapped[Optional[bool]] = mapped_column(Boolean)
    priority_methodology_version: Mapped[str] = mapped_column(String(64), nullable=False)
    priority_unavailable_reason: Mapped[Optional[str]] = mapped_column(Text)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    water_point: Mapped[WaterPoint] = relationship(back_populates="priority_results")
