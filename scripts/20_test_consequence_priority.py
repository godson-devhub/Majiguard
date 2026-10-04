"""Step 7, Layer 1 - tests for majiguard_ml/consequence_priority.py.

Run as its own fresh process (no notebook or other script's variables):

    python scripts/20_test_consequence_priority.py

Covers Cases A-J from the Step 7 implementation spec, plus a regression
check against previously-recorded Step 4/Step 5.4 values.
"""

import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from majiguard_ml.consequence_priority import (  # noqa: E402
    CONSEQUENCE_PRIORITY_FIELDS,
    CONSEQUENCE_PRIORITY_METHODOLOGY_VERSION,
    build_consequence_priority_signal,
    build_consequence_priority_signal_batch,
)
from majiguard_ml.data_prep import clean_dataset, select_model_features  # noqa: E402
from majiguard_ml.impact_score import compute_impact_score  # noqa: E402
from majiguard_ml.predict import load_pipeline, predict_record  # noqa: E402

DATA_PARQUET = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.parquet"
FAILURES = []


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}")
    if not condition:
        FAILURES.append(label)
    return condition


def mock_prediction(probability_non_functional):
    p_nf = probability_non_functional
    return {
        "probability_non_functional": p_nf,
        "probability_functional": 1 - p_nf,
        "predicted_status": "Non-Functional" if p_nf >= 0.40 else "Functional",
        "decision_threshold": 0.40,
        "risk_band": "mock",
    }


def mock_impact(impact_score, available=True):
    if not available:
        return {"impact_score": None, "impact_score_available": False,
                 "methodology_version": "impact_v1"}
    return {
        "impact_score": impact_score,
        "impact_score_available": True,
        "methodology_version": "impact_v1",
        "population_component": impact_score / 2,
        "alternative_scarcity_component": impact_score / 2,
    }


def test_A_high_risk_high_impact():
    print("\n" + "=" * 90)
    print("CASE A: High Risk + High Impact")
    print("=" * 90)
    result = build_consequence_priority_signal(mock_prediction(0.90), mock_impact(0.90), "WP-A")
    print(f"  {result}")
    check("both available", result["risk_available"] and result["impact_available"])
    check("risk_impact_index available", result["risk_impact_index_available"] is True)
    check("index == 0.9*0.9", abs(result["risk_impact_index"] - 0.81) < 1e-9)
    return result


def test_B_high_risk_low_impact():
    print("\n" + "=" * 90)
    print("CASE B: High Risk + Low Impact")
    print("=" * 90)
    result = build_consequence_priority_signal(mock_prediction(0.90), mock_impact(0.10), "WP-B")
    print(f"  {result}")
    check("Risk remains visible", result["probability_non_functional"] == 0.90)
    check("Impact remains visible", result["impact_score"] == 0.10)
    check("index == 0.9*0.1", abs(result["risk_impact_index"] - 0.09) < 1e-9)
    return result


def test_C_low_risk_high_impact():
    print("\n" + "=" * 90)
    print("CASE C: Low Risk + High Impact")
    print("=" * 90)
    result = build_consequence_priority_signal(mock_prediction(0.10), mock_impact(0.90), "WP-C")
    print(f"  {result}")
    check("Impact remains visible", result["impact_score"] == 0.90)
    check("Risk remains visible", result["probability_non_functional"] == 0.10)
    check("index does not hide either component (both still present in output)",
          result["probability_non_functional"] is not None and result["impact_score"] is not None)
    return result


def test_D_low_risk_low_impact():
    print("\n" + "=" * 90)
    print("CASE D: Low Risk + Low Impact")
    print("=" * 90)
    result = build_consequence_priority_signal(mock_prediction(0.10), mock_impact(0.10), "WP-D")
    print(f"  {result}")
    check("normal operation, index == 0.1*0.1", abs(result["risk_impact_index"] - 0.01) < 1e-9)
    return result


def test_ABCD_relative_ordering(a, b, c, d):
    print("\n" + "=" * 90)
    print("CASE A-D cross-check: relative ordering of the optional index")
    print("=" * 90)
    check("High+High index is highest of the four",
          a["risk_impact_index"] > b["risk_impact_index"]
          and a["risk_impact_index"] > c["risk_impact_index"]
          and a["risk_impact_index"] > d["risk_impact_index"])
    check("Low+Low index is lowest of the four",
          d["risk_impact_index"] < a["risk_impact_index"]
          and d["risk_impact_index"] < b["risk_impact_index"]
          and d["risk_impact_index"] < c["risk_impact_index"])


def test_E_risk_unavailable():
    print("\n" + "=" * 90)
    print("CASE E: Risk unavailable + Impact available")
    print("=" * 90)
    result = build_consequence_priority_signal(None, mock_impact(0.7), "WP-E")
    print(f"  {result}")
    check("impact preserved", result["impact_score"] == 0.7)
    check("risk not available", result["risk_available"] is False)
    check("combined index unavailable", result["risk_impact_index_available"] is False)
    check("index value is None", result["risk_impact_index"] is None)
    check("reason mentions probability_non_functional",
          "probability_non_functional" in result["consequence_priority_unavailable_reason"])


def test_F_impact_unavailable():
    print("\n" + "=" * 90)
    print("CASE F: Risk available + Impact unavailable")
    print("=" * 90)
    result = build_consequence_priority_signal(mock_prediction(0.6), mock_impact(None, available=False), "WP-F")
    print(f"  {result}")
    check("risk preserved", result["probability_non_functional"] == 0.6)
    check("impact not available", result["impact_available"] is False)
    check("combined index unavailable", result["risk_impact_index_available"] is False)
    check("reason mentions impact_score", "impact_score" in result["consequence_priority_unavailable_reason"])


def test_G_both_unavailable():
    print("\n" + "=" * 90)
    print("CASE G: Both unavailable")
    print("=" * 90)
    result = build_consequence_priority_signal(None, None, "WP-G")
    print(f"  {result}")
    check("no combined signal", result["risk_impact_index_available"] is False and result["risk_impact_index"] is None)
    check("explicit reason lists both",
          "probability_non_functional" in result["consequence_priority_unavailable_reason"]
          and "impact_score" in result["consequence_priority_unavailable_reason"])


def test_H_boundary_values():
    print("\n" + "=" * 90)
    print("CASE H: boundary values (risk=0, risk=1, impact=0, impact=1)")
    print("=" * 90)
    r00 = build_consequence_priority_signal(mock_prediction(0.0), mock_impact(0.0), "WP-H00")
    r11 = build_consequence_priority_signal(mock_prediction(1.0), mock_impact(1.0), "WP-H11")
    r10 = build_consequence_priority_signal(mock_prediction(1.0), mock_impact(0.0), "WP-H10")
    r01 = build_consequence_priority_signal(mock_prediction(0.0), mock_impact(1.0), "WP-H01")
    print(f"  risk=0,impact=0 -> index={r00['risk_impact_index']}")
    print(f"  risk=1,impact=1 -> index={r11['risk_impact_index']}")
    print(f"  risk=1,impact=0 -> index={r10['risk_impact_index']}")
    print(f"  risk=0,impact=1 -> index={r01['risk_impact_index']}")
    check("risk=0,impact=0 -> index==0.0", r00["risk_impact_index"] == 0.0)
    check("risk=1,impact=1 -> index==1.0", r11["risk_impact_index"] == 1.0)
    check("risk=1,impact=0 -> index==0.0 (multiplicative: either-zero suppresses)", r10["risk_impact_index"] == 0.0)
    check("risk=0,impact=1 -> index==0.0 (multiplicative: either-zero suppresses)", r01["risk_impact_index"] == 0.0)


def test_I_fresh_process_real_pipeline():
    print("\n" + "=" * 90)
    print("CASE I: fresh-process integration with the REAL Step 4 + Step 5.4 pipelines")
    print("=" * 90)
    df = pd.read_parquet(DATA_PARQUET)
    row = df.iloc[0]
    print(f"  water point: {row['wpdx_id']}")

    pipeline = load_pipeline()
    X = select_model_features(clean_dataset(df.iloc[[0]]))
    # Same dtype fix used in scripts/17_test_prediction_layer.py: these two
    # columns come out of the parquet as strings, but the pipeline expects
    # real booleans.
    X["inside_tz_adm0"] = X["inside_tz_adm0"].astype(bool)
    X["wpdx_is_urban"] = X["wpdx_is_urban"].astype(str).map({"True": True, "False": False})
    prediction_result = predict_record(X, pipeline=pipeline)
    impact_result = compute_impact_score(
        row["worldpop2022_pop_within_1000m"], row["n_water_points_within_1000m"]
    )
    result = build_consequence_priority_signal(prediction_result, impact_result, row["wpdx_id"])
    print(f"  probability_non_functional={result['probability_non_functional']:.6f}, "
          f"impact_score={result['impact_score']:.6f}, "
          f"risk_impact_index={result['risk_impact_index']:.6f}")
    check("real pipeline -> both available", result["risk_available"] and result["impact_available"])
    check("real pipeline -> index matches manual product",
          abs(result["risk_impact_index"]
              - result["probability_non_functional"] * result["impact_score"]) < 1e-9)
    check("methodology version stamped", result["consequence_priority_methodology_version"]
          == CONSEQUENCE_PRIORITY_METHODOLOGY_VERSION)
    check("prediction methodology version stamped", result["prediction_methodology_version"] == "v1_random_forest")
    check("impact methodology version stamped", result["impact_methodology_version"] == "impact_v1")
    return prediction_result, impact_result


def test_J_regression(prediction_result, impact_result):
    print("\n" + "=" * 90)
    print("CASE J: regression - Step 4 and Step 5.4 outputs unchanged by this module's existence")
    print("=" * 90)
    # This exact impact_score value was independently recorded in the Step 5.4
    # test transcript for this same real water point (wpdx_id 6G9GGG6M+C34).
    check("Step 5.4 impact_score reproduces the previously-recorded value exactly",
          abs(impact_result["impact_score"] - 0.4000599383491266) < 1e-9)
    check("Step 4 prediction_result still has the exact original output schema",
          set(prediction_result.keys()) >= {
              "prediction", "predicted_status", "probability_non_functional",
              "probability_functional", "decision_threshold", "threshold", "risk_band"
          })
    check("Step 4 probabilities still sum to 1.0",
          abs(prediction_result["probability_non_functional"]
              + prediction_result["probability_functional"] - 1.0) < 1e-9)

    # Determinism check: calling predict_record/compute_impact_score again
    # (as consequence_priority.py itself never touches their internals)
    # must give bit-identical results.
    df = pd.read_parquet(DATA_PARQUET)
    row = df.iloc[0]
    impact_again = compute_impact_score(
        row["worldpop2022_pop_within_1000m"], row["n_water_points_within_1000m"]
    )
    check("Step 5.4 impact_score deterministic across repeated calls",
          impact_again["impact_score"] == impact_result["impact_score"])


def test_field_contract_no_leakage():
    print("\n" + "=" * 90)
    print("Output-schema and no-leakage sanity checks")
    print("=" * 90)
    result = build_consequence_priority_signal(mock_prediction(0.5), mock_impact(0.5), "WP-schema")
    check("output contains every documented field", set(result.keys()) == set(CONSEQUENCE_PRIORITY_FIELDS))
    check("no Maintenance Priority / priority band language leaked into field names",
          not any("priority_band" in f or "maintenance_priority" in f for f in CONSEQUENCE_PRIORITY_FIELDS))
    import ast
    import majiguard_ml.consequence_priority as cp_module
    tree = ast.parse(Path(cp_module.__file__).read_text(encoding="utf-8"))
    imported_names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported_names.update(n.name for n in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported_names.add(node.module)
    print(f"  actual import statements found: {sorted(imported_names)}")
    # A proper AST-based check (not a text/substring search, which would
    # false-positive on this module's own explanatory comments about NOT
    # using sklearn/training code).
    check("module's actual import statements contain no sklearn or training code",
          not any("sklearn" in name or "pipeline" in name for name in imported_names))


def main():
    a = test_A_high_risk_high_impact()
    b = test_B_high_risk_low_impact()
    c = test_C_low_risk_high_impact()
    d = test_D_low_risk_low_impact()
    test_ABCD_relative_ordering(a, b, c, d)
    test_E_risk_unavailable()
    test_F_impact_unavailable()
    test_G_both_unavailable()
    test_H_boundary_values()
    prediction_result, impact_result = test_I_fresh_process_real_pipeline()
    test_J_regression(prediction_result, impact_result)
    test_field_contract_no_leakage()

    print("\n" + "=" * 90)
    if not FAILURES:
        print("STEP 7 LAYER 1 (CONSEQUENCE-PRIORITY SIGNAL) TEST: PASSED")
    else:
        print(f"STEP 7 LAYER 1 TEST: FAILED ({len(FAILURES)} check(s) failed)")
        for f in FAILURES:
            print(f"  - {f}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
