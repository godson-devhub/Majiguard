"""Reproduces the exact data-cleaning and feature-selection steps from
`notebooks/MajiGuard_Data_Science_ML.ipynb` (sections "Data Cleaning"
through "Remove Unnecessary Features", cells 83-218).

This file does not change any modeling decision made in the notebook. It
only turns the notebook's pandas steps into reusable functions so the same
42 model-ready columns can be reproduced outside the notebook, for building
and for verifying the production pipeline.

The column lists below (LEAKY_COLUMNS, NUMERIC_FEATURES, ...) are copied
verbatim from the notebook's own printed output, not re-derived, so the
production pipeline cannot accidentally select columns in a different
order than the one the saved Random Forest was trained on.
"""

import numpy as np
import pandas as pd

TARGET_COLUMN = "label_functional_status_id"

# Columns that directly encode the target or a close variant of it.
TARGET_RELATED_COLUMNS = [
    "status_clean",
    "status_id",
    "label_functional_status_clean",
    "label_functional_status_id",
]

# Columns flagged "_LEAKY" in the dataset (computed from the functional
# status of neighbouring points, or only populated when a point is
# non-functional) plus the WPdx duplicate flag. See data/metadata/data_dictionary.csv.
LEAKY_COLUMNS = [
    "wpdx_water_point_population_LEAKY",
    "wpdx_crucialness_score_LEAKY",
    "wpdx_pressure_score_LEAKY",
    "wpdx_rehab_priority_LEAKY",
    "wpdx_pop_would_gain_access_LEAKY",
    "dist_nearest_functional_other_m_LEAKY",
    "wpdx_is_duplicate_flag",
]

IDENTIFIER_COLUMNS = ["master_id", "wpdx_id", "row_id_export"]

AGE_DUPLICATE_COLUMN = ["age_at_survey_years"]

REDUNDANT_FEATURES = [
    "source_org",
    "installer",
    "nbs_district",
    "nbs_ward",
    "wpdx_local_population_1km",
]

UNNECESSARY_FEATURES = [
    "survey_date",
    "source_dataset_title",
    "nbs_ward_code",
    "wpdx_adm1_region",
    "wpdx_adm2_district",
    "wpdx_region_matches_nbs",
    "n_history_observations",
    "install_year",
    "rain_features_available",
]

# Categorical columns that get "Unknown" filled in during cleaning
# (notebook cell 92-93), before feature selection.
CATEGORICAL_FILL_UNKNOWN = [
    "water_source",
    "water_technology",
    "water_tech_category",
    "management_type",
    "installer",
    "subjective_water_quality",
    "payment_type",
    "nbs_region",
    "nbs_district",
    "nbs_ward",
]

# The 42 raw, model-ready columns the production pipeline accepts as input
# (state of X right after notebook cell 218, before cyclical-month
# encoding). Order matches the notebook's own `X.columns.tolist()` output.
RAW_INPUT_COLUMNS = [
    "latitude", "longitude", "survey_year", "survey_month",
    "water_source", "water_technology", "water_tech_category",
    "management_type", "payment_type", "usage_capacity",
    "subjective_water_quality", "inside_tz_adm0", "dist_to_tz_border_m",
    "nbs_region", "wpdx_is_urban", "dist_nearest_any_water_point_m",
    "n_water_points_within_500m", "n_water_points_within_1000m",
    "n_water_points_within_5000m", "wpdx_dist_primary_road_m",
    "wpdx_dist_secondary_road_m", "wpdx_dist_tertiary_road_m",
    "wpdx_dist_city_m", "wpdx_dist_town_m", "rain_3m_prior_mm",
    "rain_3m_pct_of_normal", "rain_3m_z", "rain_6m_prior_mm",
    "rain_6m_pct_of_normal", "rain_6m_z", "rain_12m_prior_mm",
    "rain_12m_pct_of_normal", "rain_12m_z",
    "rain_mean_annual_1991_2020_mm", "dry_months_prior12_lt30mm",
    "worldpop2022_pop_within_500m", "worldpop2022_pop_within_1000m",
    "worldpop2022_pop_within_2000m", "worldpop2022_density_per_km2_1km",
    "dist_nearest_health_facility_m", "dist_nearest_school_m",
    "calculated_age",
]

# Feature groups for the ColumnTransformer, copied verbatim from notebook
# cell 233's printed output (after cyclical-month encoding is applied).
# Hard-coded (not re-derived with select_dtypes) so column order always
# matches what the saved Random Forest was trained on.
NUMERIC_FEATURES = [
    "latitude", "longitude", "survey_year", "usage_capacity",
    "dist_to_tz_border_m", "dist_nearest_any_water_point_m",
    "n_water_points_within_500m", "n_water_points_within_1000m",
    "n_water_points_within_5000m", "wpdx_dist_primary_road_m",
    "wpdx_dist_secondary_road_m", "wpdx_dist_tertiary_road_m",
    "wpdx_dist_city_m", "wpdx_dist_town_m", "rain_3m_prior_mm",
    "rain_3m_pct_of_normal", "rain_3m_z", "rain_6m_prior_mm",
    "rain_6m_pct_of_normal", "rain_6m_z", "rain_12m_prior_mm",
    "rain_12m_pct_of_normal", "rain_12m_z",
    "rain_mean_annual_1991_2020_mm", "dry_months_prior12_lt30mm",
    "worldpop2022_pop_within_500m", "worldpop2022_pop_within_1000m",
    "worldpop2022_pop_within_2000m", "worldpop2022_density_per_km2_1km",
    "dist_nearest_health_facility_m", "dist_nearest_school_m",
    "calculated_age", "survey_month_sin", "survey_month_cos",
]

CATEGORICAL_FEATURES = [
    "water_source", "water_technology", "water_tech_category",
    "management_type", "payment_type", "subjective_water_quality",
    "nbs_region",
]

BOOLEAN_FEATURES = ["inside_tz_adm0", "wpdx_is_urban"]


def load_raw_dataset(csv_path):
    """Load majiguard_master_v0.csv exactly as the notebook did (cell 5)."""
    return pd.read_csv(csv_path)


def derive_calculated_age(df):
    """Reproduce notebook cells 85-88 exactly:
    install_year values later than survey_year are invalid -> NaN, then
    calculated_age = survey_year - install_year.

    Shared by the training-data path (clean_dataset) and the raw
    new-water-point path (majiguard_ml/raw_input_prep.py), so both use the
    identical, notebook-verified formula.
    """
    df = df.copy()
    invalid_install_year = df["install_year"] > df["survey_year"]
    df.loc[invalid_install_year, "install_year"] = np.nan
    df["calculated_age"] = df["survey_year"] - df["install_year"]
    return df


def fill_unknown_categoricals(df, columns):
    """Reproduce notebook cells 92-93: fill missing categorical values with
    the literal string "Unknown". Shared by clean_dataset (training data,
    uses CATEGORICAL_FILL_UNKNOWN) and raw_input_prep.py (new water points,
    uses CATEGORICAL_FEATURES - the subset that survives into the final 42).
    """
    df = df.copy()
    for col in columns:
        df[col] = df[col].fillna("Unknown")
    return df


def clean_dataset(df):
    """Reproduce notebook cells 83-94 (Data Cleaning) on a copy of df."""
    df_clean = df.copy()
    df_clean = derive_calculated_age(df_clean)
    df_clean = fill_unknown_categoricals(df_clean, CATEGORICAL_FILL_UNKNOWN)
    return df_clean


def select_model_features(df_clean):
    """Reproduce notebook cells 187-218 (feature selection) -> 42-column X.

    Returns the raw, model-ready DataFrame (RAW_INPUT_COLUMNS) that the
    production pipeline expects as input.
    """
    columns_to_drop = (
        TARGET_RELATED_COLUMNS
        + LEAKY_COLUMNS
        + IDENTIFIER_COLUMNS
        + AGE_DUPLICATE_COLUMN
        + REDUNDANT_FEATURES
        + UNNECESSARY_FEATURES
    )
    X = df_clean.drop(columns=columns_to_drop)
    return X[RAW_INPUT_COLUMNS]


def get_target(df_clean):
    """Reproduce notebook cell 187 -> y."""
    return df_clean[TARGET_COLUMN].copy()


def prepare_features_and_target(csv_path):
    """Convenience wrapper: raw CSV path -> (X_raw, y)."""
    df = load_raw_dataset(csv_path)
    df_clean = clean_dataset(df)
    X = select_model_features(df_clean)
    y = get_target(df_clean)
    return X, y
