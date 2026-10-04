from app.db.session import SessionLocal
from app.repositories.water_point_repository import WaterPointRepository
from app.ml import engine

def test_real_records_run_frozen_engines():
    with SessionLocal() as db:
        repo=WaterPointRepository(db)
        for master_id in ["MG000001", "MG000002"]:
            point=repo.get_by_master_id(master_id); assert point is not None
            assert engine.build_prediction_input(point).shape == (1,42)
            prediction=engine.predict_water_point(point)
            assert 0 <= prediction["probability_non_functional"] <= 1
            assert prediction["decision_threshold"] == 0.40
            impact=engine.compute_impact(point); assert impact["methodology_version"] == "impact_v1"
            consequence=engine.build_consequence(prediction, impact, point.id)
            assert consequence["consequence_priority_methodology_version"] == "consequence_priority_v1"
