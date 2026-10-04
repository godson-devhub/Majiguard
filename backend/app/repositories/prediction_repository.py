from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import PredictionResult


class PredictionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_water_point(self, water_point_id: int) -> PredictionResult | None:
        return self.db.scalar(select(PredictionResult).where(PredictionResult.water_point_id == water_point_id).order_by(PredictionResult.computed_at.desc(), PredictionResult.id.desc()))

    def get_latest_by_water_point(self, water_point_id: int) -> PredictionResult | None:
        return self.get_by_water_point(water_point_id)

    def list(self, *, page: int = 1, page_size: int = 50) -> list[PredictionResult]:
        stmt = select(PredictionResult).order_by(PredictionResult.computed_at.desc(), PredictionResult.id.desc()).offset((page - 1) * page_size).limit(page_size)
        return list(self.db.scalars(stmt).all())

    def add(self, result: PredictionResult) -> PredictionResult:
        self.db.add(result)
        self.db.flush()
        return result
