from __future__ import annotations

from app.db.models import WaterPoint
from app.repositories.water_point_repository import WaterPointRepository
from app.services.impact_classification import is_high_impact
from ._pagination import validate_pagination


class WaterPointService:
    def __init__(self, repository: WaterPointRepository):
        self.repository = repository

    def get(self, water_point_id: int) -> WaterPoint | None:
        return self.repository.get_by_id(water_point_id)

    def get_by_master_id(self, master_id: str) -> WaterPoint | None:
        return self.repository.get_by_master_id(master_id)

    def get_by_wpdx_id(self, wpdx_id: str) -> WaterPoint | None:
        return self.repository.get_by_wpdx_id(wpdx_id)

    def list(self, *, page: int = 1, page_size: int = 50, observed_status: str | None = None, nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None) -> list[WaterPoint]:
        validate_pagination(page, page_size)
        return self.repository.list(page=page, page_size=page_size, observed_status=observed_status, nbs_region=nbs_region, nbs_district=nbs_district, nbs_ward=nbs_ward)

    def list_for_map(self, *, page: int = 1, page_size: int = 500, observed_status: str | None = None, nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None) -> list[dict[str, object]]:
        validate_pagination(page, page_size)
        rows = self.repository.list_for_map(page=page, page_size=page_size, observed_status=observed_status, nbs_region=nbs_region, nbs_district=nbs_district, nbs_ward=nbs_ward)
        for row in rows:
            row["impact_high"] = is_high_impact(row.get("impact_score"))
        return rows

