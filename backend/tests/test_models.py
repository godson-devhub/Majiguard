from app.db import models
from app.db.base import Base


def test_models_load_and_metadata() -> None:
    assert set(Base.metadata.tables) == {
        "water_points",
        "prediction_results",
        "impact_results",
        "consequence_results",
        "priority_results",
    }


def test_model_foreign_keys_and_relationships() -> None:
    foreign_key = next(iter(models.PredictionResult.__table__.c.water_point_id.foreign_keys))
    assert foreign_key.target_fullname == "water_points.id"
    assert models.WaterPoint.prediction_results.property.back_populates == "water_point"
    assert models.WaterPoint.impact_results.property.back_populates == "water_point"
    assert models.WaterPoint.consequence_results.property.back_populates == "water_point"
    assert models.WaterPoint.priority_results.property.back_populates == "water_point"
