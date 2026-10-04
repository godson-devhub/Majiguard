# MajiGuard AI — Prediction Pipeline (v1, Random Forest)

## What this is
A single, loadable file (`majiguard_pipeline.joblib`) that takes a raw
water-point's features and returns its predicted functional status. It
combines the notebook's fitted preprocessing (imputing, scaling, one-hot
encoding) and the trained Random Forest into one `sklearn.pipeline.Pipeline`,
so no manual preprocessing step is needed before calling it.

## Model
Random Forest (`RandomForestClassifier`, `n_estimators=200`,
`random_state=42`), trained in `notebooks/MajiGuard_Data_Science_ML.ipynb`.
This package does **not** retrain it — it reuses the existing trained model
from `model_artifacts/majiguard_random_forest.joblib` and only fixes how
the preprocessing is packaged around it.

## Input
A pandas DataFrame with the 42 columns listed in `input_schema.json`
(e.g. `latitude`, `water_source`, `dist_nearest_health_facility_m`,
`calculated_age`, ...). These are the model's cleaned, feature-selected
inputs — not yet numerically encoded (the pipeline does that itself).
Turning a brand-new water-point record into these 42 columns (deriving
`calculated_age`, filling missing categories, etc.) is a separate step,
not yet built — see `majiguard_ml/data_prep.py` for the exact logic used
on the training data.

## Output — what class 0 / 1 mean
- `label_functional_status_id = 0` → **Non-Functional**
- `label_functional_status_id = 1` → **Functional**

## Threshold
**0.40** — a water point is classified Non-Functional when
`P(Non-Functional) >= 0.40` (not the default 0.50). This favors recall
(catching more true Non-Functional points) at the cost of more false
alarms, chosen in the notebook's threshold analysis because missed
Non-Functional points are operationally more costly. See
`model_card.json` for the full trade-off numbers.

## Where the pipeline lives
`model_artifacts/v1_random_forest/majiguard_pipeline.joblib`

## How to load and use it

```python
import sys
from pathlib import Path
import joblib

# the majiguard_ml package must be importable (it defines the pipeline's
# custom preprocessing steps) - add the project root to the path first.
sys.path.insert(0, str(Path("path/to/MajiGuardppt")))

from majiguard_ml.pipeline import predict_with_pipeline

pipeline = joblib.load("model_artifacts/v1_random_forest/majiguard_pipeline.joblib")

# raw_df: a DataFrame with the 42 columns from input_schema.json
proba_non_functional, predicted_class, predicted_status = predict_with_pipeline(
    pipeline, raw_df
)
```

Or call the pipeline directly:

```python
pipeline.predict(raw_df)          # 0/1 array, sklearn's default 0.50 cutoff
pipeline.predict_proba(raw_df)    # [:, 0] = P(Non-Functional)
```

Use `predict_with_pipeline` (not `pipeline.predict`) when you want the
project's actual 0.40 decision threshold applied.

## Files in this folder
- `majiguard_pipeline.joblib` — the pipeline (preprocessing + model).
- `model_config.json` — machine-readable config (target, classes, threshold, versions).
- `input_schema.json` — the 42 expected input columns, dtypes, and (for categoricals) the values seen during training.
- `model_card.json` — model summary, metrics, and known limitations.
- `README.md` — this file.

## Rebuilding this pipeline
Run from the project root:
```
python scripts/09_build_production_pipeline.py   # rebuilds + verifies + saves
python scripts/10_verify_pipeline.py              # fresh-process load + predict test
```
The build script refuses to save anything unless the rebuilt preprocessing
reproduces the notebook's exact recorded test-set results.
