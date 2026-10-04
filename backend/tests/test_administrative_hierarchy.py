from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_regions_return_stable_codes_and_names():
    response = client.get("/api/v1/water-points/administrative/regions")
    assert response.status_code == 200
    items = response.json()
    assert items
    assert {"level", "name", "code", "region", "district", "bounds"} <= items[0].keys()
    assert all(item["level"] == "region" and item["code"] and item["name"] for item in items)

def test_districts_are_scoped_to_region():
    response = client.get("/api/v1/water-points/administrative/districts", params={"region": "Dodoma"})
    assert response.status_code == 200
    items = response.json()
    assert items
    assert all(item["level"] == "district" and item["region"] == "Dodoma" for item in items)
    assert client.get("/api/v1/water-points/administrative/districts").status_code == 422

def test_wards_are_scoped_to_region_and_district():
    response = client.get("/api/v1/water-points/administrative/wards", params={"region": "Dodoma", "district": "Bahi"})
    assert response.status_code == 200
    items = response.json()
    assert items
    assert all(item["level"] == "ward" and item["region"] == "Dodoma" and item["district"] == "Bahi" for item in items)
    invalid = client.get("/api/v1/water-points/administrative/wards", params={"region": "Dodoma", "district": "Not a Dodoma district"})
    assert invalid.status_code == 422
