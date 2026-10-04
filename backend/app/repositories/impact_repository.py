from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ImpactResult


class ImpactRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_water_point(self, water_point_id: int) -> ImpactResult | None:
        return self.db.scalar(select(ImpactResult).where(ImpactResult.water_point_id == water_point_id).order_by(ImpactResult.computed_at.desc(), ImpactResult.id.desc()))

    def get_latest_by_water_point(self, water_point_id: int) -> ImpactResult | None:
        return self.get_by_water_point(water_point_id)

    def list(self, *, page: int = 1, page_size: int = 50) -> list[ImpactResult]:
        stmt = select(ImpactResult).order_by(ImpactResult.computed_at.desc(), ImpactResult.id.desc()).offset((page - 1) * page_size).limit(page_size)
        return list(self.db.scalars(stmt).all())

    def add(self, result: ImpactResult) -> ImpactResult:
        self.db.add(result)
        self.db.flush()
        return result
