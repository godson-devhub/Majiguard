"""Step 3.2 - Climate Feature Extraction.

Turns (latitude, longitude, survey_year, survey_month) into the 11
rain_*/dry_months_prior12_lt30mm columns the model was trained on, by
reading the SAME local CHIRPS rainfall stack with the SAME calculation
logic already validated in scripts/03_extract_features.py. No new rainfall
methodology is introduced here - this is a refactor, not a redesign.

    latitude + longitude + survey date
            |
    CHIRPS local rainfall data (data/raw/climate/chirps_v3_monthly_TZA/*.tif)
            |
    exact same rainfall calculations used during dataset construction
            |
    rainfall feature dictionary

Source data: CHIRPS v3.0 monthly rainfall, Tanzania window, GeoTIFF with
one band per month, band 1 = 1981-01 (see scripts/01_download_chirps_tz.py
and the .meta.json next to the .tif). Native CRS EPSG:4326, ~0.05 degree
pixels, values in mm/month, nodata = -9999.

Calculation logic (copied from scripts/03_extract_features.py, verified
against it cell by cell before writing this file):
    - The raster cell is selected with rasterio's row/col lookup for the
      point's (lon, lat) - the cell that CONTAINS the point.
    - The survey month itself is band index
      (survey_year - 1981) * 12 + (survey_month - 1)  [0 = 1981-01].
    - Every rainfall window ENDS the month BEFORE the survey month (the
      survey month itself is never included in any sum).
    - "3m"/"6m"/"12m" = the trailing 3/6/12-month sum ending at that
      month-before-survey band.
    - The 1991-2020 climatological mean/std for each window length is
      computed per CALENDAR month that the window ends on (e.g. all
      3-month sums that end in November, 1991-2020), matching WMO 30-year
      normal convention.
    - rain_*_pct_of_normal = value / climatology_mean * 100
    - rain_*_z             = (value - climatology_mean) / climatology_std
    - dry_months_prior12_lt30mm = how many of the 12 months ending the
      month before survey had < 30 mm rainfall.
    - rain_mean_annual_1991_2020_mm = the cell's long-term mean annual
      total rainfall, 1991-2020 (not window/calendar-month specific).
    - If the exact cell has no data (e.g. a coastal/lake pixel), the
      value falls back to the mean of the surrounding 3x3 cells - exactly
      as scripts/03_extract_features.py's val() helper does.

This module does NOT silently fill missing rainfall history: if the
survey date doesn't have enough CHIRPS history, falls outside the local
stack's coverage, or lands on a location with no usable data even after
the 3x3 fallback, it raises a clear ValueError instead of returning NaN.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
from rasterio.transform import rowcol as raster_rowcol
from rasterio.windows import Window

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CHIRPS_PATH = (
    PROJECT_ROOT / "data" / "raw" / "climate" / "chirps_v3_monthly_TZA"
    / "chirps-v3.0_monthly_TZA_clip_1981-2026.tif"
)

CHIRPS_FIRST_YEAR = 1981
CHIRPS_FIRST_MONTH = 1
CLIMATOLOGY_START_YEAR = 1991
CLIMATOLOGY_END_YEAR = 2020
DRY_MONTH_THRESHOLD_MM = 30
WINDOW_LENGTHS = {"3m": 3, "6m": 6, "12m": 12}

RAINFALL_FEATURE_NAMES = (
    [f"rain_{name}_prior_mm" for name in WINDOW_LENGTHS]
    + [f"rain_{name}_pct_of_normal" for name in WINDOW_LENGTHS]
    + [f"rain_{name}_z" for name in WINDOW_LENGTHS]
    + ["rain_mean_annual_1991_2020_mm", "dry_months_prior12_lt30mm"]
)


def _validate_latitude_longitude(latitude, longitude):
    if pd.isna(latitude) or pd.isna(longitude):
        raise ValueError("latitude and longitude are required (got a missing value).")
    if not (-90 <= latitude <= 90):
        raise ValueError(f"latitude must be between -90 and 90, got {latitude!r}.")
    if not (-180 <= longitude <= 180):
        raise ValueError(f"longitude must be between -180 and 180, got {longitude!r}.")


def _validate_survey_date(survey_year, survey_month):
    if pd.isna(survey_year) or pd.isna(survey_month):
        raise ValueError("survey_year and survey_month are required (got a missing value).")
    survey_month = int(survey_month)
    survey_year = int(survey_year)
    if not (1 <= survey_month <= 12):
        raise ValueError(f"survey_month must be between 1 and 12, got {survey_month!r}.")
    if not (1900 <= survey_year <= 2100):
        raise ValueError(f"survey_year looks invalid: {survey_year!r}.")
    return survey_year, survey_month


def _band_index(year, month):
    """0 = 1981-01, 1 = 1981-02, ... (matches scripts/03_extract_features.py)."""
    return (year - CHIRPS_FIRST_YEAR) * 12 + (month - CHIRPS_FIRST_MONTH)


def _rolling_sum(values, length):
    """values[i] -> sum of values[i-length+1 : i+1] (trailing window ending at i).
    Missing months (NaN) count as 0 mm, matching scripts/03_extract_features.py's
    roll_sum() exactly (it fills NaN with 0 before summing)."""
    filled = np.nan_to_num(values, nan=0.0)
    cumulative = np.cumsum(filled, axis=0)
    total = cumulative.copy()
    total[length:] = cumulative[length:] - cumulative[:-length]
    total[: length - 1] = np.nan
    return total


def get_rainfall_features(latitude, longitude, survey_year, survey_month):
    """Compute the 11 rain_*/dry_months_prior12_lt30mm features for ONE
    water point, from the local CHIRPS stack, using the exact training
    dataset's calculation logic.

    Raises ValueError (with a clear explanation) instead of returning NaN
    if the required CHIRPS history isn't available.
    """
    _validate_latitude_longitude(latitude, longitude)
    survey_year, survey_month = _validate_survey_date(survey_year, survey_month)
    with rasterio.open(CHIRPS_PATH) as src:
        return _compute_rainfall_features(src, latitude, longitude, survey_year, survey_month)


def get_rainfall_features_batch(records):
    """Same as get_rainfall_features, for several water points at once.

    `records` is a list of dicts (or a DataFrame) with latitude, longitude,
    survey_year, survey_month. The CHIRPS file is opened only once and
    reused for every record - the only reason this helper exists instead
    of just calling get_rainfall_features() in a loop.

    Returns a list of feature dicts, in the same order as `records`.
    """
    if isinstance(records, pd.DataFrame):
        records = records.to_dict("records")

    results = []
    with rasterio.open(CHIRPS_PATH) as src:
        for record in records:
            latitude = record["latitude"]
            longitude = record["longitude"]
            survey_year = record["survey_year"]
            survey_month = record["survey_month"]
            _validate_latitude_longitude(latitude, longitude)
            survey_year, survey_month = _validate_survey_date(survey_year, survey_month)
            results.append(
                _compute_rainfall_features(src, latitude, longitude, survey_year, survey_month)
            )
    return results


def _compute_rainfall_features(src, latitude, longitude, survey_year, survey_month):
    full_row, full_col = raster_rowcol(src.transform, longitude, latitude)
    if not (0 <= full_row < src.height and 0 <= full_col < src.width):
        raise ValueError(
            f"({latitude}, {longitude}) falls outside the local CHIRPS Tanzania "
            f"raster's coverage area - no rainfall data available there."
        )

    n_bands = src.count
    survey_band = _band_index(survey_year, survey_month)
    window_end_band = survey_band - 1  # windows end the month BEFORE the survey month

    if survey_band < 12:
        raise ValueError(
            f"Not enough rainfall history for survey date {survey_year}-{survey_month:02d}: "
            f"12 full months of CHIRPS data are needed before it, but the CHIRPS stack "
            f"starts {CHIRPS_FIRST_YEAR}-{CHIRPS_FIRST_MONTH:02d}."
        )
    if survey_band > n_bands - 1:
        last_year = CHIRPS_FIRST_YEAR + (n_bands - 1) // 12
        last_month = (n_bands - 1) % 12 + 1
        raise ValueError(
            f"Survey date {survey_year}-{survey_month:02d} is beyond the local CHIRPS "
            f"stack's coverage (data available through {last_year}-{last_month:02d}). "
            f"Re-run scripts/01_download_chirps_tz.py to refresh it."
        )

    # A small neighbourhood (up to 3x3) around the point's own cell - just
    # enough to reproduce scripts/03_extract_features.py's nodata fallback,
    # without reading the whole 548-band stack for one point.
    row0, col0 = max(full_row - 1, 0), max(full_col - 1, 0)
    row1, col1 = min(full_row + 2, src.height), min(full_col + 2, src.width)
    window = Window(col0, row0, col1 - col0, row1 - row0)

    patch = src.read(window=window).astype("float32")  # shape (n_bands, h, w)
    patch[patch < 0] = np.nan  # CHIRPS nodata sentinel (-9999) -> NaN

    point_row, point_col = full_row - row0, full_col - col0

    def value_at(band_2d):
        """The point's own cell; if it's nodata, fall back to the mean of
        the surrounding patch (matches scripts/03_extract_features.py's val())."""
        v = band_2d[point_row, point_col]
        if np.isnan(v):
            v = np.nanmean(band_2d) if np.isfinite(band_2d).any() else np.nan
        return float(v)

    years = CHIRPS_FIRST_YEAR + np.arange(n_bands) // 12
    month_of_year = np.arange(n_bands) % 12  # 0=Jan .. 11=Dec
    is_climatology_year = (years >= CLIMATOLOGY_START_YEAR) & (years <= CLIMATOLOGY_END_YEAR)
    window_end_month_of_year = window_end_band % 12
    same_calendar_month = is_climatology_year & (month_of_year == window_end_month_of_year)

    features = {}
    for name, length in WINDOW_LENGTHS.items():
        series = _rolling_sum(patch, length)
        value_mm = value_at(series[window_end_band])
        climatology_mean = value_at(np.nanmean(series[same_calendar_month], axis=0))
        climatology_std = value_at(np.nanstd(series[same_calendar_month], axis=0))

        features[f"rain_{name}_prior_mm"] = value_mm
        features[f"rain_{name}_pct_of_normal"] = (
            value_mm / climatology_mean * 100 if climatology_mean > 0 else np.nan
        )
        features[f"rain_{name}_z"] = (
            (value_mm - climatology_mean) / climatology_std if climatology_std > 0 else np.nan
        )

    annual_sums = np.stack([
        np.nansum(patch[years == y], axis=0)
        for y in range(CLIMATOLOGY_START_YEAR, CLIMATOLOGY_END_YEAR + 1)
    ])
    features["rain_mean_annual_1991_2020_mm"] = value_at(np.nanmean(annual_sums, axis=0))

    dry_month_mask = np.where(np.isnan(patch), np.nan, (patch < DRY_MONTH_THRESHOLD_MM).astype("float32"))
    dry_12m_series = _rolling_sum(dry_month_mask, 12)
    features["dry_months_prior12_lt30mm"] = value_at(dry_12m_series[window_end_band])

    missing = [name for name, value in features.items() if np.isnan(value)]
    if missing:
        raise ValueError(
            f"No usable CHIRPS rainfall data at ({latitude}, {longitude}) for: {missing}. "
            f"This location likely falls on a permanent no-data cell (e.g. open water) "
            f"even after checking neighbouring cells."
        )

    return features
