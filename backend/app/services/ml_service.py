from app.repositories.water_point_repository import WaterPointRepository
from app.repositories.prediction_repository import PredictionRepository
from app.repositories.impact_repository import ImpactRepository
from app.repositories.consequence_repository import ConsequenceRepository
from app.ml import engine

class MLService:
    def __init__(self, db):
        self.points=WaterPointRepository(db); self.predictions=PredictionRepository(db); self.impacts=ImpactRepository(db); self.consequences=ConsequenceRepository(db)
    def compute(self, water_point_id: int):
        point=self.points.get_by_id(water_point_id)
        if point is None: return None
        prediction=engine.predict_water_point(point); impact=engine.compute_impact(point); consequence=engine.build_consequence(prediction, impact, point.id)
        self.predictions.add(engine.prediction_orm(point.id,prediction)); self.impacts.add(engine.impact_orm(point.id,impact)); self.consequences.add(engine.consequence_orm(consequence))
        return prediction, impact, consequence
