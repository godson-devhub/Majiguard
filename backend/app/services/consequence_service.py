from app.db.models import ConsequenceResult
from app.repositories.consequence_repository import ConsequenceRepository
from ._pagination import validate_pagination


class ConsequenceService:
    def __init__(self, repository: ConsequenceRepository): self.repository = repository
    def get(self, water_point_id: int) -> ConsequenceResult | None: return self.repository.get_by_water_point(water_point_id)
    def get_latest(self, water_point_id: int) -> ConsequenceResult | None: return self.repository.get_latest_by_water_point(water_point_id)
    def list(self, *, page: int = 1, page_size: int = 50) -> list[ConsequenceResult]:
        validate_pagination(page, page_size); return self.repository.list(page=page, page_size=page_size)
    def save(self, result: ConsequenceResult) -> ConsequenceResult: return self.repository.add(result)
