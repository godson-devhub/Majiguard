"""Step 3.6 orchestration for locally available spatial features."""
import numbers
import pandas as pd
from majiguard_ml import accessibility_features, boundary_features, climate_features
from majiguard_ml import nearby_points_features, population_features

UNAVAILABLE_MODEL_FEATURES = (
    "wpdx_dist_primary_road_m", "wpdx_dist_secondary_road_m",
    "wpdx_dist_tertiary_road_m", "wpdx_dist_city_m", "wpdx_dist_town_m",
)


def _validate_arguments(latitude, longitude, survey_year, survey_month):
    for name, value in (("latitude", latitude), ("longitude", longitude),
                        ("survey_year", survey_year), ("survey_month", survey_month)):
        if value is None or pd.isna(value):
            raise ValueError(f"{name} is required (got a missing value).")
        if not isinstance(value, numbers.Real) or isinstance(value, bool):
            raise ValueError(f"{name} must be numeric, got {value!r}.")
    if not -90 <= latitude <= 90:
        raise ValueError(f"latitude must be between -90 and 90, got {latitude!r}.")
    if not -180 <= longitude <= 180:
        raise ValueError(f"longitude must be between -180 and 180, got {longitude!r}.")
    if int(survey_year) != survey_year or not 1900 <= survey_year <= 2100:
        raise ValueError(f"survey_year must be an integer between 1900 and 2100, got {survey_year!r}.")
    if int(survey_month) != survey_month or not 1 <= survey_month <= 12:
        raise ValueError(f"survey_month must be an integer between 1 and 12, got {survey_month!r}.")


def build_spatial_features(latitude, longitude, survey_year, survey_month):
    """Return deterministic available Step 3.2--3.5 features for one point.

    The five names in ``UNAVAILABLE_MODEL_FEATURES`` are intentionally omitted:
    no legitimate local source exists for those WPDx+ road/city/town inputs.
    """
    _validate_arguments(latitude, longitude, survey_year, survey_month)
    survey_year, survey_month = int(survey_year), int(survey_month)
    features = {}
    features.update(climate_features.get_rainfall_features(
        latitude, longitude, survey_year, survey_month))
    features.update(population_features.get_population_features(latitude, longitude))
    features["dist_nearest_health_facility_m"] = accessibility_features.get_health_facility_distance(
        latitude, longitude)
    features["dist_nearest_school_m"] = accessibility_features.get_school_distance(
        latitude, longitude)
    features.update(boundary_features.get_boundary_features(latitude, longitude))
    features.update(nearby_points_features.get_nearby_water_point_features(
        latitude, longitude))
    return features
