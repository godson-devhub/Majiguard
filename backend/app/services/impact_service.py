from app.db.models import ImpactResult
from app.repositories.impact_repository import ImpactRepository
from ._pagination import validate_pagination


class ImpactService:
    def __init__(self, repository: ImpactRepository): self.repository = repository
    def get(self, water_point_id: int) -> ImpactResult | None: return self.repository.get_by_water_point(water_point_id)
    def get_latest(self, water_point_id: int) -> ImpactResult | None: return self.repository.get_latest_by_water_point(water_point_id)
    def list(self, *, page: int = 1, page_size: int = 50) -> list[ImpactResult]:
        validate_pagination(page, page_size); return self.repository.list(page=page, page_size=page_size)
    def save(self, result: ImpactResult) -> ImpactResult: return self.repository.add(result)
