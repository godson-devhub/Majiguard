"""Step 7, Layer 1 - Consequence-Priority Signal (methodology "consequence_priority_v1").

Combines the EXISTING outputs of the prediction layer (Step 4,
majiguard_ml/predict.py) and the impact layer (Step 5.4,
majiguard_ml/impact_score.py) into one auditable record. It does not
recompute, recalibrate, or modify either upstream output - it only reads
and packages them.

    Prediction (Step 4)  ---probability_non_functional--\\
                                                            build_consequence_priority_signal()
    Impact (Step 5.4)    ---impact_score------------------/

Architecture stays one-directional: Prediction -> Impact -> Consequence-
Priority. This module never feeds anything back into the model, model
training, or feature engineering (see "Data leakage / model safety" note
at the bottom of this file).

Per the approved Step 6/7 methodology:
  - Risk and Impact are preserved as separate, first-class fields in the
    output - never collapsed into one number by default.
  - An OPTIONAL risk_impact_index (= probability_non_functional *
    impact_score) is computed only when BOTH are available, and is always
    returned together with a disclaimer explaining what it does not mean.
  - It is never called "Maintenance Priority", "Expected Impact",
    "Expected People Affected", "Expected Loss", or "Risk-Adjusted
    Impact" - only "risk-impact index".
  - No priority bands (Low/Medium/High) are created here or anywhere in
    this module.
  - Missing Risk or Impact never gets imputed - the corresponding output
    fields stay None and an explicit reason is recorded.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PREDICTION_CONFIG_PATH = PROJECT_ROOT / "model_artifacts" / "v1_random_forest" / "model_config.json"

CONSEQUENCE_PRIORITY_METHODOLOGY_VERSION = "consequence_priority_v1"

RISK_BAND_NOTE = (
    "Presentation field from the prediction layer only. Its 0.40 cutoff is "
    "evidence-based (Step 4 threshold analysis); the further 0.70 'High Risk' "
    "sub-split is a presentation convenience and has not been independently "
    "validated (see Step 6)."
)

RISK_IMPACT_INDEX_NOTE = (
    "A relative ranking aid that combines the model-estimated Non-Functional "
    "likelihood score with the relative Impact Score. It is not an expected "
    "number of people affected, not expected monetary loss, not a calibrated "
    "expected value, and not a causal estimate. It is NOT Maintenance "
    "Priority - see Step 7 methodology."
)

CONSEQUENCE_PRIORITY_FIELDS = [
    "water_point_id",
    # Risk (Step 4 - pass-through only, never recomputed here)
    "risk_available",
    "probability_non_functional", "probability_functional", "predicted_status",
    "decision_threshold", "risk_band", "risk_band_note",
    "prediction_methodology_version",
    # Impact (Step 5.4 - pass-through only, never recomputed here)
    "impact_available",
    "impact_score", "impact_methodology_version",
    "population_component", "alternative_scarcity_component",
    # Layer 1 synthesis (optional)
    "risk_impact_index_available", "risk_impact_index", "risk_impact_index_note",
    "consequence_priority_methodology_version",
    "consequence_priority_unavailable_reason",
    "computed_at",
]


def _load_prediction_methodology_version():
    if not PREDICTION_CONFIG_PATH.exists():
        return None
    with open(PREDICTION_CONFIG_PATH) as f:
        config = json.load(f)
    return config.get("pipeline_version")


_PREDICTION_METHODOLOGY_VERSION = _load_prediction_methodology_version()


def _get(mapping, key):
    """Works for a plain dict or a pandas Series - both support .get()."""
    if mapping is None:
        return None
    return mapping.get(key)


def _risk_is_available(prediction_result):
    if not prediction_result:
        return False
    value = _get(prediction_result, "probability_non_functional")
    if value is None:
        return False
    return not (isinstance(value, float) and pd.isna(value))


def _impact_is_available(impact_result):
    if not impact_result:
        return False
    return _get(impact_result, "impact_score_available") is True


def build_consequence_priority_signal(prediction_result=None, impact_result=None, water_point_id=None):
    """Compose ONE water point's Consequence-Priority record from the
    EXISTING outputs of predict.py (prediction_result) and impact_score.py
    (impact_result).

    prediction_result: a dict/Series like majiguard_ml.predict.predict_record()
        returns (must contain probability_non_functional to count as
        available), or None if no prediction is available for this point.
    impact_result: a dict like majiguard_ml.impact_score.compute_impact_score()
        returns, or None if no impact result is available for this point.
    water_point_id: optional identifier, carried through for auditability.

    Neither upstream value is recomputed, recalibrated, or modified here.
    """
    risk_available = _risk_is_available(prediction_result)
    impact_available = _impact_is_available(impact_result)

    result = {name: None for name in CONSEQUENCE_PRIORITY_FIELDS}
    result["water_point_id"] = water_point_id
    result["consequence_priority_methodology_version"] = CONSEQUENCE_PRIORITY_METHODOLOGY_VERSION
    result["computed_at"] = datetime.now(timezone.utc).isoformat()
    result["risk_available"] = risk_available
    result["impact_available"] = impact_available

    if risk_available:
        result["probability_non_functional"] = _get(prediction_result, "probability_non_functional")
        result["probability_functional"] = _get(prediction_result, "probability_functional")
        result["predicted_status"] = _get(prediction_result, "predicted_status")
        result["decision_threshold"] = _get(prediction_result, "decision_threshold")
        result["risk_band"] = _get(prediction_result, "risk_band")
        result["risk_band_note"] = RISK_BAND_NOTE
        result["prediction_methodology_version"] = _PREDICTION_METHODOLOGY_VERSION

    if impact_available:
        result["impact_score"] = _get(impact_result, "impact_score")
        result["impact_methodology_version"] = _get(impact_result, "methodology_version")
        result["population_component"] = _get(impact_result, "population_component")
        result["alternative_scarcity_component"] = _get(impact_result, "alternative_scarcity_component")

    if risk_available and impact_available:
        risk_impact_index = float(result["probability_non_functional"]) * float(result["impact_score"])
        result["risk_impact_index"] = risk_impact_index
        result["risk_impact_index_available"] = True
        result["risk_impact_index_note"] = RISK_IMPACT_INDEX_NOTE
    else:
        result["risk_impact_index_available"] = False
        missing = []
        if not risk_available:
            missing.append("probability_non_functional unavailable")
        if not impact_available:
            missing.append("impact_score unavailable")
        result["consequence_priority_unavailable_reason"] = "; ".join(missing)

    return result


def build_consequence_priority_signal_batch(prediction_results, impact_results, water_point_ids=None):
    """Same as build_consequence_priority_signal, for several water points
    at once. prediction_results/impact_results/water_point_ids must be
    same-length sequences (use None entries for points missing a
    prediction or an impact result)."""
    n = max(
        len(prediction_results) if prediction_results is not None else 0,
        len(impact_results) if impact_results is not None else 0,
    )
    preds = prediction_results if prediction_results is not None else [None] * n
    impacts = impact_results if impact_results is not None else [None] * n
    ids = water_point_ids if water_point_ids is not None else [None] * n
    return [
        build_consequence_priority_signal(p, i, wid)
        for p, i, wid in zip(preds, impacts, ids)
    ]


# ---------------------------------------------------------------------
# Data leakage / model safety note (Step 7 task item 11):
# This module NEVER imports majiguard_ml.pipeline's fitting/training code,
# never calls model.fit(...), and never writes its output back into any
# feature used by majiguard_ml.predict or the saved model pipeline. It is
# a one-directional, read-only downstream consumer:
#     Prediction (Step 4) -> Impact (Step 5.4) -> Consequence-Priority (here)
# not a loop back into Prediction.
# ---------------------------------------------------------------------
