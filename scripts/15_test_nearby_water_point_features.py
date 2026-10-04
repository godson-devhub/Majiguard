"""Step 3.5 - test of majiguard_ml/nearby_points_features.py.

Run as its own fresh process (no notebook or other script's variables):

    python scripts/15_test_nearby_water_point_features.py

TEST 1: one real water point vs. the stored dataset value.
TEST 2: >=10 real water points from different regions.
TEST 3 (MANDATORY): self-point behaviour - an existing WPDx point queried
        with its own coordinates must NOT find distance 0 / an inflated
        count, because the training dataset excludes the point itself.
TEST 4: invalid input handling (lat/lon, missing/empty/malformed
        reference dataset).
TEST 5: this whole script running as an independent process IS the
        fresh-process test; also prints the exact source metadata.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

import majiguard_ml.nearby_points_features as npf  # noqa: E402
from majiguard_ml.nearby_points_features import (  # noqa: E402
    NEARBY_FEATURE_NAMES,
    WPDX_REFERENCE_PATH,
    get_nearby_water_point_features,
    get_nearby_water_point_features_batch,
)

DATA_CSV = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.csv"
COUNT_TOLERANCE = 0  # counts must match EXACTLY
DISTANCE_TOLERANCE_M = 0.05  # tight - EPSG:32736 distance math should match almost exactly


def compare_point(row):
    computed = get_nearby_water_point_features(row["latitude"], row["longitude"])
    results = []
    for name in NEARBY_FEATURE_NAMES:
        dataset_value = row[name]
        computed_value = computed[name]
        if name.startswith("n_water_points_within_"):
            diff = abs(int(dataset_value) - int(computed_value))
            passed = diff <= COUNT_TOLERANCE
        else:
            diff = abs(float(dataset_value) - float(computed_value))
            passed = diff <= DISTANCE_TOLERANCE_M
        results.append((name, dataset_value, computed_value, diff, passed))
    return results


def test_1_real_water_point():
    print("=" * 90)
    print("TEST 1: real water point vs. the stored dataset value")
    print("=" * 90)
    df = pd.read_csv(DATA_CSV)
    row = df.iloc[0]
    print(f"Water point: {row['wpdx_id']}  lat={row['latitude']}, lon={row['longitude']}")

    results = compare_point(row)
    print(f"\n{'feature':<34}{'dataset value':>16}{'computed value':>16}{'abs diff':>12}  result")
    all_pass = True
    for name, dataset_value, computed_value, diff, passed in results:
        all_pass &= passed
        print(f"{name:<34}{dataset_value:>16}{computed_value:>16}{diff:>12}  {'PASS' if passed else 'FAIL'}")
    return all_pass


def test_2_multiple_points():
    print("\n" + "=" * 90)
    print("TEST 2: multiple real water points from different regions")
    print("=" * 90)
    df = pd.read_csv(DATA_CSV)
    sample = (
        df.sample(frac=1, random_state=5)
        .drop_duplicates(subset="nbs_region")
        .head(12)
    )
    print(f"Points selected: {len(sample)} (from {sample['nbs_region'].nunique()} distinct regions)")

    n_comparisons = n_exact = n_tolerance = n_mismatch = 0
    max_diff = 0.0
    mismatches = []

    for _, row in sample.iterrows():
        for name, dataset_value, computed_value, diff, passed in compare_point(row):
            n_comparisons += 1
            max_diff = max(max_diff, diff)
            if diff == 0:
                n_exact += 1
            elif passed:
                n_tolerance += 1
            else:
                n_mismatch += 1
                mismatches.append((row["wpdx_id"], row["nbs_region"], name, dataset_value, computed_value, diff))

    print(f"\npoints tested:           {len(sample)}")
    print(f"feature comparisons:     {n_comparisons}")
    print(f"exact matches:           {n_exact}")
    print(f"tolerance-level matches: {n_tolerance}")
    print(f"mismatches:              {n_mismatch}")
    print(f"maximum numeric diff:    {max_diff}")

    if mismatches:
        print("\nMISMATCH DETAILS:")
        for wpdx_id, region, name, dataset_value, computed_value, diff in mismatches:
            print(f"  {wpdx_id} ({region}) {name}: dataset={dataset_value}, computed={computed_value}, diff={diff}")
    return n_mismatch == 0


def test_3_self_point_behaviour():
    print("\n" + "=" * 90)
    print("TEST 3 (MANDATORY): self-point behaviour")
    print("=" * 90)
    df = pd.read_csv(DATA_CSV)
    row = df[df["n_water_points_within_1000m"] > 0].iloc[3]  # a point with real neighbours nearby
    print(f"Water point: {row['wpdx_id']}  lat={row['latitude']}, lon={row['longitude']}")
    print(f"This point genuinely IS one of the {len(pd.read_parquet(WPDX_REFERENCE_PATH))} "
          f"reference points in {WPDX_REFERENCE_PATH.name}.")

    # What this module actually returns (should self-exclude, matching the dataset):
    corrected = get_nearby_water_point_features(row["latitude"], row["longitude"])

    # What a NAIVE implementation (no self-exclusion at all) would return,
    # computed independently here just for this demonstration - NOT part
    # of the module's public behaviour.
    reference = pd.read_parquet(WPDX_REFERENCE_PATH)[["lat", "lon"]].dropna()
    tree = npf._build_kdtree(reference)
    x, y = npf._point_to_utm_xy(row["latitude"], row["longitude"])
    naive_nearest = float(tree.query([x, y], k=1)[0])
    naive_counts = {r: len(tree.query_ball_point([x, y], r)) for r in npf.RADII_M}

    print(f"\n{'feature':<34}{'dataset':>12}{'this module':>14}{'naive (no self-excl.)':>24}")
    print(f"{'dist_nearest_any_water_point_m':<34}{row['dist_nearest_any_water_point_m']:>12.4f}"
          f"{corrected['dist_nearest_any_water_point_m']:>14.4f}{naive_nearest:>24.4f}")
    for r in npf.RADII_M:
        name = f"n_water_points_within_{r}m"
        print(f"{name:<34}{row[name]:>12}{corrected[name]:>14}{naive_counts[r]:>24}")

    matches_dataset = (
        abs(row["dist_nearest_any_water_point_m"] - corrected["dist_nearest_any_water_point_m"]) <= DISTANCE_TOLERANCE_M
        and all(row[f"n_water_points_within_{r}m"] == corrected[f"n_water_points_within_{r}m"] for r in npf.RADII_M)
    )
    naive_is_wrong = (
        naive_nearest == 0.0
        and all(naive_counts[r] == row[f"n_water_points_within_{r}m"] + 1 for r in npf.RADII_M)
    )

    print(f"\nThis module's output matches the training dataset:          {matches_dataset}")
    print(f"A naive (no self-exclusion) approach would have been wrong:  {naive_is_wrong}")
    print("  (distance 0.0 because it finds itself, and every count exactly")
    print("   1 too high, because it counts itself)")
    print("\nCONCLUSION: the original methodology EXCLUDES the query point itself when it is")
    print("already a reference point, and this module correctly reproduces that exclusion.")

    return matches_dataset and naive_is_wrong


def test_4_invalid_inputs():
    print("\n" + "=" * 90)
    print("TEST 4: invalid input handling")
    print("=" * 90)

    cases = [
        ("invalid latitude (95)", lambda: get_nearby_water_point_features(95, 35.0)),
        ("invalid longitude (-200)", lambda: get_nearby_water_point_features(-5.0, -200)),
        ("missing latitude (None)", lambda: get_nearby_water_point_features(None, 35.0)),
        ("missing longitude (None)", lambda: get_nearby_water_point_features(-5.0, None)),
    ]
    all_raised = True
    for label, call in cases:
        try:
            call()
            print(f"  FAILED (no error raised): {label}")
            all_raised = False
        except ValueError as e:
            print(f"  OK - {label}:\n      {e}")

    original_path = npf.WPDX_REFERENCE_PATH

    print("\n  Missing reference file:")
    npf.WPDX_REFERENCE_PATH = Path("does/not/exist.parquet")
    try:
        npf.get_nearby_water_point_features(-5.0, 35.0)
        print("  FAILED (no error raised)")
        all_raised = False
    except ValueError as e:
        print(f"  OK:\n      {e}")

    print("\n  Empty reference dataset:")
    empty_path = PROJECT_ROOT / "data" / "interim" / "_test_empty_reference.parquet"
    pd.DataFrame({"lat": [], "lon": []}).to_parquet(empty_path)
    npf.WPDX_REFERENCE_PATH = empty_path
    try:
        npf.get_nearby_water_point_features(-5.0, 35.0)
        print("  FAILED (no error raised)")
        all_raised = False
    except ValueError as e:
        print(f"  OK:\n      {e}")
    finally:
        empty_path.unlink(missing_ok=True)

    print("\n  Reference dataset missing required coordinate columns:")
    bad_columns_path = PROJECT_ROOT / "data" / "interim" / "_test_bad_columns_reference.parquet"
    pd.DataFrame({"latitude": [-5.0], "longitude": [35.0]}).to_parquet(bad_columns_path)
    npf.WPDX_REFERENCE_PATH = bad_columns_path
    try:
        npf.get_nearby_water_point_features(-5.0, 35.0)
        print("  FAILED (no error raised)")
        all_raised = False
    except ValueError as e:
        print(f"  OK:\n      {e}")
    finally:
        bad_columns_path.unlink(missing_ok=True)
        npf.WPDX_REFERENCE_PATH = original_path

    return all_raised


def test_5_source_metadata_and_performance():
    print("\n" + "=" * 90)
    print("TEST 5: source metadata + performance notes")
    print("=" * 90)
    reference = pd.read_parquet(WPDX_REFERENCE_PATH)
    print(f"Reference file: {WPDX_REFERENCE_PATH.relative_to(PROJECT_ROOT)}")
    print(f"  format: Parquet | rows: {len(reference)} | coordinate columns: lat, lon")
    print(f"  coordinate filtering: none beyond dropna() - all {len(reference)} rows used, "
          f"matching scripts/02_audit_waterpoints.py exactly")
    print(f"  CRS: source EPSG:4326 -> reprojected to EPSG:32736 for distance math")
    print(f"  nearest-neighbour / radius-count engine: scipy.spatial.cKDTree "
          f"(tree.query for nearest, tree.query_ball_point for radius counts)")
    print(f"  self-point handling: query point excluded from its own neighbour count "
          f"whenever it coincides exactly with a reference point (see Test 3)")
    print("\nPerformance: get_nearby_water_point_features() reloads the reference parquet "
          "AND rebuilds the KD-tree on every call (simple, correct, matches this project's "
          "existing per-call pattern for climate/population/accessibility features). "
          "get_nearby_water_point_features_batch() loads/builds once and reuses it for every "
          "point in the batch. A future optimization (not implemented here, per instructions) "
          "would be to cache the tree across repeated single-point calls, e.g. in a future "
          "FastAPI service.")


def main():
    ok_1 = test_1_real_water_point()
    ok_2 = test_2_multiple_points()
    ok_3 = test_3_self_point_behaviour()
    ok_4 = test_4_invalid_inputs()
    test_5_source_metadata_and_performance()

    print("\n" + "=" * 90)
    if ok_1 and ok_2 and ok_3 and ok_4:
        print("STEP 3.5 NEARBY WATER POINT FEATURE TEST: PASSED")
    else:
        print("STEP 3.5 NEARBY WATER POINT FEATURE TEST: FAILED - see details above")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
