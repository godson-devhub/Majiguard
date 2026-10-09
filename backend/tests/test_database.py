from app.db.base import Base


def test_declarative_base_has_application_tables() -> None:
    assert set(Base.metadata.tables) == {
        "water_points",
        "prediction_results",
        "impact_results",
        "consequence_results",
        "priority_results",
        "users",
    }
