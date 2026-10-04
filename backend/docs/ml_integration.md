# Step 8.8 — ML Engine Integration

Step 8.8 adds a backend adapter and service orchestration around the frozen `majiguard_ml` modules. It does not modify, retrain, recalibrate, or redesign the MajiGuard methodology.

## Reused frozen modules

- `majiguard_ml.predict`: loads the existing serialized pipeline and performs prediction.
- `majiguard_ml.impact_score`: computes the approved `impact_v1` result using its fixed reference distribution.
- `majiguard_ml.consequence_priority`: packages the existing prediction and impact outputs as `consequence_priority_v1`.
- `majiguard_ml.data_prep`: supplies the exact 42-column feature contract and existing cleaning/feature-selection functions.

The adapter maps database column names back to the frozen source names where Step 8.6 schema normalization changed names (for example, `observed_status` to `status_clean` and lowercase `_leaky` fields to their original source names). It does not duplicate formulas or feature logic.

## Model loading

`app/ml/engine.py` exposes `get_prediction_pipeline()`, an in-process `lru_cache(maxsize=1)` loader. The approximately 68 MB pipeline is loaded on the first prediction request and reused thereafter. No model is loaded during backend startup.

## Prediction integration

`build_prediction_input()` retrieves the complete stored feature snapshot for an existing water point, reconstructs the frozen source-field aliases, then calls the existing `clean_dataset()` and `select_model_features()` functions. `predict_water_point()` calls `majiguard_ml.predict.predict_record()` with the cached pipeline. The existing 0.40 threshold and probability outputs are preserved.

This integration supports existing imported records only. It does not claim to produce a complete prediction from arbitrary GPS-only input. The unresolved road/city/town and WPDx urban-feature limitation remains unchanged.

## Impact integration

`compute_impact()` calls `majiguard_ml.impact_score.compute_impact_score()` with the stored `worldpop2022_pop_within_1000m` and `n_water_points_within_1000m` fields. It does not reimplement the impact formula, load a second reference distribution, add climate, create bands, or impute missing inputs.

## Consequence integration

`build_consequence()` calls `majiguard_ml.consequence_priority.build_consequence_priority_signal()` with the already-produced prediction and impact dictionaries. The adapter does not compute Risk × Impact independently. The `consequence_priority_v1` version and relative-ranking interpretation are preserved.

## Persistence and transactions

`prediction_orm()`, `impact_orm()`, and `consequence_orm()` convert existing module outputs into approved ORM objects. Repository `add()` methods only add and flush; the caller owns commit/rollback. `MLService.compute()` is available for future application orchestration and adds all three results in one session transaction, but no bulk computation is run in Step 8.8.

The current result schema supports history but has no unique per-water-point/methodology constraint. Step 8.8 therefore does not silently overwrite or delete history; callers should establish an explicit run/idempotency policy before repeated production computations.

## Missing-data and errors

The adapter exposes distinct `ModelInputUnavailable`, `ImpactUnavailable`, and `ConsequenceUnavailable` errors. Missing impact inputs are preserved according to the frozen implementation as unavailable with a NULL score and reason. HTTP translation is intentionally left to Step 8.9.

## Testing and scope

Integration tests use real imported records, including one real non-functional and one real functional record. They verify the 42-feature input contract, the 0.40 prediction threshold, `impact_v1`, and `consequence_priority_v1`. Tests do not permanently insert result rows and no automatic 17,518-row computation occurs.

Step 8.8 intentionally does not implement API endpoints, authentication, frontend work, Layer 2/3 operations, scheduling, routing, retraining, recalibration, or new features.
