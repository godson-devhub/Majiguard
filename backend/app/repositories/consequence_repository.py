from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ConsequenceResult


class ConsequenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_water_point(self, water_point_id: int) -> ConsequenceResult | None:
        return self.db.scalar(select(ConsequenceResult).where(ConsequenceResult.water_point_id == water_point_id).order_by(ConsequenceResult.computed_at.desc(), ConsequenceResult.id.desc()))

    def get_latest_by_water_point(self, water_point_id: int) -> ConsequenceResult | None:
        return self.get_by_water_point(water_point_id)

    def list(self, *, page: int = 1, page_size: int = 50) -> list[ConsequenceResult]:
        stmt = select(ConsequenceResult).order_by(ConsequenceResult.computed_at.desc(), ConsequenceResult.id.desc()).offset((page - 1) * page_size).limit(page_size)
        return list(self.db.scalars(stmt).all())

    def add(self, result: ConsequenceResult) -> ConsequenceResult:
        self.db.add(result)
        self.db.flush()
        return result
