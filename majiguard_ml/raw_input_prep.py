"""Step 2 - turns ONE new/raw water-point record into the exact 42-column
input that `model_artifacts/v1_random_forest/majiguard_pipeline.joblib`
expects.

This is the layer between "a new water point we just heard about" and the
saved prediction pipeline:

    Raw/New Water-Point Record
            |
    prepare_raw_record()   <- this file
            |
    42 Model Input Columns
            |
    Saved MajiGuard Pipeline (majiguard_ml/pipeline.py)
            |
    Prediction

It does NOT invent any new feature. It applies exactly the same two
transformation steps already validated in the training notebook and reused
from majiguard_ml/data_prep.py:
    - derive_calculated_age  (install_year -> calculated_age)
    - fill_unknown_categoricals (missing category -> "Unknown")
It does not change the model or the pipeline built in Step 1.
"""

import numpy as np
import pandas as pd

from majiguard_ml.data_prep import (
    BOOLEAN_FEATURES,
    CATEGORICAL_FEATURES,
    RAW_INPUT_COLUMNS,
    derive_calculated_age,
    fill_unknown_categoricals,
)

# What a caller must supply: the 42 pipeline input columns, except
# `calculated_age` (which is derived here), plus `install_year` and
# `survey_year` (needed to derive it - survey_year is already one of the 42).
REQUIRED_RAW_RECORD_COLUMNS = [
    col for col in RAW_INPUT_COLUMNS if col != "calculated_age"
] + ["install_year"]

_TRUE_VALUES = {True, 1, 1.0, "true", "True", "TRUE", "yes", "Yes"}
_FALSE_VALUES = {False, 0, 0.0, "false", "False", "FALSE", "no", "No"}


def _to_dataframe(record):
    """Accept a dict (one water point), a list of dicts, or a DataFrame."""
    if isinstance(record, pd.DataFrame):
        return record.copy()
    if isinstance(record, dict):
        return pd.DataFrame([record])
    return pd.DataFrame(record)


def _validate_required_columns(df):
    missing = [c for c in REQUIRED_RAW_RECORD_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            "Raw water-point record is missing required column(s): "
            f"{missing}\n\nAll required columns:\n{REQUIRED_RAW_RECORD_COLUMNS}"
        )


def _coerce_boolean_value(value):
    if pd.isna(value):
        return np.nan
    if value in _TRUE_VALUES:
        return True
    if value in _FALSE_VALUES:
        return False
    raise ValueError(
        f"Cannot interpret {value!r} as a boolean value "
        f"(expected True/False, 1/0, or 'yes'/'no')."
    )


def _coerce_boolean_columns(df, columns):
    df = df.copy()
    for col in columns:
        df[col] = df[col].map(_coerce_boolean_value)
    return df


def prepare_raw_record(record):
    """Turn a new/raw water-point record into the pipeline's 42-column input.

    Parameters
    ----------
    record : dict | list[dict] | pandas.DataFrame
        One or more new water points. Must contain every column in
        REQUIRED_RAW_RECORD_COLUMNS (all 42 pipeline input columns except
        `calculated_age`, plus `install_year`).

    Returns
    -------
    pandas.DataFrame
        Exactly the 42 columns in RAW_INPUT_COLUMNS, in that exact order -
        ready to hand to the saved pipeline.
    """
    df = _to_dataframe(record)
    _validate_required_columns(df)

    df = derive_calculated_age(df)
    df = fill_unknown_categoricals(df, CATEGORICAL_FEATURES)
    df = _coerce_boolean_columns(df, BOOLEAN_FEATURES)

    prepared = df[RAW_INPUT_COLUMNS].reset_index(drop=True)

    assert list(prepared.columns) == RAW_INPUT_COLUMNS, (
        "Internal error: prepared columns do not match RAW_INPUT_COLUMNS."
    )
    assert prepared.shape[1] == 42, (
        f"Internal error: expected 42 columns, got {prepared.shape[1]}."
    )
    return prepared
