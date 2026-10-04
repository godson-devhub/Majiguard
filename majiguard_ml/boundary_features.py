"""Step 3.4 (Part D) - Tanzania Boundary / Geography Feature Extraction.

Turns (latitude, longitude) into inside_tz_adm0, dist_to_tz_border_m, and
nbs_region, by reading the SAME local boundary files with the SAME
point-in-polygon logic already validated in scripts/02_audit_waterpoints.py.
No new geometry operation or naming convention is introduced here - this
is a refactor, not a redesign.

Sources (confirmed by opening each file directly before writing this
module, not assumed):

    Tanzania country border:
        data/raw/geographic/geoboundaries_TZA/geoBoundaries-TZA-ADM0.geojson
        format: GeoJSON, native CRS EPSG:4326, 1 MultiPolygon.

    NBS 2022 ward boundaries:
        data/raw/geographic/nbs_tz_2022_wards/extracted/TANZANIA_2022PHC_WARDS_SHAPEFILES.shp
        format: ESRI Shapefile, native CRS EPSG:3395, 4,344 features
        (4,161 Polygon + 183 MultiPolygon). Region name field: "reg_name".

Method (copied from scripts/02_audit_waterpoints.py, verified against it
before writing this file):

    inside_tz_adm0 / dist_to_tz_border_m:
        - ADM0 polygon reprojected to EPSG:32736 (UTM 36S, metric).
        - The query point is reprojected the same way.
        - inside_tz_adm0 = the polygon CONTAINS the point.
        - dist_to_tz_border_m = 0.0 if inside, else the metric distance
          (metres) from the point to the polygon (EPSG:32736 - NOT a
          planar lat/lon approximation, a real projected-CRS distance).

    nbs_region:
        - Ward polygons repaired with .make_valid() (some are invalid as
          shipped) and reprojected to EPSG:4326.
        - A left, "within" spatial join of the point against the ward
          polygons - the SAME predicate used in the original script.
        - Returns the ward's "reg_name" attribute.
        - If the point isn't inside any ward polygon (this happens for
          real training points too - ~41 of them, per the original data
          audit), nbs_region is None here, exactly like the original
          pipeline leaves it as NaN. This is not an error: Step 2's
          fill_unknown_categoricals() already turns a missing nbs_region
          into "Unknown" downstream, so this module doesn't need to
          invent a region name.

Note on "point outside Tanzania": inside_tz_adm0/dist_to_tz_border_m are
explicitly DESIGNED, in the original methodology, to handle points outside
the country border gracefully (the training dataset itself contains real
points recorded up to ~1.7 km outside the ADM0 polygon). So this module
does NOT raise an error for a point outside Tanzania - that would be new
behaviour the original pipeline never had. It only raises an error for
genuinely invalid input (bad lat/lon) or a missing source file. See the
Step 3.4 report for why this was a deliberate choice, not an oversight.
"""

from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ADM0_PATH = (
    PROJECT_ROOT / "data" / "raw" / "geographic" / "geoboundaries_TZA"
    / "geoBoundaries-TZA-ADM0.geojson"
)
NBS_WARDS_PATH = (
    PROJECT_ROOT / "data" / "raw" / "geographic" / "nbs_tz_2022_wards"
    / "extracted" / "TANZANIA_2022PHC_WARDS_SHAPEFILES.shp"
)
METRIC_CRS = 32736  # UTM zone 36S - same CRS scripts/02_audit_waterpoints.py uses
NBS_REGION_FIELD = "reg_name"

BOUNDARY_FEATURE_NAMES = ["inside_tz_adm0", "dist_to_tz_border_m", "nbs_region"]


def _validate_latitude_longitude(latitude, longitude):
    if pd.isna(latitude) or pd.isna(longitude):
        raise ValueError("latitude and longitude are required (got a missing value).")
    if not (-90 <= latitude <= 90):
        raise ValueError(f"latitude must be between -90 and 90, got {latitude!r}.")
    if not (-180 <= longitude <= 180):
        raise ValueError(f"longitude must be between -180 and 180, got {longitude!r}.")


def _load_adm0_polygon_utm():
    if not ADM0_PATH.exists():
        raise ValueError(f"Tanzania ADM0 boundary source not found at {ADM0_PATH}.")
    return gpd.read_file(ADM0_PATH).to_crs(METRIC_CRS).union_all()


def _load_nbs_wards():
    if not NBS_WARDS_PATH.exists():
        raise ValueError(f"NBS ward boundary source not found at {NBS_WARDS_PATH}.")
    wards = gpd.read_file(NBS_WARDS_PATH)
    wards["geometry"] = wards.geometry.make_valid()
    wards = wards.to_crs(4326)
    return wards[[NBS_REGION_FIELD, "geometry"]]


def get_boundary_features(latitude, longitude):
    """Returns {"inside_tz_adm0": bool, "dist_to_tz_border_m": float,
    "nbs_region": str or None}."""
    _validate_latitude_longitude(latitude, longitude)
    adm0_polygon_utm = _load_adm0_polygon_utm()
    wards = _load_nbs_wards()
    return _compute_boundary_features(adm0_polygon_utm, wards, latitude, longitude)


def get_boundary_features_batch(records):
    """Same as get_boundary_features, for several points at once.
    `records`: list of dicts (or a DataFrame) with latitude/longitude.
    Both boundary files are loaded only once."""
    if isinstance(records, pd.DataFrame):
        records = records.to_dict("records")
    adm0_polygon_utm = _load_adm0_polygon_utm()
    wards = _load_nbs_wards()
    results = []
    for record in records:
        _validate_latitude_longitude(record["latitude"], record["longitude"])
        results.append(
            _compute_boundary_features(adm0_polygon_utm, wards, record["latitude"], record["longitude"])
        )
    return results


def _compute_boundary_features(adm0_polygon_utm, wards_gdf_4326, latitude, longitude):
    point_utm = gpd.GeoSeries([Point(longitude, latitude)], crs=4326).to_crs(METRIC_CRS).iloc[0]
    inside = bool(adm0_polygon_utm.contains(point_utm))
    dist_m = 0.0 if inside else float(adm0_polygon_utm.distance(point_utm))

    point_gdf = gpd.GeoDataFrame({"geometry": [Point(longitude, latitude)]}, crs=4326)
    joined = gpd.sjoin(point_gdf, wards_gdf_4326, how="left", predicate="within")
    joined = joined[~joined.index.duplicated(keep="first")]  # same dedup as the original script
    region = joined[NBS_REGION_FIELD].iloc[0]
    region = None if pd.isna(region) else str(region)

    return {
        "inside_tz_adm0": inside,
        "dist_to_tz_border_m": dist_m,
        "nbs_region": region,
    }
