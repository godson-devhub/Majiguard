from __future__ import annotations
from math import ceil
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.db.models import ConsequenceResult, PriorityResult, WaterPoint
from app.core.methodology import PRIORITY_METHODOLOGY_VERSION


class WaterPointRepository:
    def __init__(self, db: Session): self.db = db
    def get_by_id(self, water_point_id: int) -> WaterPoint | None: return self.db.get(WaterPoint, water_point_id)
    def get_by_master_id(self, master_id: str) -> WaterPoint | None: return self.db.scalar(select(WaterPoint).where(WaterPoint.master_id == master_id))
    def get_by_wpdx_id(self, wpdx_id: str) -> WaterPoint | None: return self.db.scalar(select(WaterPoint).where(WaterPoint.wpdx_id == wpdx_id))
    def _filtered(self, observed_status: str | None, nbs_region: str | None, nbs_district: str | None = None, nbs_ward: str | None = None):
        stmt = select(WaterPoint)
        if observed_status is not None: stmt = stmt.where(WaterPoint.observed_status == observed_status)
        if nbs_region is not None: stmt = stmt.where(WaterPoint.nbs_region == nbs_region)
        if nbs_district is not None: stmt = stmt.where(WaterPoint.nbs_district == nbs_district)
        if nbs_ward is not None: stmt = stmt.where(WaterPoint.nbs_ward == nbs_ward)
        return stmt
    def count(self, *, observed_status=None, nbs_region=None, nbs_district=None, nbs_ward=None) -> int:
        stmt = select(func.count()).select_from(WaterPoint)
        if observed_status is not None: stmt = stmt.where(WaterPoint.observed_status == observed_status)
        if nbs_region is not None: stmt = stmt.where(WaterPoint.nbs_region == nbs_region)
        if nbs_district is not None: stmt = stmt.where(WaterPoint.nbs_district == nbs_district)
        if nbs_ward is not None: stmt = stmt.where(WaterPoint.nbs_ward == nbs_ward)
        return int(self.db.scalar(stmt) or 0)
    def list(self, *, page=1, page_size=50, observed_status=None, nbs_region=None, nbs_district=None, nbs_ward=None) -> list[WaterPoint]:
        stmt = self._filtered(observed_status,nbs_region,nbs_district,nbs_ward).order_by(WaterPoint.id).offset((page-1)*page_size).limit(page_size)
        return list(self.db.scalars(stmt).all())
    def list_for_map(self, *, page=1, page_size=500, observed_status=None, nbs_region=None, nbs_district=None, nbs_ward=None) -> list[dict[str, Any]]:
        latest = select(ConsequenceResult.id).where(ConsequenceResult.water_point_id == WaterPoint.id).order_by(ConsequenceResult.computed_at.desc(), ConsequenceResult.id.desc()).limit(1).correlate(WaterPoint).scalar_subquery()

        PreventivePriority = aliased(PriorityResult)
        RestorationPriority = aliased(PriorityResult)
        # Restricted to the current methodology version so a differently-versioned
        # (e.g. broken) recompute can never outrank a valid current-version row
        # just by being newer - same guard as PriorityRepository._latest_ids.
        latest_preventive = select(PriorityResult.id).where(PriorityResult.water_point_id == WaterPoint.id, PriorityResult.priority_type == "preventive", PriorityResult.priority_methodology_version == PRIORITY_METHODOLOGY_VERSION).order_by(PriorityResult.computed_at.desc(), PriorityResult.id.desc()).limit(1).correlate(WaterPoint).scalar_subquery()
        latest_restoration = select(PriorityResult.id).where(PriorityResult.water_point_id == WaterPoint.id, PriorityResult.priority_type == "restoration", PriorityResult.priority_methodology_version == PRIORITY_METHODOLOGY_VERSION).order_by(PriorityResult.computed_at.desc(), PriorityResult.id.desc()).limit(1).correlate(WaterPoint).scalar_subquery()

        stmt = select(
            WaterPoint.id,WaterPoint.master_id,WaterPoint.wpdx_id,WaterPoint.latitude,WaterPoint.longitude,WaterPoint.observed_status,WaterPoint.nbs_region,WaterPoint.nbs_district,WaterPoint.nbs_ward,WaterPoint.administrative_assignment_status,
            ConsequenceResult.risk_available,
            ConsequenceResult.probability_non_functional,
            ConsequenceResult.probability_functional,
            ConsequenceResult.predicted_status,
            ConsequenceResult.decision_threshold,
            ConsequenceResult.risk_band,
            ConsequenceResult.risk_band_note,
            ConsequenceResult.prediction_methodology_version,
            ConsequenceResult.impact_available,
            ConsequenceResult.impact_score,
            ConsequenceResult.population_component,
            ConsequenceResult.alternative_scarcity_component,
            ConsequenceResult.impact_methodology_version,
            ConsequenceResult.risk_impact_index_available,
            ConsequenceResult.risk_impact_index,
            ConsequenceResult.risk_impact_index_note,
            ConsequenceResult.consequence_priority_methodology_version,
            ConsequenceResult.consequence_priority_unavailable_reason,
            ConsequenceResult.computed_at,
            PreventivePriority.eligible.label("preventive_priority_eligible"),
            PreventivePriority.priority_score.label("preventive_priority_score"),
            PreventivePriority.priority_rank.label("preventive_priority_rank"),
            RestorationPriority.eligible.label("restoration_priority_eligible"),
            RestorationPriority.priority_score.label("restoration_priority_score"),
            RestorationPriority.priority_rank.label("restoration_priority_rank"),
            func.coalesce(PreventivePriority.priority_methodology_version, RestorationPriority.priority_methodology_version).label("priority_methodology_version"),
        ).join(ConsequenceResult, ConsequenceResult.id == latest, isouter=True
        ).join(PreventivePriority, PreventivePriority.id == latest_preventive, isouter=True
        ).join(RestorationPriority, RestorationPriority.id == latest_restoration, isouter=True
        ).where(WaterPoint.latitude.is_not(None),WaterPoint.longitude.is_not(None))
        if observed_status is not None: stmt=stmt.where(WaterPoint.observed_status==observed_status)
        if nbs_region is not None: stmt=stmt.where(WaterPoint.nbs_region==nbs_region)
        if nbs_district is not None: stmt=stmt.where(WaterPoint.nbs_district==nbs_district)
        if nbs_ward is not None: stmt=stmt.where(WaterPoint.nbs_ward==nbs_ward)
        stmt=stmt.order_by(WaterPoint.id).offset((page-1)*page_size).limit(page_size)
        return [dict(r) for r in self.db.execute(stmt).mappings().all()]





