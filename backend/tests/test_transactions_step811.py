import pytest
from sqlalchemy import text
from app.db.models import PredictionResult
from app.db.session import SessionLocal
from app.repositories.prediction_repository import PredictionRepository
from app.repositories.water_point_repository import WaterPointRepository
from app.services.ml_service import MLService
from app.ml import engine


def test_repository_does_not_commit_and_caller_controls_transaction(db_session):
    # Counts are scoped to this one water point and compared as a delta, never
    # against an assumed-empty table: the real database this suite runs
    # against may already hold a real stored result for MG000001.
    point = WaterPointRepository(db_session).get_by_master_id("MG000001")
    before = db_session.execute(
        text("SELECT count(*) FROM prediction_results WHERE water_point_id = :id"), {"id": point.id}
    ).scalar_one()
    result = PredictionResult(water_point_id=point.id, probability_non_functional=.2, probability_functional=.8, predicted_status="Functional", decision_threshold=.4, prediction_methodology_version="test")
    PredictionRepository(db_session).add(result)
    assert db_session.execute(
        text("SELECT count(*) FROM prediction_results WHERE water_point_id = :id"), {"id": point.id}
    ).scalar_one() == before + 1
    db_session.rollback()
    with SessionLocal() as check:
        assert check.execute(
            text("SELECT count(*) FROM prediction_results WHERE water_point_id = :id"), {"id": point.id}
        ).scalar_one() == before


def test_ml_service_failure_rolls_back_all_result_rows(monkeypatch, db_session):
    # Same delta-over-the-real-table approach as the test above: water point 1
    # may already have real stored results, so the assertion is "nothing
    # changed", never "the table is empty".
    tables = ("prediction_results", "impact_results", "consequence_results")

    def counts_for_point_1():
        return {
            name: db_session.execute(
                text(f"SELECT count(*) FROM {name} WHERE water_point_id = 1")
            ).scalar_one()
            for name in tables
        }

    service = MLService(db_session)
    original = engine.compute_impact
    def fail_after_prediction(point):
        raise RuntimeError("controlled test failure")
    monkeypatch.setattr(engine, "compute_impact", fail_after_prediction)
    before = counts_for_point_1()
    with pytest.raises(RuntimeError, match="controlled test failure"):
        service.compute(1)
    db_session.rollback()
    assert counts_for_point_1() == before
    monkeypatch.setattr(engine, "compute_impact", original)
