"""Step 5.4 - build the fixed, versioned reference distribution for the
Impact Score (methodology "impact_v1").

Run once, or whenever the methodology is deliberately re-baselined:

    python scripts/18_build_impact_reference_distribution.py

Produces:
    model_artifacts/impact_v1/reference_distribution.npz
    model_artifacts/impact_v1/methodology.json

majiguard_ml/impact_score.py only ever LOADS this artifact - it never
recomputes reference statistics on the fly, so every water point scored
under "impact_v1" is compared against the exact same fixed baseline.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_PARQUET = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.parquet"
OUTPUT_DIR = PROJECT_ROOT / "model_artifacts" / "impact_v1"

METHODOLOGY_VERSION = "impact_v1"
POPULATION_FEATURE = "worldpop2022_pop_within_1000m"
ALTERNATIVE_FEATURE = "n_water_points_within_1000m"
POPULATION_WEIGHT = 0.5
SCARCITY_WEIGHT = 0.5


def main():
    df = pd.read_parquet(SOURCE_PARQUET, columns=[POPULATION_FEATURE, ALTERNATIVE_FEATURE])
    total_rows = len(df)

    valid = df.dropna(subset=[POPULATION_FEATURE, ALTERNATIVE_FEATURE]).copy()
    valid = valid[
        (valid[POPULATION_FEATURE] >= 0) & (valid[ALTERNATIVE_FEATURE] >= 0)
        & np.isfinite(valid[POPULATION_FEATURE]) & np.isfinite(valid[ALTERNATIVE_FEATURE])
    ]
    excluded_rows = total_rows - len(valid)
    print(f"Source rows: {total_rows}")
    print(f"Valid reference rows (both features present, non-negative, finite): {len(valid)}")
    print(f"Excluded rows: {excluded_rows}")

    population_log1p_sorted = np.sort(np.log1p(valid[POPULATION_FEATURE].to_numpy(dtype="float64")))
    alternative_log1p_sorted = np.sort(np.log1p(valid[ALTERNATIVE_FEATURE].to_numpy(dtype="float64")))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    np.savez(
        OUTPUT_DIR / "reference_distribution.npz",
        population_log1p_sorted=population_log1p_sorted,
        alternative_count_log1p_sorted=alternative_log1p_sorted,
    )
    print(f"Saved reference_distribution.npz "
          f"({len(population_log1p_sorted)} population values, "
          f"{len(alternative_log1p_sorted)} alternative-count values)")

    methodology = {
        "methodology_version": METHODOLOGY_VERSION,
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "source_dataset": str(SOURCE_PARQUET.relative_to(PROJECT_ROOT)),
        "source_dataset_total_rows": total_rows,
        "reference_record_count": len(valid),
        "excluded_rows": excluded_rows,
        "score_definition": (
            "A relative, unitless proxy index representing the potential magnitude of "
            "consequence to the surrounding community if a water point is or becomes "
            "Non-Functional, based on population exposure and potential alternative-access "
            "context. NOT actual people affected, NOT confirmed beneficiaries, NOT a "
            "probability of failure or impact, NOT a causal or validated outcome measure."
        ),
        "components": {
            "population_exposure": {
                "input_feature": POPULATION_FEATURE,
                "transformation": "log1p",
                "normalization": "empirical percentile against the reference distribution below",
                "direction": "higher population -> higher potential impact",
                "weight": POPULATION_WEIGHT,
            },
            "alternative_scarcity": {
                "input_feature": ALTERNATIVE_FEATURE,
                "interpretation": "count of OTHER MAPPED water points within 1 km - "
                                   "NOT confirmed functioning, usable, or accessible alternatives",
                "transformation": "log1p",
                "normalization": "empirical percentile against the reference distribution below",
                "direction_correction": "alternative_scarcity = 1 - alternative_access_percentile "
                                         "(more mapped points -> lower potential impact)",
                "weight": SCARCITY_WEIGHT,
            },
        },
        "combination": (
            f"impact_score = {POPULATION_WEIGHT} * population_percentile "
            f"+ {SCARCITY_WEIGHT} * alternative_scarcity"
        ),
        "combination_rationale": (
            "Equal weighting: no expert-elicited or otherwise defensible evidence currently "
            "exists to justify weighting either component more than the other. This is the "
            "transparent, neutral default in the absence of such evidence, not an assumption "
            "that the two components are truly equally important."
        ),
        "percentile_convention": (
            "For a transformed value v against sorted reference array R of length N: "
            "percentile = (count(R < v) + count(R <= v)) / (2N) - the mean of the weak and "
            "strict empirical CDF, a standard, deterministic, tie-consistent convention "
            "(implemented with numpy.searchsorted, side='left' and side='right'). Always in "
            "[0,1] by construction: values below the reference minimum score 0, values above "
            "the reference maximum score 1. An explicit below/above-reference-range audit "
            "flag is set whenever this clipping actually occurs."
        ),
        "missing_data_policy": (
            "If either required input (worldpop2022_pop_within_1000m or "
            "n_water_points_within_1000m) is missing, impact_score is null "
            "(impact_score_available=False) with an explicit reason. No imputation. No "
            "reduced-dimension partial score."
        ),
        "contextual_only_not_in_score": [
            "rain_3m_z", "rain_12m_z", "dry_months_prior12_lt30mm",
            "dist_nearest_health_facility_m", "dist_nearest_school_m",
        ],
        "excluded_from_score": [
            "prediction probability", "model feature importance",
            "wpdx_dist_primary_road_m", "wpdx_dist_secondary_road_m", "wpdx_dist_tertiary_road_m",
            "wpdx_dist_city_m", "wpdx_dist_town_m", "wpdx_is_urban",
            "worldpop2022_pop_within_500m", "worldpop2022_pop_within_2000m",
            "worldpop2022_density_per_km2_1km", "dist_nearest_any_water_point_m",
            "n_water_points_within_500m", "n_water_points_within_5000m",
        ],
        "not_validated_against": "real-world impact outcomes - no such ground truth exists for this project.",
    }
    with open(OUTPUT_DIR / "methodology.json", "w") as f:
        json.dump(methodology, f, indent=2)
    print(f"Saved methodology.json to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
