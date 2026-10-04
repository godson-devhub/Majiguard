from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)
def test_water_point_filters_narrow_results():
    all_points = client.get("/api/v1/water-points?page_size=1").json()
    region = client.get("/api/v1/water-points", params={"nbs_region": "Dodoma", "page_size": 1})
    district = client.get("/api/v1/water-points", params={"nbs_region": "Dodoma", "nbs_district": "Bahi", "page_size": 1})
    ward = client.get("/api/v1/water-points", params={"nbs_region": "Dodoma", "nbs_district": "Bahi", "nbs_ward": "Babayu", "page_size": 1})
    assert all(r.status_code == 200 for r in (region, district, ward))
    assert all_points["total"] >= region.json()["total"] >= district.json()["total"] >= ward.json()["total"]
    assert all(item["nbs_region"] == "Dodoma" for item in region.json()["items"])
    assert all(item["nbs_region"] == "Dodoma" and item["nbs_district"] == "Bahi" for item in district.json()["items"])
    assert all(item["nbs_region"] == "Dodoma" and item["nbs_district"] == "Bahi" and item["nbs_ward"] == "Babayu" for item in ward.json()["items"])
def test_single_water_point_retrieval_returns_existing_fields():
    response = client.get("/api/v1/water-points/1")
    assert response.status_code == 200
    body = response.json()
    assert {"id", "master_id", "wpdx_id", "latitude", "longitude", "nbs_region", "nbs_district", "nbs_ward", "observed_status"} <= body.keys()
    assert body["id"] == 1
def test_water_point_filters_require_parent_scope():
    assert client.get("/api/v1/water-points", params={"nbs_district": "Bahi"}).status_code == 422
    assert client.get("/api/v1/water-points", params={"nbs_ward": "Babayu"}).status_code == 422
