"""Step 4 prediction-layer tests, run as a fresh Python process."""
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from majiguard_ml.data_prep import RAW_INPUT_COLUMNS, clean_dataset, select_model_features
from majiguard_ml.pipeline import DEPLOYMENT_THRESHOLD
from majiguard_ml.predict import predict_batch, predict_record, load_pipeline

DATA = ROOT / "data" / "processed" / "majiguard_master_v0.parquet"

def main():
    df = pd.read_parquet(DATA)
    X = select_model_features(clean_dataset(df))
    labels = pd.to_numeric(df["label_functional_status_id"], errors="coerce")
    usable = X.loc[labels.notna()].copy()
    chosen = pd.concat([usable[labels.loc[usable.index] == 0].head(10),
                        usable[labels.loc[usable.index] == 1].head(10)]).reset_index(drop=True)
    chosen["inside_tz_adm0"] = chosen["inside_tz_adm0"].astype(bool)
    chosen["wpdx_is_urban"] = chosen["wpdx_is_urban"].astype(str).map({"True": True, "False": False})
    pipeline = load_pipeline()
    out = predict_batch(chosen, pipeline=pipeline)
    required = {"prediction", "predicted_status", "probability_non_functional",
                "probability_functional", "decision_threshold", "threshold", "risk_band"}
    assert required.issubset(out.columns)
    assert np.allclose(out.probability_non_functional + out.probability_functional, 1.0)
    assert out.probability_non_functional.between(0, 1).all()
    assert out.probability_functional.between(0, 1).all()
    assert not out[["probability_non_functional", "probability_functional"]].isna().any().any()
    expected = np.where(out.probability_non_functional >= DEPLOYMENT_THRESHOLD, 0, 1)
    assert np.array_equal(out.prediction.to_numpy(), expected)
    assert (out.decision_threshold == 0.40).all()

    one = predict_record(chosen.iloc[0].to_dict(), pipeline=pipeline)
    assert required.issubset(one)
    missing = chosen.drop(columns=[RAW_INPUT_COLUMNS[-1]])
    try: predict_batch(missing, pipeline=pipeline); raise AssertionError("missing input accepted")
    except ValueError as exc: assert "Missing required" in str(exc)
    try: predict_record([1, 2], pipeline=pipeline); raise AssertionError("malformed input accepted")
    except TypeError: pass
    try: predict_batch(chosen, threshold=1.1, pipeline=pipeline); raise AssertionError("bad threshold accepted")
    except ValueError: pass
    try: predict_batch(chosen.iloc[0:0], pipeline=pipeline); raise AssertionError("empty batch accepted")
    except ValueError: pass

    # Direct comparison with the existing validated pipeline helper.
    from majiguard_ml.pipeline import predict_with_pipeline
    p_nf, classes, statuses = predict_with_pipeline(pipeline, chosen.iloc[[0]])
    assert np.isclose(one["probability_non_functional"], p_nf[0])
    assert one["prediction"] == int(classes[0]) and one["predicted_status"] == statuses[0]
    print("PASS: fresh model load; 20 real records (10 per known class); output/probability/threshold checks; error checks; direct pipeline comparison.")
    print(f"EXAMPLE: prediction={one['prediction']}, status={one['predicted_status']}, "
          f"p_non_functional={one['probability_non_functional']:.6f}, "
          f"p_functional={one['probability_functional']:.6f}, "
          f"threshold={one['decision_threshold']:.2f}, risk_band={one['risk_band']}")

if __name__ == "__main__": main()




