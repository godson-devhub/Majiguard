"""Step 3.3 - test of majiguard_ml/population_features.py.

Run as its own fresh process (no notebook or other script's variables):

    python scripts/13_test_population_features.py

TEST 1: run get_population_features() on a real water point.
TEST 2: compare that one point's result against majiguard_master_v0.
TEST 3: same comparison across >=10 real water points from different
        regions.
TEST 4: invalid latitude/longitude and a missing raster file all raise
        clear errors.
TEST 5: this whole script running as an independent process IS the
        fresh-process test.
"""

import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from majiguard_ml.population_features import (  # noqa: E402
    POPULATION_FEATURE_NAMES,
    WORLDPOP_PATH,
    get_population_features,
    get_population_features_batch,
)

DATA_CSV = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.csv"

# pop_within_* are raw sums of many float32 pixel values (order-of-summation
# can differ slightly between the windowed read here and the original
# script's full-grid read) -> a tiny absolute tolerance. density is derived
# from pop_within_1000m with a fixed constant, so the same tolerance carries
# through arithmetically.
TOLERANCE = 0.05


def compare_point(label, row):
    computed = get_population_features(row["latitude"], row["longitude"])
    results = []
    for name in POPULATION_FEATURE_NAMES:
        dataset_value = float(row[name])
        computed_value = float(computed[name])
        diff = abs(dataset_value - computed_value)
        passed = diff <= TOLERANCE
        results.append((name, dataset_value, computed_value, diff, passed))
    return results


def test_1_and_2_real_water_point():
    print("=" * 78)
    print("TEST 1 + 2: real water point vs. the stored dataset value")
    print("=" * 78)

    df = pd.read_csv(DATA_CSV)
    row = df[df["worldpop2022_pop_within_500m"].notna()].iloc[0]
    print(f"Water point: {row['wpdx_id']}  lat={row['latitude']}, lon={row['longitude']}")

    print(f"\n{'feature':<38}{'dataset value':>16}{'computed value':>16}"
          f"{'abs diff':>12}  result")
    results = compare_point("single point", row)
    all_pass = True
    for name, dataset_value, computed_value, diff, passed in results:
        all_pass &= passed
        print(f"{name:<38}{dataset_value:>16.4f}{computed_value:>16.4f}"
              f"{diff:>12.5f}  {'PASS' if passed else 'FAIL'}")
    return all_pass


def test_3_multiple_points():
    print("\n" + "=" * 78)
    print("TEST 3: multiple real water points from different regions")
    print("=" * 78)

    df = pd.read_csv(DATA_CSV)
    available = df[df["worldpop2022_pop_within_500m"].notna()]
    # one point per region, up to 12 regions, for real geographic spread
    sample = (
        available.sample(frac=1, random_state=42)  # shuffle first
        .drop_duplicates(subset="nbs_region")        # then first-per-region = random-per-region
        .head(12)
    )
    print(f"Points selected: {len(sample)} (from {sample['nbs_region'].nunique()} distinct regions)")

    n_comparisons = 0
    n_exact = 0
    n_tolerance = 0
    n_mismatch = 0
    max_diff = 0.0
    mismatches = []

    for _, row in sample.iterrows():
        for name, dataset_value, computed_value, diff, passed in compare_point(row["wpdx_id"], row):
            n_comparisons += 1
            max_diff = max(max_diff, diff)
            if diff == 0.0:
                n_exact += 1
            elif passed:
                n_tolerance += 1
            else:
                n_mismatch += 1
                mismatches.append((row["wpdx_id"], row["nbs_region"], name, dataset_value, computed_value, diff))

    print(f"\npoints tested:          {len(sample)}")
    print(f"feature comparisons:    {n_comparisons}")
    print(f"exact matches:          {n_exact}")
    print(f"tolerance-level matches:{n_tolerance}")
    print(f"mismatches:             {n_mismatch}")
    print(f"maximum absolute diff:  {max_diff:.6f}")

    if mismatches:
        print("\nMISMATCH DETAILS:")
        for wpdx_id, region, name, dataset_value, computed_value, diff in mismatches:
            print(f"  {wpdx_id} ({region}) {name}: dataset={dataset_value}, "
                  f"computed={computed_value}, diff={diff}")
    return n_mismatch == 0


def test_4_validation():
    print("\n" + "=" * 78)
    print("TEST 4: input validation")
    print("=" * 78)

    cases = [
        ("invalid latitude (95)", lambda: get_population_features(95, 35.0)),
        ("invalid longitude (-200)", lambda: get_population_features(-5.0, -200)),
        ("missing latitude (None)", lambda: get_population_features(None, 35.0)),
        ("missing longitude (None)", lambda: get_population_features(-5.0, None)),
        ("point far outside Tanzania (0, 0)", lambda: get_population_features(0.0, 0.0)),
    ]

    all_raised = True
    for label, call in cases:
        try:
            call()
            print(f"  FAILED (no error raised): {label}")
            all_raised = False
        except ValueError as e:
            print(f"  OK - {label}:\n      {e}")

    print("\n  Missing-raster-file check (simulated by pointing at a fake path):")
    import majiguard_ml.population_features as pop_mod
    original_path = pop_mod.WORLDPOP_PATH
    pop_mod.WORLDPOP_PATH = Path("does/not/exist.tif")
    try:
        pop_mod.get_population_features(-5.0, 35.0)
        print("  FAILED (no error raised) for a missing raster file")
        all_raised = False
    except ValueError as e:
        print(f"  OK - missing raster file:\n      {e}")
    finally:
        pop_mod.WORLDPOP_PATH = original_path

    return all_raised


def test_batch_helper():
    print("\n" + "=" * 78)
    print("Bonus check: get_population_features_batch() opens WorldPop once")
    print("=" * 78)
    df = pd.read_csv(DATA_CSV)
    sample = df[df["worldpop2022_pop_within_500m"].notna()].head(3)
    records = sample[["latitude", "longitude"]].to_dict("records")
    results = get_population_features_batch(records)
    assert len(results) == len(records)
    for r in results:
        assert set(r.keys()) == set(POPULATION_FEATURE_NAMES)
    print(f"  OK - {len(records)} points -> {len(results)} complete feature dicts")


def main():
    print(f"WorldPop raster: {WORLDPOP_PATH}")
    ok_12 = test_1_and_2_real_water_point()
    ok_3 = test_3_multiple_points()
    ok_4 = test_4_validation()
    test_batch_helper()

    print("\n" + "=" * 78)
    if ok_12 and ok_3 and ok_4:
        print("STEP 3.3 POPULATION FEATURE TEST: PASSED")
    else:
        print("STEP 3.3 POPULATION FEATURE TEST: FAILED - see details above")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
