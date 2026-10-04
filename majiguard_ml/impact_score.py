"""Step 5.4 - MajiGuard AI Impact Score (methodology "impact_v1").

Definition (approved in Step 5.3): a relative, unitless proxy index
representing the potential magnitude of consequence to the surrounding
community if a water point is or becomes Non-Functional, based on
population exposure and potential alternative-access context.

It is NOT: actual people affected, confirmed beneficiaries, a probability
of failure or of impact, a causal measure, or a validated outcome measure.
No real-world impact ground truth exists for this project, so this score
is never validated against actual outcomes - only internally consistent.

    population_within_1000m ----> log1p ----> percentile ----\\
                                                                +--> impact_score
    n_water_points_within_1000m -> log1p -> percentile -> 1-x-/

Both components are looked up against a FIXED, versioned reference
distribution (model_artifacts/impact_v1/), built once by
scripts/18_build_impact_reference_distribution.py from the current
majiguard_master_v0 dataset. This module never recomputes that reference
from whatever it happens to be scoring - every point scored under
"impact_v1" is compared against the exact same baseline.

This module is intentionally separate from majiguard_ml/predict.py: Impact
and Prediction are different concepts and must not share code or outputs.
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
IMPACT_ARTIFACT_DIR = PROJECT_ROOT / "model_artifacts" / "impact_v1"
REFERENCE_PATH = IMPACT_ARTIFACT_DIR / "reference_distribution.npz"
METHODOLOGY_PATH = IMPACT_ARTIFACT_DIR / "methodology.json"

METHODOLOGY_VERSION = "impact_v1"
POPULATION_FEATURE = "worldpop2022_pop_within_1000m"
ALTERNATIVE_FEATURE = "n_water_points_within_1000m"
POPULATION_WEIGHT = 0.5
SCARCITY_WEIGHT = 0.5

IMPACT_SCORE_FIELDS = [
    "impact_score",
    "population_raw", "population_log1p", "population_percentile",
    "population_below_reference_range", "population_above_reference_range",
    "alternative_count_raw", "alternative_count_log1p", "alternative_access_percentile",
    "alternative_below_reference_range", "alternative_above_reference_range",
    "alternative_scarcity",
    "population_component", "alternative_scarcity_component",
    "impact_score_available", "impact_unavailable_reason", "methodology_version",
]


def load_reference_distribution():
    """Load the fixed reference distribution + methodology metadata from
    disk. Raises a clear error if the artifact hasn't been built yet -
    never silently falls back to computing statistics from whatever is
    being scored."""
    if not REFERENCE_PATH.exists():
        raise ValueError(
            f"Impact score reference distribution not found at {REFERENCE_PATH}. "
            f"Run scripts/18_build_impact_reference_distribution.py first."
        )
    if not METHODOLOGY_PATH.exists():
        raise ValueError(f"Impact score methodology metadata not found at {METHODOLOGY_PATH}.")

    npz = np.load(REFERENCE_PATH)
    population_ref = npz["population_log1p_sorted"]
    alternative_ref = npz["alternative_count_log1p_sorted"]
    with open(METHODOLOGY_PATH) as f:
        methodology = json.load(f)
    return population_ref, alternative_ref, methodology


def _is_missing(value):
    return value is None or (isinstance(value, (float, np.floating)) and np.isnan(value))


def _percentile(sorted_reference, value):
    """Deterministic percentile of `value` against `sorted_reference`
    (ascending): the mean of the weak (<=) and strict (<) empirical CDF -
    a standard, tie-consistent convention. Always in [0,1] by
    construction - values outside the reference range are naturally
    clipped (searchsorted saturates at 0 or N), no separate clip needed.
    Returns (percentile, below_range, above_range)."""
    n = len(sorted_reference)
    left = int(np.searchsorted(sorted_reference, value, side="left"))
    right = int(np.searchsorted(sorted_reference, value, side="right"))
    percentile = (left + right) / (2 * n)
    below_range = bool(value < sorted_reference[0])
    above_range = bool(value > sorted_reference[-1])
    return percentile, below_range, above_range


def _empty_result(reason, population_raw=None, alternative_raw=None):
    result = {name: None for name in IMPACT_SCORE_FIELDS}
    result["impact_score_available"] = False
    result["impact_unavailable_reason"] = reason
    result["methodology_version"] = METHODOLOGY_VERSION
    result["population_raw"] = population_raw
    result["alternative_count_raw"] = alternative_raw
    return result


def compute_impact_score(population_within_1000m, water_points_within_1000m,
                          population_ref=None, alternative_ref=None):
    """Compute the Impact Score for ONE water point.

    population_within_1000m: worldpop2022_pop_within_1000m (people)
    water_points_within_1000m: n_water_points_within_1000m (count)

    If either required input is missing, returns impact_score=None with
    impact_score_available=False and an explicit reason - never a
    reduced-dimension score, never an imputed value.

    population_ref/alternative_ref: pass pre-loaded reference arrays to
    avoid reloading the artifact on every call (used by the batch helper
    below, and by tests that need a tiny synthetic reference instead of
    the production one). If omitted, the production artifact is loaded.
    """
    missing_reasons = []
    if _is_missing(population_within_1000m):
        missing_reasons.append(f"{POPULATION_FEATURE} is missing")
    if _is_missing(water_points_within_1000m):
        missing_reasons.append(f"{ALTERNATIVE_FEATURE} is missing")
    if missing_reasons:
        return _empty_result(
            "; ".join(missing_reasons),
            population_raw=population_within_1000m,
            alternative_raw=water_points_within_1000m,
        )

    # Fail clearly on genuinely invalid (not missing) input - never
    # silently "correct" a negative or non-finite value.
    for name, value in (
        (POPULATION_FEATURE, population_within_1000m),
        (ALTERNATIVE_FEATURE, water_points_within_1000m),
    ):
        if not np.isfinite(value):
            raise ValueError(f"{name} must be a finite number, got {value!r}.")
        if value < 0:
            raise ValueError(f"{name} must not be negative, got {value!r}.")

    if population_ref is None or alternative_ref is None:
        population_ref, alternative_ref, _ = load_reference_distribution()

    population_raw = float(population_within_1000m)
    alternative_raw = float(water_points_within_1000m)

    population_log1p = float(np.log1p(population_raw))
    alternative_log1p = float(np.log1p(alternative_raw))

    population_percentile, pop_below, pop_above = _percentile(population_ref, population_log1p)
    alternative_access_percentile, alt_below, alt_above = _percentile(alternative_ref, alternative_log1p)
    alternative_scarcity = 1.0 - alternative_access_percentile

    population_component = POPULATION_WEIGHT * population_percentile
    alternative_scarcity_component = SCARCITY_WEIGHT * alternative_scarcity
    impact_score = population_component + alternative_scarcity_component

    return {
        "impact_score": impact_score,
        "population_raw": population_raw,
        "population_log1p": population_log1p,
        "population_percentile": population_percentile,
        "population_below_reference_range": pop_below,
        "population_above_reference_range": pop_above,
        "alternative_count_raw": alternative_raw,
        "alternative_count_log1p": alternative_log1p,
        "alternative_access_percentile": alternative_access_percentile,
        "alternative_below_reference_range": alt_below,
        "alternative_above_reference_range": alt_above,
        "alternative_scarcity": alternative_scarcity,
        "population_component": population_component,
        "alternative_scarcity_component": alternative_scarcity_component,
        "impact_score_available": True,
        "impact_unavailable_reason": None,
        "methodology_version": METHODOLOGY_VERSION,
    }


def compute_impact_score_batch(records):
    """Same as compute_impact_score, for several water points at once.
    `records`: list of dicts (or a DataFrame) with worldpop2022_pop_within_1000m
    and n_water_points_within_1000m. The reference distribution is loaded
    ONLY ONCE and reused for every record - it is fixed externally and is
    never recomputed from the batch being scored."""
    if isinstance(records, pd.DataFrame):
        records = records.to_dict("records")

    population_ref, alternative_ref, _ = load_reference_distribution()
    return [
        compute_impact_score(
            record.get(POPULATION_FEATURE),
            record.get(ALTERNATIVE_FEATURE),
            population_ref=population_ref,
            alternative_ref=alternative_ref,
        )
        for record in records
    ]
