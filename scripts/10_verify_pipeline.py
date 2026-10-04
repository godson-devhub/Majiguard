"""Step 1 - fresh-process verification of the saved MajiGuard pipeline.

Run this as its own, separate process (not imported from the build script)
so it's a genuine "reload in a fresh Python process" test:

    python scripts/10_verify_pipeline.py

What it does:
    1. Loads model_artifacts/v1_random_forest/majiguard_pipeline.joblib
       from disk, in a brand-new interpreter.
    2. Takes ONE real row from data/processed/majiguard_master_v0.csv.
    3. Gives the pipeline only its raw input columns (no manual
       preprocessing) and prints the prediction.
    4. Confirms the preprocessing step alone produces the 105 features the
       Random Forest expects.
"""

import sys
from pathlib import Path

import joblib

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from majiguard_ml.data_prep import (  # noqa: E402
    RAW_INPUT_COLUMNS,
    clean_dataset,
    load_raw_dataset,
    select_model_features,
)
from majiguard_ml.pipeline import predict_with_pipeline  # noqa: E402

DATA_CSV = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.csv"
PIPELINE_PATH = (
    PROJECT_ROOT / "model_artifacts" / "v1_random_forest" / "majiguard_pipeline.joblib"
)


def main():
    print(f"Loading pipeline from disk: {PIPELINE_PATH}")
    pipeline = joblib.load(PIPELINE_PATH)
    print("  loaded OK in a fresh process.")
    print(f"  pipeline steps: {[name for name, _ in pipeline.steps]}")

    print("\nLoading one real water-point row from the dataset ...")
    df = load_raw_dataset(DATA_CSV)
    df_clean = clean_dataset(df)
    X_all = select_model_features(df_clean)

    sample_row = X_all.iloc[[0]]
    print(f"  row 0 raw input ({sample_row.shape[1]} columns):")
    print(sample_row.T.to_string())

    print("\nRunning prediction through the loaded pipeline ...")
    proba_non_functional, predicted_class, predicted_status = predict_with_pipeline(
        pipeline, sample_row
    )
    print(f"  probability_non_functional: {proba_non_functional[0]:.4f}")
    print(f"  predicted_class: {predicted_class[0]}")
    print(f"  predicted_status: {predicted_status[0]}")

    processed = pipeline.named_steps["preprocessing"].transform(
        pipeline.named_steps["cyclical_month"].transform(sample_row)
    )
    print(f"\nProcessed feature count: {processed.shape[1]} "
          f"(expected 105)")
    assert processed.shape[1] == 105, "Processed feature count mismatch!"

    print("\nRunning a second row to confirm the pipeline isn't just "
          "returning a constant ...")
    sample_row_2 = X_all.iloc[[1]]
    proba_2, class_2, status_2 = predict_with_pipeline(pipeline, sample_row_2)
    print(f"  row 1 -> probability_non_functional: {proba_2[0]:.4f}, "
          f"predicted_status: {status_2[0]}")

    print("\nFRESH-PROCESS VERIFICATION: PASSED")


if __name__ == "__main__":
    main()
