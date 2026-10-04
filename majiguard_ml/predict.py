"""Production prediction layer for the saved MajiGuard model."""
from pathlib import Path
import numbers
import joblib
import numpy as np
import pandas as pd

from majiguard_ml.data_prep import RAW_INPUT_COLUMNS
from majiguard_ml.pipeline import (
    DEPLOYMENT_THRESHOLD,
    FUNCTIONAL_CLASS,
    NON_FUNCTIONAL_CLASS,
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PIPELINE_PATH = PROJECT_ROOT / "model_artifacts" / "v1_random_forest" / "majiguard_pipeline.joblib"


def load_pipeline():
    """Load the unchanged serialized preprocessing + model pipeline."""
    if not PIPELINE_PATH.exists():
        raise FileNotFoundError(f"Saved MajiGuard pipeline not found: {PIPELINE_PATH}")
    return joblib.load(PIPELINE_PATH)


def _validate_threshold(threshold):
    if isinstance(threshold, bool) or not isinstance(threshold, numbers.Real):
        raise ValueError("threshold must be a number between 0 and 1.")
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1.")
    return float(threshold)


def _prepare_frame(record):
    if isinstance(record, pd.DataFrame):
        frame = record.copy()
    elif isinstance(record, dict):
        frame = pd.DataFrame([record])
    else:
        raise TypeError("record must be a dict or pandas DataFrame.")
    if frame.empty:
        raise ValueError("record must contain one prepared model-input row.")
    missing = [c for c in RAW_INPUT_COLUMNS if c not in frame.columns]
    if missing:
        raise ValueError(f"Missing required model input feature(s): {missing}")
    return frame[RAW_INPUT_COLUMNS].reset_index(drop=True)


def risk_band(probability_non_functional):
    """Return presentation-only risk band; does not alter model prediction."""
    if not isinstance(probability_non_functional, numbers.Real) or not 0 <= probability_non_functional <= 1:
        raise ValueError("probability_non_functional must be between 0 and 1.")
    if probability_non_functional < DEPLOYMENT_THRESHOLD:
        return "Functional"
    if probability_non_functional < 0.70:
        return "Non-Functional / Moderate Risk"
    return "Non-Functional / High Risk"


def predict_batch(records, threshold=DEPLOYMENT_THRESHOLD, pipeline=None):
    """Predict a non-empty DataFrame of exact prepared 42-feature inputs."""
    threshold = _validate_threshold(threshold)
    if not isinstance(records, pd.DataFrame):
        raise TypeError("records must be a pandas DataFrame.")
    if records.empty:
        raise ValueError("records must not be empty.")
    frame = _prepare_frame(records)
    model_pipeline = load_pipeline() if pipeline is None else pipeline
    probabilities = model_pipeline.predict_proba(frame)
    classes = list(model_pipeline.named_steps["model"].classes_)
    try:
        nf_index = classes.index(NON_FUNCTIONAL_CLASS)
        f_index = classes.index(FUNCTIONAL_CLASS)
    except ValueError as exc:
        raise ValueError("Saved model must contain classes 0 (Non-Functional) and 1 (Functional).") from exc
    p_nf = np.asarray(probabilities[:, nf_index], dtype=float)
    p_f = np.asarray(probabilities[:, f_index], dtype=float)
    is_nf = p_nf >= threshold
    result = records.copy()
    result["prediction"] = np.where(is_nf, NON_FUNCTIONAL_CLASS, FUNCTIONAL_CLASS).astype(int)
    result["predicted_status"] = np.where(is_nf, "Non-Functional", "Functional")
    result["probability_non_functional"] = p_nf
    result["probability_functional"] = p_f
    result["decision_threshold"] = threshold
    result["threshold"] = threshold
    result["risk_band"] = [risk_band(value) for value in p_nf]
    return result


def predict_record(record, threshold=DEPLOYMENT_THRESHOLD, pipeline=None):
    """Predict one prepared 42-feature record and return one result dict."""
    frame = _prepare_frame(record)
    if len(frame) != 1:
        raise ValueError("predict_record requires exactly one prepared model-input row.")
    result = predict_batch(frame, threshold=threshold, pipeline=pipeline).iloc[0]
    return result.to_dict()



