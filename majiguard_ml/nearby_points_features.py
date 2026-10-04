"""Step 3.5 - Nearby Water Point Feature Extraction.

Turns (latitude, longitude) into dist_nearest_any_water_point_m and
n_water_points_within_{500,1000,5000}m, by querying the SAME local WPDx
Tanzania reference points with the SAME KD-tree logic already validated in
scripts/02_audit_waterpoints.py. No new formula, threshold, filter, or
proxy is introduced here - this is a refactor, not a redesign.

Reference source (confirmed by opening the file directly before writing
this module, not assumed):
    data/interim/wpdx_tanzania_typed.parquet
    - This IS the exact table scripts/02_audit_waterpoints.py builds its
      KD-tree from (same `lat`/`lon` columns, same 17,518 Tanzania rows).
    - 17,518 rows, lat/lon columns present for all of them (0 missing).
    - ALL rows are used as reference points - scripts/02 does NOT drop
      duplicate coordinates or WPDx's own "is_duplicate" flag before
      building the tree (it only *counts* them for the audit report).
      Reproduced exactly: no filtering here either.

Method (copied from scripts/02_audit_waterpoints.py, verified against it
before writing this file):
    - Points reprojected from EPSG:4326 to EPSG:32736 (UTM 36S, the same
      metric CRS used everywhere else in this project) before any
      distance work - NOT a planar lat/lon approximation, NOT haversine.
    - scipy.spatial.cKDTree over the reprojected (x, y) coordinates.
    - Nearest distance: `tree.query(xy, k=2)` and takes the SECOND
      result. Radius counts: `tree.query_ball_point(xy, r)` and subtracts
      1 from the length. Both of these exist specifically to EXCLUDE the
      query point from its own neighbour count - see "Self-point
      behaviour" below, this is the single most important detail in this
      file.

Self-point behaviour (Part B of the Step 3.5 task - read this carefully):
    In scripts/02_audit_waterpoints.py, every query point IS one of the
    17,518 reference points (the whole table is queried against itself).
    So for every row, its own nearest match is always itself at distance
    0.0 - `tree.query(xy, k=2)` returns [self(0.0), nearest_other], and
    the script keeps only the SECOND value (`d[:, 1]`). Likewise,
    `query_ball_point` always finds the point itself (distance 0 <= any
    radius > 0), so the script subtracts 1 (`len(x) - 1`) from every
    radius count. The ORIGINAL METHODOLOGY THEREFORE EXCLUDES THE QUERY
    POINT ITSELF - confirmed by reading the code, not assumed.

    This function generalises that SAME exclusion rule to work correctly
    both for an EXISTING water point (already in the reference set, where
    the same self-exclusion must happen to match the training dataset
    exactly) and for a GENUINELY NEW water point (not in the reference
    set, where there is no "self" to exclude). It does this by checking
    whether the nearest match found is at distance 0.0 (i.e. this exact
    location already exists in the reference data):
        - if yes  -> treat it as "self" and exclude it (same as scripts/02)
        - if no   -> there is no self to exclude; use the result as-is
    This is NOT a redesign of the methodology - it is the same "exclude
    self" rule, applied correctly regardless of whether the query point
    happens to already be a reference point. scripts/13's Test 3
    (mandatory) verifies this reproduces the training dataset exactly for
    a real, already-referenced water point.
"""

from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WPDX_REFERENCE_PATH = PROJECT_ROOT / "data" / "interim" / "wpdx_tanzania_typed.parquet"
METRIC_CRS = 32736  # UTM zone 36S - same CRS scripts/02_audit_waterpoints.py uses
RADII_M = (500, 1000, 5000)
REQUIRED_COORDINATE_COLUMNS = ("lat", "lon")

NEARBY_FEATURE_NAMES = (
    ["dist_nearest_any_water_point_m"]
    + [f"n_water_points_within_{r}m" for r in RADII_M]
)


def _validate_latitude_longitude(latitude, longitude):
    if pd.isna(latitude) or pd.isna(longitude):
        raise ValueError("latitude and longitude are required (got a missing value).")
    if not (-90 <= latitude <= 90):
        raise ValueError(f"latitude must be between -90 and 90, got {latitude!r}.")
    if not (-180 <= longitude <= 180):
        raise ValueError(f"longitude must be between -180 and 180, got {longitude!r}.")


def _load_reference_points():
    """Load and validate the WPDx reference table. Raises a clear
    ValueError for every way the reference data could be unusable -
    never silently returns 0/NaN/None."""
    if not WPDX_REFERENCE_PATH.exists():
        raise ValueError(f"WPDx reference dataset not found at {WPDX_REFERENCE_PATH}.")

    reference = pd.read_parquet(WPDX_REFERENCE_PATH)
    if reference.empty:
        raise ValueError(f"WPDx reference dataset at {WPDX_REFERENCE_PATH} is empty.")

    missing_columns = [c for c in REQUIRED_COORDINATE_COLUMNS if c not in reference.columns]
    if missing_columns:
        raise ValueError(
            f"WPDx reference dataset is missing required coordinate column(s): {missing_columns}."
        )

    reference = reference[list(REQUIRED_COORDINATE_COLUMNS)].dropna()
    if reference.empty:
        raise ValueError(
            "WPDx reference dataset has no rows with usable (non-missing) coordinates."
        )
    return reference


def _build_kdtree(reference_df):
    """Reproject the reference points to EPSG:32736 and build a KD-tree,
    exactly as scripts/02_audit_waterpoints.py does."""
    points_utm = gpd.GeoSeries(
        gpd.points_from_xy(reference_df["lon"], reference_df["lat"]), crs=4326
    ).to_crs(METRIC_CRS)
    xy = np.c_[points_utm.x, points_utm.y]
    return cKDTree(xy)


def _point_to_utm_xy(latitude, longitude):
    point_utm = gpd.GeoSeries(
        gpd.points_from_xy([longitude], [latitude]), crs=4326
    ).to_crs(METRIC_CRS).iloc[0]
    return point_utm.x, point_utm.y


def _compute_nearby_features(tree, latitude, longitude):
    x, y = _point_to_utm_xy(latitude, longitude)
    query_xy = [x, y]

    distances, _ = tree.query(query_xy, k=2)
    # distance 0.0 to the nearest match means this exact location is
    # already one of the reference points - see "Self-point behaviour"
    # in the module docstring.
    is_self_coincident = bool(distances[0] == 0.0)
    nearest_other_m = float(distances[1] if is_self_coincident else distances[0])

    features = {"dist_nearest_any_water_point_m": nearest_other_m}
    for radius_m in RADII_M:
        matches = tree.query_ball_point(query_xy, radius_m)
        count = len(matches)
        if is_self_coincident:
            count -= 1  # exclude the point itself, same as scripts/02's `len(x) - 1`
        features[f"n_water_points_within_{radius_m}m"] = count

    return features


def get_nearby_water_point_features(latitude, longitude):
    """Compute the 4 nearby-water-point features for ONE water point,
    against the local WPDx Tanzania reference set, using the exact
    training dataset's calculation and self-exclusion logic."""
    _validate_latitude_longitude(latitude, longitude)
    reference = _load_reference_points()
    tree = _build_kdtree(reference)
    return _compute_nearby_features(tree, latitude, longitude)


def get_nearby_water_point_features_batch(records):
    """Same as get_nearby_water_point_features, for several points at
    once. `records`: list of dicts (or a DataFrame) with latitude/
    longitude. The reference file is loaded and the KD-tree built only
    once, instead of once per point."""
    if isinstance(records, pd.DataFrame):
        records = records.to_dict("records")

    reference = _load_reference_points()
    tree = _build_kdtree(reference)

    results = []
    for record in records:
        _validate_latitude_longitude(record["latitude"], record["longitude"])
        results.append(_compute_nearby_features(tree, record["latitude"], record["longitude"]))
    return results
