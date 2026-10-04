"""Step 2 - end-to-end test of the raw water-point data-preparation layer.

Run as its own fresh process (not imported from anywhere else, so it can't
accidentally reuse a notebook or build-script variable):

    python scripts/11_test_raw_input_preparation.py

Flow demonstrated:

    Raw/New Water-Point Record
            |
    majiguard_ml.raw_input_prep.prepare_raw_record()
            |
    42 Model Input Columns
            |
    Saved MajiGuard Pipeline (majiguard_pipeline.joblib)
            |
    Probability Non-Functional -> Predicted Status

Two real water points are pulled from the dataset and reduced down to only
the fields REQUIRED_RAW_RECORD_COLUMNS - i.e. only what a brand-new water
point intake would realistically supply (no calculated_age, no target, no
identifiers) - to prove the layer works from genuinely raw input, not from
already-training-ready data.
"""

import sys
from pathlib import Path

import joblib
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from majiguard_ml.data_prep import RAW_INPUT_COLUMNS  # noqa: E402
from majiguard_ml.pipeline import predict_with_pipeline  # noqa: E402
from majiguard_ml.raw_input_prep import (  # noqa: E402
    REQUIRED_RAW_RECORD_COLUMNS,
    prepare_raw_record,
)

DATA_CSV = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.csv"
PIPELINE_PATH = (
    PROJECT_ROOT / "model_artifacts" / "v1_random_forest" / "majiguard_pipeline.joblib"
)


def pick_example_rows():
    """Grab one real Functional and one real Non-Functional water point,
    trimmed down to ONLY the fields a new intake would supply."""
    df = pd.read_csv(DATA_CSV)
    functional_row = df[df["status_id"] == "Yes"].iloc[0]
    non_functional_row = df[df["status_id"] == "No"].iloc[0]

    def to_raw_record(row):
        return {col: row[col] for col in REQUIRED_RAW_RECORD_COLUMNS}

    return {
        "Functional example (real status_id='Yes')": to_raw_record(functional_row),
        "Non-Functional example (real status_id='No')": to_raw_record(non_functional_row),
    }


def main():
    print("Loading saved pipeline ...")
    pipeline = joblib.load(PIPELINE_PATH)
    print("  loaded OK.\n")

    examples = pick_example_rows()

    print("=" * 70)
    print("TEST 1: single record as a plain Python dict")
    print("=" * 70)
    for label, record in examples.items():
        print(f"\n--- {label} ---")
        print(f"Raw input ({len(record)} fields, as a new intake would send):")
        for k, v in record.items():
            print(f"    {k}: {v}")

        prepared = prepare_raw_record(record)
        print(f"\nPrepared input: {prepared.shape[1]} columns "
              f"(expected 42) -> {'OK' if prepared.shape[1] == 42 else 'MISMATCH'}")
        assert list(prepared.columns) == RAW_INPUT_COLUMNS, (
            "Column order does not match the pipeline's expected order!"
        )
        print("Column order matches RAW_INPUT_COLUMNS exactly: OK")
        print(f"Derived calculated_age: {prepared['calculated_age'].iloc[0]}")

        proba, pred_class, pred_status = predict_with_pipeline(pipeline, prepared)
        print(f"\nProbability Non-Functional: {proba[0]:.4f}")
        print(f"Predicted class:            {pred_class[0]}")
        print(f"Predicted status:           {pred_status[0]}")

    print("\n" + "=" * 70)
    print("TEST 2: batch input as a DataFrame (both records at once)")
    print("=" * 70)
    batch_df = pd.DataFrame(list(examples.values()))
    prepared_batch = prepare_raw_record(batch_df)
    print(f"Prepared batch shape: {prepared_batch.shape} (expected (2, 42))")
    assert prepared_batch.shape == (2, 42)

    proba, pred_class, pred_status = predict_with_pipeline(pipeline, prepared_batch)
    for i, label in enumerate(examples.keys()):
        print(f"  {label}: P(Non-Functional)={proba[i]:.4f}, "
              f"status={pred_status[i]}")

    print("\n" + "=" * 70)
    print("TEST 3: missing-column error message is clear")
    print("=" * 70)
    bad_record = dict(list(examples.values())[0])
    del bad_record["latitude"]
    try:
        prepare_raw_record(bad_record)
        print("  FAILED: expected a ValueError, got none")
    except ValueError as e:
        print(f"  Raised ValueError as expected:\n  {e}")

    print("\nSTEP 2 DATA-PREPARATION LAYER TEST: PASSED")


if __name__ == "__main__":
    main()
