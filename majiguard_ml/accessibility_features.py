"""Step 3.4 (Part B/C) - Accessibility Feature Extraction: distance to the
nearest health facility and the nearest school.

Turns (latitude, longitude) into dist_nearest_health_facility_m and
dist_nearest_school_m, by reading the SAME local facility files with the
SAME nearest-neighbour logic already validated in
scripts/03_extract_features.py. No new filtering, category, or distance
methodology is introduced here - this is a refactor, not a redesign.

Sources (confirmed by opening each file directly before writing this
module, not assumed):

    Health facilities:
        data/raw/geographic/facilities/tanzania-healthsites_tanzania.geojson
        format: GeoJSON, CRS EPSG:4326, 6,729 rows, mixed Point (4,045) and
        Polygon (2,684) geometries - ALL rows are used, no filtering by
        facility type.

    Schools / education facilities:
        data/raw/geographic/facilities/hotosm_tza_education_facilities_hotosm_tza_education_facilities_osm_geojson.zip
        -> education_facilities.geojson inside it (the original script
        picks the first ".geojson" file in the zip by name, reproduced
        here exactly)
        format: GeoJSON, CRS EPSG:4326, 103,030 rows, mixed Polygon
        (81,357), Point (21,666), MultiPolygon (7) - ALL rows are used, no
        filtering by amenity/education-level tag.

Method (copied from scripts/03_extract_features.py, verified against it
before writing this file):
    1. Drop rows with no geometry.
    2. Reproject to EPSG:32736 (UTM 36S - Tanzania's metric zone, same
       zone used everywhere else in this project for distance math).
    3. Use each feature's CENTROID (handles the polygon rows - a health
       facility or school mapped as a building footprint still needs a
       single point to measure distance from).
    4. Build a KD-tree (scipy.spatial.cKDTree) over those centroids.
    5. Reproject the query point to EPSG:32736 the same way, and query
       the tree for the nearest neighbour. Distance is in metres.
"""

import io
import zipfile
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree
from shapely.geometry import Point

PROJECT_ROOT = Path(__file__).resolve().parents[1]
HEALTH_FACILITIES_PATH = (
    PROJECT_ROOT / "data" / "raw" / "geographic" / "facilities"
    / "tanzania-healthsites_tanzania.geojson"
)
EDUCATION_FACILITIES_ZIP_PATH = (
    PROJECT_ROOT / "data" / "raw" / "geographic" / "facilities"
    / "hotosm_tza_education_facilities_hotosm_tza_education_facilities_osm_geojson.zip"
)
METRIC_CRS = 32736  # UTM zone 36S - same CRS used throughout this project


def _validate_latitude_longitude(latitude, longitude):
    if pd.isna(latitude) or pd.isna(longitude):
        raise ValueError("latitude and longitude are required (got a missing value).")
    if not (-90 <= latitude <= 90):
        raise ValueError(f"latitude must be between -90 and 90, got {latitude!r}.")
    if not (-180 <= longitude <= 180):
        raise ValueError(f"longitude must be between -180 and 180, got {longitude!r}.")


def _point_to_utm_xy(latitude, longitude):
    """Reproject one (lat, lon) point to EPSG:32736, the same way
    scripts/03_extract_features.py reprojects the whole water-point table."""
    point_utm = gpd.GeoSeries([Point(longitude, latitude)], crs=4326).to_crs(METRIC_CRS).iloc[0]
    return point_utm.x, point_utm.y


def _build_kdtree_from_facilities(gdf):
    gdf = gdf[gdf.geometry.notna()]
    gdf_utm = gdf.to_crs(METRIC_CRS)
    centroids = gdf_utm.geometry.centroid
    return cKDTree(np.c_[centroids.x, centroids.y])


def _load_health_facility_tree():
    if not HEALTH_FACILITIES_PATH.exists():
        raise ValueError(f"Health facilities source not found at {HEALTH_FACILITIES_PATH}.")
    gdf = gpd.read_file(HEALTH_FACILITIES_PATH)
    return _build_kdtree_from_facilities(gdf)


def _load_school_tree():
    if not EDUCATION_FACILITIES_ZIP_PATH.exists():
        raise ValueError(f"School/education facilities source not found at {EDUCATION_FACILITIES_ZIP_PATH}.")
    with zipfile.ZipFile(EDUCATION_FACILITIES_ZIP_PATH) as z:
        inner_names = [n for n in z.namelist() if n.endswith(".geojson")]
        if not inner_names:
            raise ValueError(f"No .geojson file found inside {EDUCATION_FACILITIES_ZIP_PATH}.")
        gdf = gpd.read_file(io.BytesIO(z.read(inner_names[0])))
    return _build_kdtree_from_facilities(gdf)


def _nearest_distance_m(tree, latitude, longitude):
    x, y = _point_to_utm_xy(latitude, longitude)
    distance, _ = tree.query([x, y])
    return float(distance)


def get_health_facility_distance(latitude, longitude):
    """Distance in metres to the nearest health facility -
    dist_nearest_health_facility_m."""
    _validate_latitude_longitude(latitude, longitude)
    tree = _load_health_facility_tree()
    return _nearest_distance_m(tree, latitude, longitude)


def get_health_facility_distance_batch(records):
    """Same as get_health_facility_distance, for several points at once.
    `records`: list of dicts (or a DataFrame) with latitude/longitude.
    The health facilities file is loaded only once."""
    if isinstance(records, pd.DataFrame):
        records = records.to_dict("records")
    tree = _load_health_facility_tree()
    results = []
    for record in records:
        _validate_latitude_longitude(record["latitude"], record["longitude"])
        results.append(_nearest_distance_m(tree, record["latitude"], record["longitude"]))
    return results


def get_school_distance(latitude, longitude):
    """Distance in metres to the nearest school/education facility -
    dist_nearest_school_m."""
    _validate_latitude_longitude(latitude, longitude)
    tree = _load_school_tree()
    return _nearest_distance_m(tree, latitude, longitude)


def get_school_distance_batch(records):
    """Same as get_school_distance, for several points at once.
    `records`: list of dicts (or a DataFrame) with latitude/longitude.
    The school facilities file is loaded only once."""
    if isinstance(records, pd.DataFrame):
        records = records.to_dict("records")
    tree = _load_school_tree()
    results = []
    for record in records:
        _validate_latitude_longitude(record["latitude"], record["longitude"])
        results.append(_nearest_distance_m(tree, record["latitude"], record["longitude"]))
    return results
