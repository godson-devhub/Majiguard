from __future__ import annotations

from app.core.methodology import PRIORITY_METHODOLOGY_VERSION
from app.repositories.priority_repository import PriorityRepository
from app.services.impact_classification import (
    IMPACT_HIGH_THRESHOLD_CUTOFF,
    IMPACT_HIGH_THRESHOLD_VERSION,
    is_high_impact,
)
from ._pagination import validate_pagination

# v2: eligibility for both pathways now additionally requires High Impact
# classification (impact_classification.is_high_impact) - see
# scripts/compute_priority_rankings.py. Scoring and ranking within the
# eligible population are unchanged from v1. The constant itself lives in
# app.core.methodology so app.repositories.water_point_repository can read it
# too without a circular import; re-exported here as the historical name.

RECOMMENDED_ACTION = {
    "preventive": "preventive_maintenance_assessment",
    "restoration": "priority_restoration_assessment",
}


def _why_prioritized(row: dict, priority_type: str) -> list[str]:
    """Backend-owned, fixed-vocabulary reasons - never free-form text. The base
    reason is guaranteed true by the eligibility rule itself; the other three
    are only added when the stored *_above_median flag (computed once, at
    batch time, relative to the same priority_type's eligible population) is
    true, so "high" is always a relative statement, never an invented band."""
    reasons: list[str] = ["high risk of non-functionality"] if priority_type == "preventive" else ["observed non-functional"]
    if row.get("impact_above_median"):
        reasons.append("high relative community impact")
    if row.get("population_above_median"):
        reasons.append("high population exposure component")
    if row.get("alternative_scarcity_above_median"):
        reasons.append("limited nearby water-point alternatives")
    return reasons


class PriorityService:
    def __init__(self, repository: PriorityRepository):
        self.repository = repository

    def list_ranked(self, *, priority_type: str, page: int = 1, page_size: int = 50, nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None) -> list[dict]:
        validate_pagination(page, page_size)
        rows = self.repository.list_ranked(priority_type=priority_type, methodology_version=PRIORITY_METHODOLOGY_VERSION, page=page, page_size=page_size, nbs_region=nbs_region, nbs_district=nbs_district, nbs_ward=nbs_ward)
        for row in rows:
            row["why_prioritized"] = _why_prioritized(row, priority_type)
            row["recommended_action"] = RECOMMENDED_ACTION[priority_type]
            row["impact_high"] = is_high_impact(row.get("impact_score"))
        return rows

    def count_ranked(self, *, priority_type: str, nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None) -> int:
        return self.repository.count_ranked(priority_type=priority_type, methodology_version=PRIORITY_METHODOLOGY_VERSION, nbs_region=nbs_region, nbs_district=nbs_district, nbs_ward=nbs_ward)

    def summary(self) -> dict:
        counts = self.repository.summary(methodology_version=PRIORITY_METHODOLOGY_VERSION)
        counts["priority_methodology_version"] = PRIORITY_METHODOLOGY_VERSION
        counts["impact_high_threshold"] = IMPACT_HIGH_THRESHOLD_CUTOFF
        counts["impact_high_threshold_version"] = IMPACT_HIGH_THRESHOLD_VERSION
        counts["impact_high_national_count"] = self.repository.count_high_impact(IMPACT_HIGH_THRESHOLD_CUTOFF)
        # Both pathways now gate eligibility on High Impact (see
        # PRIORITY_METHODOLOGY_VERSION's v2 note), so each pathway's eligible
        # count already *is* its High Impact count under the new rule - not a
        # coincidence, the defining property of the new eligibility rule.
        counts["impact_high_preventive_count"] = counts["eligible_preventive"]
        counts["impact_high_restoration_count"] = counts["eligible_restoration"]
        return counts
