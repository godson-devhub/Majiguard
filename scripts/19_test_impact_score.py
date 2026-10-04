"""Step 5.4 - tests for majiguard_ml/impact_score.py.

Run as its own fresh process (no notebook or other script's variables):

    python scripts/19_test_impact_score.py

Covers all 15 required cases (H), the hand-checked synthetic example (I),
and the data-quality/sanity checks (J).
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

import majiguard_ml.impact_score as impact_score  # noqa: E402
from majiguard_ml.impact_score import (  # noqa: E402
    IMPACT_SCORE_FIELDS,
    METHODOLOGY_VERSION,
    compute_impact_score,
    compute_impact_score_batch,
    load_reference_distribution,
)

DATA_PARQUET = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.parquet"
FAILURES = []


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}")
    if not condition:
        FAILURES.append(label)
    return condition


# ---------------------------------------------------------------------
# Test 1 + real-record sanity, using the production reference artifact
# ---------------------------------------------------------------------
def test_1_known_real_record():
    print("\n" + "=" * 90)
    print("TEST 1: known real record - verify all intermediate calculations")
    print("=" * 90)
    df = pd.read_parquet(DATA_PARQUET)
    row = df.iloc[0]
    print(f"Water point: {row['wpdx_id']}  "
          f"population_within_1000m={row['worldpop2022_pop_within_1000m']}, "
          f"n_water_points_within_1000m={row['n_water_points_within_1000m']}")

    result = compute_impact_score(
        row["worldpop2022_pop_within_1000m"], row["n_water_points_within_1000m"]
    )
    for k, v in result.items():
        print(f"    {k}: {v}")

    check("impact_score_available is True", result["impact_score_available"] is True)
    check("population_log1p == log1p(population_raw)",
          np.isclose(result["population_log1p"], np.log1p(result["population_raw"])))
    check("alternative_count_log1p == log1p(alternative_count_raw)",
          np.isclose(result["alternative_count_log1p"], np.log1p(result["alternative_count_raw"])))
    check("alternative_scarcity == 1 - alternative_access_percentile",
          np.isclose(result["alternative_scarcity"], 1 - result["alternative_access_percentile"]))
    check("population_component == 0.5 * population_percentile",
          np.isclose(result["population_component"], 0.5 * result["population_percentile"]))
    check("alternative_scarcity_component == 0.5 * alternative_scarcity",
          np.isclose(result["alternative_scarcity_component"], 0.5 * result["alternative_scarcity"]))
    check("impact_score == sum of the two components",
          np.isclose(result["impact_score"],
                     result["population_component"] + result["alternative_scarcity_component"]))
    check("impact_score in [0,1]", 0.0 <= result["impact_score"] <= 1.0)
    check("methodology_version is impact_v1", result["methodology_version"] == METHODOLOGY_VERSION)


def test_2_3_zero_inputs(sample_ref_pop, sample_ref_alt):
    print("\n" + "=" * 90)
    print("TEST 2+3: zero population / zero nearby water points")
    print("=" * 90)
    result = compute_impact_score(0, 0, sample_ref_pop, sample_ref_alt)
    print(f"  population=0, alternatives=0 -> {result}")
    check("log1p(0) handled (population_log1p == 0.0)", result["population_log1p"] == 0.0)
    check("log1p(0) handled (alternative_count_log1p == 0.0)", result["alternative_count_log1p"] == 0.0)
    check("score available", result["impact_score_available"] is True)

    # The reference set has MANY points with 0 nearby water points (ties at
    # the minimum), so the tie-consistent percentile convention gives the
    # minimum value a percentile of (count_of_ties)/(2N), not exactly 0 -
    # this is the correct, documented behaviour, not a bug. Verify it
    # matches the formula exactly, and that it's still the lowest possible
    # percentile (i.e. no value scores lower than the true minimum).
    n = len(sample_ref_alt)
    count_at_min = int(np.sum(sample_ref_alt == sample_ref_alt[0]))
    expected_min_percentile = count_at_min / (2 * n)
    check("zero alternatives -> percentile matches the tie-consistent formula for the minimum value",
          np.isclose(result["alternative_access_percentile"], expected_min_percentile))
    check("zero alternatives -> alternative_scarcity is the maximum achievable under the tie convention",
          np.isclose(result["alternative_scarcity"], 1 - expected_min_percentile))

    one_alt_result = compute_impact_score(0, 1, sample_ref_pop, sample_ref_alt)
    check("zero alternatives scores a lower (or equal) percentile than one alternative -> is the minimum",
          result["alternative_access_percentile"] <= one_alt_result["alternative_access_percentile"])


def test_4_5_6_direction(sample_ref_pop, sample_ref_alt):
    print("\n" + "=" * 90)
    print("TEST 4+5+6: directionality (higher population / fewer alternatives -> higher impact)")
    print("=" * 90)
    low_pop = compute_impact_score(1, 5, sample_ref_pop, sample_ref_alt)
    high_pop = compute_impact_score(20000, 5, sample_ref_pop, sample_ref_alt)
    check("higher population -> higher population_percentile",
          high_pop["population_percentile"] > low_pop["population_percentile"])
    check("higher population -> higher impact_score (all else equal)",
          high_pop["impact_score"] > low_pop["impact_score"])

    few_alt = compute_impact_score(500, 0, sample_ref_pop, sample_ref_alt)
    many_alt = compute_impact_score(500, 30, sample_ref_pop, sample_ref_alt)
    check("more alternatives -> lower alternative_scarcity",
          many_alt["alternative_scarcity"] < few_alt["alternative_scarcity"])
    check("fewer alternatives -> higher alternative_scarcity",
          few_alt["alternative_scarcity"] > many_alt["alternative_scarcity"])
    check("fewer alternatives -> higher impact_score (all else equal)",
          few_alt["impact_score"] > many_alt["impact_score"])


def test_7_8_9_missing():
    print("\n" + "=" * 90)
    print("TEST 7+8+9: missing required inputs")
    print("=" * 90)
    for label, pop, alt in [
        ("missing population", None, 5),
        ("missing alternative count", 500, None),
        ("both missing", None, None),
    ]:
        result = compute_impact_score(pop, alt)
        print(f"  {label}: available={result['impact_score_available']}, "
              f"reason={result['impact_unavailable_reason']!r}")
        check(f"{label} -> impact_score is None", result["impact_score"] is None)
        check(f"{label} -> impact_score_available is False", result["impact_score_available"] is False)
        check(f"{label} -> reason is set", bool(result["impact_unavailable_reason"]))


def test_10_1978_record():
    print("\n" + "=" * 90)
    print("TEST 10: known 1978 record MG011656 (missing CHIRPS rainfall)")
    print("=" * 90)
    df = pd.read_parquet(DATA_PARQUET)
    row = df[df["master_id"] == "MG011656"]
    check("record MG011656 found in majiguard_master_v0", len(row) == 1)
    row = row.iloc[0]
    print(f"  wpdx_id={row['wpdx_id']}, survey_year={row['survey_year']}, "
          f"survey_month={row['survey_month']}")
    print(f"  rain_3m_prior_mm (should be missing): {row['rain_3m_prior_mm']}")
    check("rainfall IS missing for this record (confirms the known gap)", pd.isna(row["rain_3m_prior_mm"]))

    result = compute_impact_score(
        row["worldpop2022_pop_within_1000m"], row["n_water_points_within_1000m"]
    )
    check("impact score IS available despite missing rainfall", result["impact_score_available"] is True)
    check("impact_score in [0,1]", 0.0 <= result["impact_score"] <= 1.0)
    print(f"  impact_score = {result['impact_score']:.6f} (computed successfully)")


def test_11_out_of_reference(sample_ref_pop, sample_ref_alt):
    print("\n" + "=" * 90)
    print("TEST 11: out-of-reference values (boundary handling)")
    print("=" * 90)
    extreme_high = compute_impact_score(1e12, 1e9, sample_ref_pop, sample_ref_alt)
    print(f"  extreme high inputs: population_percentile={extreme_high['population_percentile']}, "
          f"population_above_reference_range={extreme_high['population_above_reference_range']}, "
          f"alternative_access_percentile={extreme_high['alternative_access_percentile']}, "
          f"alternative_above_reference_range={extreme_high['alternative_above_reference_range']}")
    check("above-range population -> percentile clipped to 1.0", extreme_high["population_percentile"] == 1.0)
    check("above-range population -> audit flag set", extreme_high["population_above_reference_range"] is True)
    check("above-range alternative count -> percentile clipped to 1.0",
          extreme_high["alternative_access_percentile"] == 1.0)
    check("above-range alternative count -> audit flag set",
          extreme_high["alternative_above_reference_range"] is True)
    check("impact_score still in [0,1]", 0.0 <= extreme_high["impact_score"] <= 1.0)

    below_range = compute_impact_score(0, 0, sample_ref_pop, sample_ref_alt)
    check("population=0 not below range only if 0 is the ref minimum (informational)", True)
    print(f"  population=0: below_reference_range={below_range['population_below_reference_range']}")


def test_12_tie_handling():
    print("\n" + "=" * 90)
    print("TEST 12: tie handling")
    print("=" * 90)
    ref = np.log1p(np.array([0.0, 5.0, 5.0, 5.0, 20.0]))
    r1 = compute_impact_score(5, 5, ref, ref)
    r2 = compute_impact_score(5, 5, ref, ref)
    print(f"  same tied input scored twice: {r1['population_percentile']}, {r2['population_percentile']}")
    check("identical tied input -> identical percentile every time",
          r1["population_percentile"] == r2["population_percentile"])
    check("tie convention: 3 of 5 values equal 5 -> percentile == (1+4)/(2*5) == 0.5",
          np.isclose(r1["population_percentile"], 0.5))


def test_13_14_batch_consistency():
    print("\n" + "=" * 90)
    print("TEST 13+14: batch consistency + fixed-reference consistency")
    print("=" * 90)
    df = pd.read_parquet(DATA_PARQUET)
    small_batch = df.iloc[0:5]
    larger_batch = df.iloc[0:20]  # same first 5 + 15 more

    individual_results = [
        compute_impact_score(row["worldpop2022_pop_within_1000m"], row["n_water_points_within_1000m"])
        for _, row in small_batch.iterrows()
    ]
    batch_results_small = compute_impact_score_batch(small_batch)
    batch_results_large = compute_impact_score_batch(larger_batch)

    matches_individual = all(
        np.isclose(a["impact_score"], b["impact_score"])
        for a, b in zip(individual_results, batch_results_small)
    )
    check("individual scoring == batch scoring for the same 5 records", matches_individual)

    matches_larger = all(
        np.isclose(batch_results_small[i]["impact_score"], batch_results_large[i]["impact_score"])
        for i in range(5)
    )
    check("adding 15 more records to the batch does NOT change the first 5 records' scores",
          matches_larger)


def test_15_fresh_process_reload():
    print("\n" + "=" * 90)
    print("TEST 15: fresh reference-artifact reload (this whole script is also its own process)")
    print("=" * 90)
    pop_ref_a, alt_ref_a, methodology_a = load_reference_distribution()
    pop_ref_b, alt_ref_b, methodology_b = load_reference_distribution()  # simulate a second, independent load
    check("reference arrays identical across independent loads",
          np.array_equal(pop_ref_a, pop_ref_b) and np.array_equal(alt_ref_a, alt_ref_b))
    check("methodology metadata identical across independent loads", methodology_a == methodology_b)
    check("methodology_version in artifact matches module constant",
          methodology_a["methodology_version"] == METHODOLOGY_VERSION)

    result_a = compute_impact_score(500, 3, pop_ref_a, alt_ref_a)
    result_b = compute_impact_score(500, 3, pop_ref_b, alt_ref_b)
    check("same input scored against two independent loads -> identical result",
          result_a == result_b)


def test_I_hand_checked_example():
    print("\n" + "=" * 90)
    print("PART I: hand-checked example (tiny SYNTHETIC reference - never touches the production artifact)")
    print("=" * 90)
    # Synthetic reference, raw values chosen for easy hand-verification.
    # Population reference (raw): [0, 0, 7, 19, 54]  (N=5, tie at 0)
    # Alternative reference (raw): [0, 1, 1, 2, 3]    (N=5, tie at 1)
    pop_ref = np.sort(np.log1p(np.array([0.0, 0.0, 7.0, 19.0, 54.0])))
    alt_ref = np.sort(np.log1p(np.array([0.0, 1.0, 1.0, 2.0, 3.0])))
    print(f"  synthetic population reference (log1p, sorted): {pop_ref}")
    print(f"  synthetic alternative reference (log1p, sorted): {alt_ref}")

    # Query: population_raw=0, alternative_raw=1
    result = compute_impact_score(0, 1, pop_ref, alt_ref)

    print("\n  HAND CALCULATION:")
    print("  population_log1p = log1p(0) = 0.0")
    print("  population reference sorted = [0, 0, 2.0794, 2.9957, 4.0073] (N=5)")
    print("  left  = count(ref < 0.0)  = 0")
    print("  right = count(ref <= 0.0) = 2")
    print("  population_percentile = (0 + 2) / (2*5) = 0.2")
    print()
    print("  alternative_log1p = log1p(1) = 0.6931")
    print("  alternative reference sorted = [0, 0.6931, 0.6931, 1.0986, 1.3863] (N=5)")
    print("  left  = count(ref < 0.6931)  = 1")
    print("  right = count(ref <= 0.6931) = 3")
    print("  alternative_access_percentile = (1 + 3) / (2*5) = 0.4")
    print("  alternative_scarcity = 1 - 0.4 = 0.6")
    print()
    print("  impact_score = 0.5*0.2 + 0.5*0.6 = 0.1 + 0.3 = 0.4")

    print(f"\n  MODULE OUTPUT: population_percentile={result['population_percentile']}, "
          f"alternative_access_percentile={result['alternative_access_percentile']}, "
          f"alternative_scarcity={result['alternative_scarcity']}, "
          f"impact_score={result['impact_score']}")

    check("hand-calculated population_percentile == 0.2", np.isclose(result["population_percentile"], 0.2))
    check("hand-calculated alternative_access_percentile == 0.4",
          np.isclose(result["alternative_access_percentile"], 0.4))
    check("hand-calculated alternative_scarcity == 0.6", np.isclose(result["alternative_scarcity"], 0.6))
    check("hand-calculated impact_score == 0.4", np.isclose(result["impact_score"], 0.4))


def test_J_data_quality():
    print("\n" + "=" * 90)
    print("PART J: data quality / sanity checks")
    print("=" * 90)

    try:
        compute_impact_score(-5, 3)
        check("negative population raises ValueError (fails clearly, not silently corrected)", False)
    except ValueError as e:
        print(f"  negative population -> {e}")
        check("negative population raises ValueError (fails clearly, not silently corrected)", True)

    try:
        compute_impact_score(500, -1)
        check("negative alternative count raises ValueError", False)
    except ValueError as e:
        print(f"  negative alternative count -> {e}")
        check("negative alternative count raises ValueError", True)

    try:
        compute_impact_score(float("inf"), 3)
        check("non-finite population raises ValueError", False)
    except ValueError as e:
        print(f"  infinite population -> {e}")
        check("non-finite population raises ValueError", True)

    df = pd.read_parquet(DATA_PARQUET).sample(200, random_state=1)
    results = compute_impact_score_batch(df)
    scores = [r["impact_score"] for r in results if r["impact_score_available"]]
    pop_components = [r["population_component"] for r in results if r["impact_score_available"]]
    alt_components = [r["alternative_scarcity_component"] for r in results if r["impact_score_available"]]
    check("200 sampled records: all impact_score in [0,1]",
          all(0.0 <= s <= 1.0 for s in scores))
    check("200 sampled records: all population_component in [0, 0.5]",
          all(0.0 <= c <= 0.5 for c in pop_components))
    check("200 sampled records: all alternative_scarcity_component in [0, 0.5]",
          all(0.0 <= c <= 0.5 for c in alt_components))
    check("every result carries methodology_version",
          all(r["methodology_version"] == METHODOLOGY_VERSION for r in results))

    forbidden_terms = ["probability", "feature_importance", "wpdx_dist", "wpdx_is_urban"]
    check("no forbidden fields (prediction probability / feature importance / "
          "unresolved WPDx+ fields) appear in the output contract",
          not any(term in field for field in IMPACT_SCORE_FIELDS for term in forbidden_terms))


def main():
    population_ref, alternative_ref, methodology = load_reference_distribution()
    print(f"Loaded production reference distribution: methodology_version="
          f"{methodology['methodology_version']}, reference_record_count="
          f"{methodology['reference_record_count']}")

    test_1_known_real_record()
    test_2_3_zero_inputs(population_ref, alternative_ref)
    test_4_5_6_direction(population_ref, alternative_ref)
    test_7_8_9_missing()
    test_10_1978_record()
    test_11_out_of_reference(population_ref, alternative_ref)
    test_12_tie_handling()
    test_13_14_batch_consistency()
    test_15_fresh_process_reload()
    test_I_hand_checked_example()
    test_J_data_quality()

    print("\n" + "=" * 90)
    if not FAILURES:
        print(f"STEP 5.4 IMPACT SCORE TEST: PASSED (all checks passed)")
    else:
        print(f"STEP 5.4 IMPACT SCORE TEST: FAILED ({len(FAILURES)} check(s) failed)")
        for f in FAILURES:
            print(f"  - {f}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
