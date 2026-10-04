from app.db.models import PredictionResult
from app.repositories.prediction_repository import PredictionRepository
from ._pagination import validate_pagination


class PredictionService:
    def __init__(self, repository: PredictionRepository): self.repository = repository
    def get(self, water_point_id: int) -> PredictionResult | None: return self.repository.get_by_water_point(water_point_id)
    def get_latest(self, water_point_id: int) -> PredictionResult | None: return self.repository.get_latest_by_water_point(water_point_id)
    def list(self, *, page: int = 1, page_size: int = 50) -> list[PredictionResult]:
        validate_pagination(page, page_size); return self.repository.list(page=page, page_size=page_size)
    def save(self, result: PredictionResult) -> PredictionResult: return self.repository.add(result)
