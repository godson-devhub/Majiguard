"""Step 1 - fix preprocessing and package the existing Random Forest into a
single, loadable production pipeline.

What this script does (and nothing more):
    1. Rebuilds the exact 42-column training feature set the notebook used
       (majiguard_ml/data_prep.py), from the raw processed CSV.
    2. Re-fits ONLY the preprocessing step (ColumnTransformer) on the same
       train split the notebook used - with the lambda replaced by a named
       function so it can be pickled.
    3. Loads the EXISTING trained Random Forest
       (model_artifacts/majiguard_random_forest.joblib) - it is not
       retrained, and no modeling decision is changed.
    4. VERIFIES that preprocessor + existing model reproduce the notebook's
       exact test-set confusion matrix. If they don't match, the script
       stops and does NOT save anything - that would mean the
       reconstructed preprocessing doesn't match what the model was
       actually trained on.
    5. Assembles preprocessing + model into one sklearn Pipeline and saves
       it, together with config/schema/model-card files, under
       model_artifacts/v1_random_forest/.

Run from the project root:
    python scripts/09_build_production_pipeline.py
"""

import json
import platform
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from majiguard_ml.data_prep import (  # noqa: E402
    RAW_INPUT_COLUMNS,
    prepare_features_and_target,
)
from majiguard_ml.pipeline import (  # noqa: E402
    DEPLOYMENT_THRESHOLD,
    FUNCTIONAL_CLASS,
    NON_FUNCTIONAL_CLASS,
    build_full_pipeline,
    build_preprocessor,
)
from majiguard_ml.transformers import CyclicalMonthTransformer  # noqa: E402

DATA_CSV = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.csv"
EXISTING_MODEL_PATH = PROJECT_ROOT / "model_artifacts" / "majiguard_random_forest.joblib"
OUTPUT_DIR = PROJECT_ROOT / "model_artifacts" / "v1_random_forest"

# Ground truth from the training notebook's test-set evaluation
# (cells 252/254), used to verify the reconstructed preprocessing exactly
# reproduces what the saved Random Forest was trained on.
EXPECTED_TEST_CONFUSION_MATRIX = np.array([[1146, 374], [315, 1669]])
EXPECTED_TEST_ACCURACY = 0.803368
EXPECTED_PROCESSED_FEATURE_COUNT = 105


def main():
    report = {}

    print("Step 1/6: loading and cleaning the dataset ...")
    X_raw, y = prepare_features_and_target(DATA_CSV)
    report["raw_input_feature_count"] = X_raw.shape[1]
    report["total_rows"] = X_raw.shape[0]
    assert list(X_raw.columns) == RAW_INPUT_COLUMNS
    print(f"  X shape: {X_raw.shape}, y shape: {y.shape}")

    print("Step 2/6: recreating the notebook's train/test split "
          "(test_size=0.20, stratify=y, random_state=42) ...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_raw, y, test_size=0.20, stratify=y, random_state=42
    )
    print(f"  train: {X_train.shape}, test: {X_test.shape}")

    print("Step 3/6: applying cyclical-month encoding and fitting the "
          "FIXED preprocessor (lambda replaced by a named function) ...")
    cyclical = CyclicalMonthTransformer()
    X_train_encoded = cyclical.fit_transform(X_train)
    X_test_encoded = cyclical.transform(X_test)

    preprocessor = build_preprocessor()
    X_train_processed = preprocessor.fit_transform(X_train_encoded)
    X_test_processed = preprocessor.transform(X_test_encoded)
    report["processed_feature_count"] = X_train_processed.shape[1]
    print(f"  processed train shape: {X_train_processed.shape}, "
          f"processed test shape: {X_test_processed.shape}")

    assert X_train_processed.shape[1] == EXPECTED_PROCESSED_FEATURE_COUNT, (
        f"Expected {EXPECTED_PROCESSED_FEATURE_COUNT} processed features, "
        f"got {X_train_processed.shape[1]}"
    )

    print(f"Step 4/6: loading the EXISTING trained model from "
          f"{EXISTING_MODEL_PATH} (not retraining) ...")
    rf_model = joblib.load(EXISTING_MODEL_PATH)
    print(f"  loaded: {rf_model}")

    print("Step 5/6: verifying against the notebook's recorded test results ...")
    y_pred = rf_model.predict(X_test_processed)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    accuracy = accuracy_score(y_test, y_pred)
    print(f"  confusion matrix:\n{cm}")
    print(f"  accuracy: {accuracy:.6f}")

    if not np.array_equal(cm, EXPECTED_TEST_CONFUSION_MATRIX):
        raise SystemExit(
            "VERIFICATION FAILED: reconstructed preprocessing does not "
            f"reproduce the notebook's test confusion matrix.\n"
            f"Expected:\n{EXPECTED_TEST_CONFUSION_MATRIX}\nGot:\n{cm}\n"
            "Nothing was saved."
        )
    if abs(accuracy - EXPECTED_TEST_ACCURACY) > 1e-4:
        raise SystemExit(
            "VERIFICATION FAILED: accuracy does not match the notebook "
            f"(expected {EXPECTED_TEST_ACCURACY}, got {accuracy}). "
            "Nothing was saved."
        )
    print("  MATCH: reconstructed preprocessing reproduces the notebook's "
          "exact test-set results.")
    report["verification"] = {
        "confusion_matrix": cm.tolist(),
        "accuracy": round(float(accuracy), 6),
        "matches_notebook": True,
    }

    print("Step 6/6: assembling and saving the full pipeline ...")
    full_pipeline = build_full_pipeline(preprocessor, rf_model)

    # Sanity check: the assembled pipeline, fed RAW 42-column input, must
    # reproduce the exact same predictions as the manual steps above.
    y_pred_pipeline = full_pipeline.predict(X_test)
    assert np.array_equal(y_pred_pipeline, y_pred), (
        "Assembled pipeline predictions differ from the manual "
        "preprocessor+model predictions - not safe to save."
    )
    print("  Sanity check passed: pipeline.predict(raw_X) matches "
          "preprocessor+model predictions.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pipeline_path = OUTPUT_DIR / "majiguard_pipeline.joblib"
    joblib.dump(full_pipeline, pipeline_path)
    print(f"  saved pipeline to {pipeline_path}")
    report["pipeline_path"] = str(pipeline_path.relative_to(PROJECT_ROOT))

    versions = {
        "python": platform.python_version(),
        "scikit_learn": sklearn.__version__,
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "joblib": joblib.__version__,
    }
    report["environment"] = versions

    model_config = {
        "model_name": "Random Forest",
        "pipeline_version": "v1_random_forest",
        "target": "label_functional_status_id",
        "non_functional_class": NON_FUNCTIONAL_CLASS,
        "functional_class": FUNCTIONAL_CLASS,
        "probability_threshold": DEPLOYMENT_THRESHOLD,
        "raw_input_feature_count": len(RAW_INPUT_COLUMNS),
        "processed_feature_count": EXPECTED_PROCESSED_FEATURE_COUNT,
        "trained_with_scikit_learn": "1.6.1",
        "repackaged_with_scikit_learn": versions["scikit_learn"],
        "train_test_split": {
            "test_size": 0.20,
            "stratify": True,
            "random_state": 42,
        },
    }
    with open(OUTPUT_DIR / "model_config.json", "w") as f:
        json.dump(model_config, f, indent=2)
    print(f"  saved {OUTPUT_DIR / 'model_config.json'}")

    # Input schema: the 42 raw columns the pipeline expects, their dtype,
    # role in preprocessing, and (for categoricals) the categories seen
    # during training - useful later for validating new input in FastAPI.
    role_by_column = {}
    for col in preprocessor.transformers[0][2]:
        role_by_column[col] = "numeric"
    for col in preprocessor.transformers[1][2]:
        role_by_column[col] = "categorical"
    for col in preprocessor.transformers[2][2]:
        role_by_column[col] = "boolean"
    role_by_column["survey_month"] = "numeric (cyclically encoded inside the pipeline)"

    input_schema = {"columns": []}
    for col in RAW_INPUT_COLUMNS:
        entry = {
            "name": col,
            "dtype": str(X_raw[col].dtype),
            "role": role_by_column.get(col, "numeric"),
        }
        if role_by_column.get(col) == "categorical":
            entry["observed_categories"] = sorted(
                X_raw[col].dropna().unique().tolist()
            )
        input_schema["columns"].append(entry)
    with open(OUTPUT_DIR / "input_schema.json", "w") as f:
        json.dump(input_schema, f, indent=2)
    print(f"  saved {OUTPUT_DIR / 'input_schema.json'}")

    model_card = {
        "model": "Random Forest (scikit-learn RandomForestClassifier, "
                 "n_estimators=200, random_state=42)",
        "task": "Binary classification of recorded water-point functional "
                "status (a 'status classification proxy', not a validated "
                "future-failure probability - see project data-quality "
                "reports).",
        "target": {
            "column": "label_functional_status_id",
            "0": "Non-Functional",
            "1": "Functional",
        },
        "deployment_threshold": {
            "value": DEPLOYMENT_THRESHOLD,
            "meaning": "A water point is classified Non-Functional when "
                       "P(Non-Functional) >= 0.40 (not the sklearn default "
                       "of 0.50), chosen to favor recall - i.e. to reduce "
                       "missed Non-Functional points - since false "
                       "negatives are operationally costly for this "
                       "project.",
        },
        "training_metrics_random_split": {
            "accuracy": 0.803368,
            "non_functional_precision": 0.738728,
            "non_functional_recall": 0.840789,
            "non_functional_f1": 0.786462,
            "roc_auc": 0.887813,
            "pr_auc": 0.862997,
            "note": "At threshold 0.40, on a random 80/20 stratified "
                    "held-out test set (test_size=0.20, random_state=42).",
        },
        "spatial_validation_metrics": {
            "precision_mean": 0.585602, "precision_std": 0.085070,
            "recall_mean": 0.594840, "recall_std": 0.099109,
            "f1_mean": 0.580668, "f1_std": 0.034011,
            "pr_auc_mean": 0.624464, "pr_auc_std": 0.073494,
            "roc_auc_mean": 0.683508, "roc_auc_std": 0.083650,
            "note": "5-fold GroupKFold, grouped by nbs_region (23 regions, "
                    "'Unknown' region excluded). Notably lower than the "
                    "random-split metrics above.",
        },
        "known_limitations": [
            "Trained on 2004-2009 survey statuses; not validated as a "
            "predictor of *future* failure.",
            "Target (label_functional_status_id) comes from the raw "
            "status_id field, not the label-quality-controlled "
            "'agreement subset' recommended in data/reports/target_definition.md.",
            "Performance drops substantially on geographically held-out "
            "regions (see spatial_validation_metrics) - part of this may "
            "be the model leaning on nbs_region/lat-long as a proxy for "
            "region/data-source labeling bias rather than pure geography; "
            "not yet confirmed with a leave-one-source-out test.",
            "This pipeline expects the 42 columns in input_schema.json "
            "already derived (including calculated_age); turning a brand "
            "new water-point record into these 42 columns is a separate, "
            "not-yet-built data-preparation step.",
        ],
        "environment_used_to_build_this_pipeline": versions,
        "provenance": {
            "source_notebook": "notebooks/MajiGuard_Data_Science_ML.ipynb",
            "underlying_random_forest": "model_artifacts/majiguard_random_forest.joblib (not retrained)",
            "verification": "Reconstructed preprocessing was verified to "
                             "reproduce the notebook's exact test-set "
                             "confusion matrix before saving (see "
                             "model_config.json / build script output).",
        },
    }
    with open(OUTPUT_DIR / "model_card.json", "w") as f:
        json.dump(model_card, f, indent=2)
    print(f"  saved {OUTPUT_DIR / 'model_card.json'}")

    report["files_created"] = [
        str(p.relative_to(PROJECT_ROOT))
        for p in sorted(OUTPUT_DIR.iterdir())
    ]
    report["environment"] = versions

    print("\n=== BUILD REPORT ===")
    print(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    main()
