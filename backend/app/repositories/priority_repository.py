from __future__ import annotations
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import ConsequenceResult, PriorityResult, WaterPoint


class PriorityRepository:
    """Reads the Priority Engine's stored output. Ranks and scores are never
    recomputed here - this repository only selects the latest stored row per
    (water_point_id, priority_type), using the same id-ordered tie-break
    convention as the other result repositories."""

    def __init__(self, db: Session):
        self.db = db

    def _latest_ids(self, priority_type: str, methodology_version: str):
        """Latest row per water point for *this exact methodology version only*.

        Selecting by bare MAX(id)/computed_at across all versions would let a
        newer but differently-versioned (e.g. broken) recompute silently shadow
        a still-valid older version's results. Restricting the candidate rows
        to `methodology_version` before taking MAX(id) means a row from any
        other version is never eligible to be "latest" here."""
        return (
            select(func.max(PriorityResult.id).label("id"))
            .where(
                PriorityResult.priority_type == priority_type,
                PriorityResult.priority_methodology_version == methodology_version,
            )
            .group_by(PriorityResult.water_point_id)
            .subquery()
        )

    def _ranked_query(self, priority_type: str, methodology_version: str, nbs_region: str | None, nbs_district: str | None, nbs_ward: str | None):
        latest_ids = self._latest_ids(priority_type, methodology_version)
        stmt = (
            select(
                WaterPoint.id,
                WaterPoint.master_id,
                WaterPoint.nbs_region,
                WaterPoint.nbs_district,
                WaterPoint.nbs_ward,
                PriorityResult.priority_type,
                PriorityResult.priority_score,
                PriorityResult.priority_rank,
                PriorityResult.probability_non_functional,
                PriorityResult.impact_score,
                PriorityResult.risk_band,
                PriorityResult.observed_status,
                PriorityResult.impact_above_median,
                PriorityResult.population_above_median,
                PriorityResult.alternative_scarcity_above_median,
                PriorityResult.priority_methodology_version,
                PriorityResult.computed_at,
            )
            .join(PriorityResult, PriorityResult.water_point_id == WaterPoint.id)
            .join(latest_ids, latest_ids.c.id == PriorityResult.id)
            .where(PriorityResult.priority_type == priority_type, PriorityResult.eligible.is_(True), PriorityResult.priority_rank.is_not(None))
        )
        if nbs_region is not None: stmt = stmt.where(WaterPoint.nbs_region == nbs_region)
        if nbs_district is not None: stmt = stmt.where(WaterPoint.nbs_district == nbs_district)
        if nbs_ward is not None: stmt = stmt.where(WaterPoint.nbs_ward == nbs_ward)
        return stmt

    def list_ranked(self, *, priority_type: str, methodology_version: str, page: int = 1, page_size: int = 50, nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None) -> list[dict[str, Any]]:
        stmt = self._ranked_query(priority_type, methodology_version, nbs_region, nbs_district, nbs_ward).order_by(PriorityResult.priority_rank.asc()).offset((page - 1) * page_size).limit(page_size)
        return [dict(r) for r in self.db.execute(stmt).mappings().all()]

    def count_ranked(self, *, priority_type: str, methodology_version: str, nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None) -> int:
        latest_ids = self._latest_ids(priority_type, methodology_version)
        stmt = (
            select(func.count())
            .select_from(WaterPoint)
            .join(PriorityResult, PriorityResult.water_point_id == WaterPoint.id)
            .join(latest_ids, latest_ids.c.id == PriorityResult.id)
            .where(PriorityResult.priority_type == priority_type, PriorityResult.eligible.is_(True), PriorityResult.priority_rank.is_not(None))
        )
        if nbs_region is not None: stmt = stmt.where(WaterPoint.nbs_region == nbs_region)
        if nbs_district is not None: stmt = stmt.where(WaterPoint.nbs_district == nbs_district)
        if nbs_ward is not None: stmt = stmt.where(WaterPoint.nbs_ward == nbs_ward)
        return int(self.db.scalar(stmt) or 0)

    def get_latest_by_water_point(self, water_point_id: int, priority_type: str, methodology_version: str) -> PriorityResult | None:
        return self.db.scalar(
            select(PriorityResult)
            .where(
                PriorityResult.water_point_id == water_point_id,
                PriorityResult.priority_type == priority_type,
                PriorityResult.priority_methodology_version == methodology_version,
            )
            .order_by(PriorityResult.computed_at.desc(), PriorityResult.id.desc())
        )

    def count_high_impact(self, cutoff: float) -> int:
        """National count of points at or above the High Impact cutoff -
        independent of either pathway's eligibility, unlike `summary()`'s
        `eligible_*` counts."""
        latest_consequence_ids = select(func.max(ConsequenceResult.id).label("id")).group_by(ConsequenceResult.water_point_id).subquery()
        stmt = (
            select(func.count())
            .select_from(WaterPoint)
            .join(ConsequenceResult, ConsequenceResult.water_point_id == WaterPoint.id)
            .join(latest_consequence_ids, latest_consequence_ids.c.id == ConsequenceResult.id)
            .where(ConsequenceResult.impact_score >= cutoff)
        )
        return int(self.db.scalar(stmt) or 0)

    def summary(self, *, methodology_version: str) -> dict[str, int]:
        counts: dict[str, int] = {"total_water_points": int(self.db.scalar(select(func.count()).select_from(WaterPoint)) or 0)}
        for priority_type in ("preventive", "restoration"):
            latest_ids = self._latest_ids(priority_type, methodology_version)
            eligible_stmt = (
                select(func.count())
                .select_from(PriorityResult)
                .join(latest_ids, latest_ids.c.id == PriorityResult.id)
                .where(PriorityResult.priority_type == priority_type, PriorityResult.eligible.is_(True))
            )
            counts[f"eligible_{priority_type}"] = int(self.db.scalar(eligible_stmt) or 0)

        latest_consequence_ids = select(func.max(ConsequenceResult.id).label("id")).group_by(ConsequenceResult.water_point_id).subquery()
        high_risk_functional_stmt = (
            select(func.count())
            .select_from(WaterPoint)
            .join(ConsequenceResult, ConsequenceResult.water_point_id == WaterPoint.id)
            .join(latest_consequence_ids, latest_consequence_ids.c.id == ConsequenceResult.id)
            .where(WaterPoint.observed_status == "Functional", ConsequenceResult.risk_band == "Non-Functional / High Risk")
        )
        counts["high_risk_functional"] = int(self.db.scalar(high_risk_functional_stmt) or 0)

        counts["observed_non_functional"] = int(self.db.scalar(select(func.count()).select_from(WaterPoint).where(WaterPoint.observed_status == "Non-Functional")) or 0)

        impact_available_stmt = (
            select(func.count())
            .select_from(WaterPoint)
            .join(ConsequenceResult, ConsequenceResult.water_point_id == WaterPoint.id)
            .join(latest_consequence_ids, latest_consequence_ids.c.id == ConsequenceResult.id)
            .where(ConsequenceResult.impact_available.is_(True))
        )
        counts["impact_available"] = int(self.db.scalar(impact_available_stmt) or 0)
        return counts

    def add_all(self, results: list[PriorityResult]) -> None:
        self.db.add_all(results)
        self.db.flush()
