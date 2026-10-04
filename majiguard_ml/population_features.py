"""Step 3.3 - WorldPop Population Feature Extraction.

Turns (latitude, longitude) into the 4 worldpop2022_* columns the model
was trained on, by reading the SAME local WorldPop 2022 raster with the
SAME calculation logic already validated in
scripts/03_extract_features.py. No new population methodology is
introduced here - this is a refactor, not a redesign.

    latitude + longitude
            |
    WorldPop 2022 local raster (data/raw/population/worldpop_R2025A_TZA/*.tif)
            |
    exact same radius-sum calculation used during dataset construction
            |
    population feature dictionary

Source data: WorldPop R2025A, Tanzania, "constrained", 100 m, 2022
(data/raw/population/worldpop_R2025A_TZA/tza_pop_2022_CN_100m_R2025A_v1.tif).
Confirmed by opening the file directly:
    CRS       : EPSG:4326 (no reprojection - same as CHIRPS)
    resolution: 0.00083333 degrees per pixel (~100 m)
    dtype     : float32
    nodata    : -99999.0
    values represent a POPULATION COUNT per 100 m cell (not a density) -
    "density" is only ever derived afterwards, from the 1 km radius sum.

Calculation logic (copied from scripts/03_extract_features.py's
pop_radius(), verified against it line by line before writing this file):
    - Negative and non-finite cell values (nodata, -99999) are treated as
      0 people - NOT skipped and NOT raising an error. This is what the
      original script does (`P[P < 0] = 0; P[~np.isfinite(P)] = 0`), so
      it's reproduced exactly here.
    - A square block of pixels around the point is examined. Its size is
      picked so it's guaranteed to cover the largest requested radius
      (2000 m), using the ORIGINAL script's exact approximation:
          pixels_needed = ceil(radius_m / (pixel_size_deg * 111320 * 0.97)) + 1
      (111320 = metres per degree of longitude at the equator; the 0.97
      factor and the "+1" are safety margin from the original code - kept
      unchanged.)
    - For every pixel in that block, the distance from the water point to
      the PIXEL CENTRE is computed with a planar (flat-earth) approximation,
      NOT a geodesic distance and NOT a metric map projection:
          dy = (pixel_centre_lat - point_lat) * 110574.0
          dx = (pixel_centre_lon - point_lon) * 111320.0 * cos(radians(point_lat))
          distance = sqrt(dy^2 + dx^2)
      This exact approximation (not geodesic, not reprojected) is
      preserved on purpose, for compatibility with the training dataset.
    - worldpop2022_pop_within_{500,1000,2000}m = sum of every pixel whose
      centre is within that radius (a circular buffer in the approximated
      metres above).
    - worldpop2022_density_per_km2_1km = pop_within_1000m / (pi * 1.0^2)
      i.e. the 1 km-radius population total divided by the AREA of a 1 km
      circle (pi km^2) - not a raster-density formula, exactly as in the
      original script.
    - If the point itself falls outside the raster's coverage area, the
      original script produces NaN; here that becomes a clear error
      instead (see "Fail clearly" below).

This module does NOT invent a fallback population value: a point outside
the WorldPop raster's coverage raises a ValueError rather than returning
0 or NaN silently.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
from rasterio.transform import rowcol as raster_rowcol
from rasterio.windows import Window

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WORLDPOP_PATH = (
    PROJECT_ROOT / "data" / "raw" / "population" / "worldpop_R2025A_TZA"
    / "tza_pop_2022_CN_100m_R2025A_v1.tif"
)

RADII_M = (500, 1000, 2000)
METRES_PER_DEGREE_LONGITUDE_AT_EQUATOR = 111320.0
METRES_PER_DEGREE_LATITUDE = 110574.0
PIXEL_SEARCH_MARGIN_FACTOR = 0.97  # matches scripts/03_extract_features.py exactly

POPULATION_FEATURE_NAMES = (
    [f"worldpop2022_pop_within_{r}m" for r in RADII_M]
    + ["worldpop2022_density_per_km2_1km"]
)


def _validate_latitude_longitude(latitude, longitude):
    """Same validation as majiguard_ml/climate_features.py, kept local
    here (a 4-line check) rather than shared, to keep each feature file
    self-contained and simple to read on its own."""
    if pd.isna(latitude) or pd.isna(longitude):
        raise ValueError("latitude and longitude are required (got a missing value).")
    if not (-90 <= latitude <= 90):
        raise ValueError(f"latitude must be between -90 and 90, got {latitude!r}.")
    if not (-180 <= longitude <= 180):
        raise ValueError(f"longitude must be between -180 and 180, got {longitude!r}.")


def get_population_features(latitude, longitude):
    """Compute the 4 worldpop2022_* features for ONE water point, from the
    local WorldPop 2022 raster, using the exact training dataset's
    calculation logic.

    Raises ValueError if the WorldPop file is missing or the point falls
    outside its coverage area.
    """
    _validate_latitude_longitude(latitude, longitude)
    if not WORLDPOP_PATH.exists():
        raise ValueError(f"WorldPop raster not found at {WORLDPOP_PATH}.")
    with rasterio.open(WORLDPOP_PATH) as src:
        return _compute_population_features(src, latitude, longitude)


def get_population_features_batch(records):
    """Same as get_population_features, for several water points at once.

    `records` is a list of dicts (or a DataFrame) with latitude and
    longitude. The WorldPop file is opened only once and reused for every
    record, instead of calling get_population_features() in a loop.
    """
    if isinstance(records, pd.DataFrame):
        records = records.to_dict("records")

    if not WORLDPOP_PATH.exists():
        raise ValueError(f"WorldPop raster not found at {WORLDPOP_PATH}.")

    results = []
    with rasterio.open(WORLDPOP_PATH) as src:
        for record in records:
            latitude = record["latitude"]
            longitude = record["longitude"]
            _validate_latitude_longitude(latitude, longitude)
            results.append(_compute_population_features(src, latitude, longitude))
    return results


def _compute_population_features(src, latitude, longitude):
    full_row, full_col = raster_rowcol(src.transform, longitude, latitude)
    if not (0 <= full_row < src.height and 0 <= full_col < src.width):
        raise ValueError(
            f"({latitude}, {longitude}) falls outside the local WorldPop Tanzania "
            f"raster's coverage area - no population data available there."
        )

    pixel_size_deg = src.res[0]  # same as scripts/03_extract_features.py's `res`
    largest_radius_m = max(RADII_M)
    # Pixel radius that's guaranteed to cover the largest requested radius,
    # using the original script's exact formula (not a new approximation).
    pixels_needed = int(np.ceil(
        largest_radius_m / (pixel_size_deg * METRES_PER_DEGREE_LONGITUDE_AT_EQUATOR
                             * PIXEL_SEARCH_MARGIN_FACTOR)
    )) + 1

    # Windowed read: only the small block of pixels around the point, not
    # the whole ~690 MB national raster. Truncated (not duplicated) at the
    # raster's edge - this only differs from the original script's
    # behaviour for a point right at the raster's boundary, which no real
    # Tanzania water point is close to (verified in scripts/13's tests).
    row0 = max(full_row - pixels_needed, 0)
    col0 = max(full_col - pixels_needed, 0)
    row1 = min(full_row + pixels_needed + 1, src.height)
    col1 = min(full_col + pixels_needed + 1, src.width)
    window = Window(col0, row0, col1 - col0, row1 - row0)

    population = src.read(1, window=window).astype("float32")
    population[population < 0] = 0.0
    population[~np.isfinite(population)] = 0.0

    window_transform = src.window_transform(window)
    n_rows, n_cols = population.shape
    row_index = np.arange(n_rows)
    col_index = np.arange(n_cols)

    # Geographic coordinates of each pixel's CENTRE (+0.5 pixel offset),
    # same affine-transform arithmetic as the original script.
    cell_lat = window_transform.f + (row_index + 0.5) * window_transform.e
    cell_lon = window_transform.c + (col_index + 0.5) * window_transform.a

    # Planar (flat-earth) approximate distance in metres - kept exactly as
    # in scripts/03_extract_features.py, not replaced with a geodesic or
    # reprojected distance.
    dy_m = (cell_lat - latitude) * METRES_PER_DEGREE_LATITUDE
    dx_m = (cell_lon - longitude) * METRES_PER_DEGREE_LONGITUDE_AT_EQUATOR * np.cos(np.radians(latitude))
    distance_m = np.sqrt(dy_m[:, None] ** 2 + dx_m[None, :] ** 2)

    features = {}
    for radius_m in RADII_M:
        within_radius = distance_m <= radius_m
        features[f"worldpop2022_pop_within_{radius_m}m"] = float(population[within_radius].sum())

    features["worldpop2022_density_per_km2_1km"] = (
        features["worldpop2022_pop_within_1000m"] / (np.pi * 1.0 ** 2)
    )
    return features
