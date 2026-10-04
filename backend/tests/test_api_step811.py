import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.db.session import engine
from app.main import app

client = TestClient(app)


RESULT_TABLES = ("prediction_results", "impact_results", "consequence_results")


def _counts_for(water_point_id: int) -> dict[str, int]:
    with engine.connect() as connection:
        return {
            name: connection.execute(
                text(f"SELECT count(*) FROM {name} WHERE water_point_id = :id"), {"id": water_point_id}
            ).scalar_one()
            for name in RESULT_TABLES
        }


def _clear_results_for(water_point_id: int) -> None:
    """Deletes only this one water point's result rows.

    This suite runs against the real configured database, which may already
    hold real computed results for every other water point - an unscoped
    `DELETE FROM {table}` here previously wiped all stored risk/impact/
    consequence data for the entire register on every test run. Scoping to
    the single id this test itself computes against (1) means cleanup can
    never touch a row it did not create."""
    with engine.begin() as connection:
        for name in RESULT_TABLES:
            connection.execute(text(f"DELETE FROM {name} WHERE water_point_id = :id"), {"id": water_point_id})


@pytest.fixture
def preserve_water_point_1_results():
    """Water point 1 (like every other point) already has a real stored
    assessment after `scripts/batch_compute_all_water_points.py`. The two
    tests using this fixture delete and recompute its result rows to exercise
    the live POST /compute endpoint; this snapshots those rows verbatim
    beforehand and restores them exactly afterwards, so running this suite
    never leaves the register in a different state than it found it."""
    with engine.connect() as connection:
        snapshot = {
            name: [dict(row) for row in connection.execute(
                text(f"SELECT * FROM {name} WHERE water_point_id = 1")
            ).mappings().all()]
            for name in RESULT_TABLES
        }
    yield
    with engine.begin() as connection:
        for name in RESULT_TABLES:
            connection.execute(text(f"DELETE FROM {name} WHERE water_point_id = 1"))
            for row in snapshot[name]:
                columns = ", ".join(row.keys())
                placeholders = ", ".join(f":{key}" for key in row.keys())
                connection.execute(text(f"INSERT INTO {name} ({columns}) VALUES ({placeholders})"), row)


def test_public_read_routes_and_validation_contract():
    assert client.get("/health").status_code == 200
    assert client.get("/api/v1/health").status_code == 200
    listing = client.get("/api/v1/water-points?page=1&page_size=2")
    assert listing.status_code == 200
    body = listing.json()
    assert {"items", "page", "page_size", "total", "total_pages"} <= body.keys()
    assert len(body["items"]) == 2
    assert client.get("/api/v1/water-points/1").status_code == 200
    assert client.get("/api/v1/water-points/master/MG000001").status_code == 200
    map_body = client.get("/api/v1/water-points/map?page_size=2")
    assert map_body.status_code == 200
    assert {"items", "page", "page_size", "total", "total_pages"} <= map_body.json().keys()
    assert client.get("/api/v1/water-points?page=0").status_code == 422
    assert client.get("/api/v1/water-points?page_size=501").status_code == 422
    assert client.get("/api/v1/water-points/abc").status_code == 422
    assert client.get("/api/v1/water-points/999999").status_code == 404
    assert client.get("/api/v1/water-points/master/NO_SUCH_POINT").status_code == 404


def test_result_routes_missing_before_compute_and_safe_errors(preserve_water_point_1_results):
    _clear_results_for(1)
    for suffix in ("prediction", "impact", "consequence"):
        response = client.get(f"/api/v1/water-points/1/{suffix}")
        assert response.status_code == 404
        assert "DATABASE_URL" not in response.text
        assert "Traceback" not in response.text
    response = client.post("/api/v1/water-points/999999/compute")
    assert response.status_code == 404
    assert "DATABASE_URL" not in response.text


def test_single_point_compute_end_to_end_and_cleanup(preserve_water_point_1_results):
    _clear_results_for(1)
    assert _counts_for(1) == {"prediction_results": 0, "impact_results": 0, "consequence_results": 0}
    response = client.post("/api/v1/water-points/1/compute")
    assert response.status_code == 200, response.text
    body = response.json()
    assert {"water_point", "prediction", "impact", "consequence"} == set(body)
    assert body["prediction"]["prediction_methodology_version"] == "v1_random_forest"
    assert body["prediction"]["decision_threshold"] == 0.40
    assert body["impact"]["impact_methodology_version"] == "impact_v1"
    assert body["consequence"]["consequence_priority_methodology_version"] == "consequence_priority_v1"
    _clear_results_for(1)
    assert _counts_for(1) == {"prediction_results": 0, "impact_results": 0, "consequence_results": 0}
