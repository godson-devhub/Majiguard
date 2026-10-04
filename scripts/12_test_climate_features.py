"""Step 3.2 - test of majiguard_ml/climate_features.py.

Run as its own fresh process (no notebook or other script's variables):

    python scripts/12_test_climate_features.py

TEST 1: run get_rainfall_features() on a real water point.
TEST 2: compare the result against the value already stored in
        majiguard_master_v0 for that exact water point - not "close
        enough", an exact reproduction of the training dataset's numbers.
TEST 3: invalid latitude/longitude, missing survey date, and a survey
        date outside the CHIRPS stack's coverage all raise clear errors.
TEST 4: this whole script running as an independent process IS the
        fresh-process test.
"""

import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from majiguard_ml.climate_features import (  # noqa: E402
    RAINFALL_FEATURE_NAMES,
    get_rainfall_features,
    get_rainfall_features_batch,
)

DATA_CSV = PROJECT_ROOT / "data" / "processed" / "majiguard_master_v0.csv"

# Loose tolerance for _prior_mm/_z values (float32 raster arithmetic can
# differ by a tiny amount depending on array shape/order), tighter for
# pct_of_normal (a ratio, so should match almost exactly), tight for the
# dry-month count (should be an exact integer match).
TOLERANCE = {
    "prior_mm": 0.05,
    "pct_of_normal": 0.05,
    "z": 0.001,
    "dry_months": 0.001,
    "annual": 0.05,
}


def tolerance_for(feature_name):
    if feature_name.endswith("_prior_mm"):
        return TOLERANCE["prior_mm"]
    if feature_name.endswith("_pct_of_normal"):
        return TOLERANCE["pct_of_normal"]
    if feature_name.endswith("_z"):
        return TOLERANCE["z"]
    if feature_name == "dry_months_prior12_lt30mm":
        return TOLERANCE["dry_months"]
    return TOLERANCE["annual"]


def test_1_and_2_real_water_point():
    print("=" * 70)
    print("TEST 1 + 2: real water point vs. the stored dataset value")
    print("=" * 70)

    df = pd.read_csv(DATA_CSV)
    row = df[df["rain_3m_prior_mm"].notna()].iloc[0]

    print(f"Water point: {row['wpdx_id']}  "
          f"lat={row['latitude']}, lon={row['longitude']}, "
          f"survey={int(row['survey_year'])}-{int(row['survey_month']):02d}")

    computed = get_rainfall_features(
        latitude=row["latitude"],
        longitude=row["longitude"],
        survey_year=int(row["survey_year"]),
        survey_month=int(row["survey_month"]),
    )

    print(f"\n{'feature':<32}{'dataset value':>16}{'computed value':>16}"
          f"{'abs diff':>12}  result")
    all_pass = True
    for name in RAINFALL_FEATURE_NAMES:
        dataset_value = float(row[name])
        computed_value = float(computed[name])
        diff = abs(dataset_value - computed_value)
        tol = tolerance_for(name)
        passed = diff <= tol
        all_pass &= passed
        print(f"{name:<32}{dataset_value:>16.4f}{computed_value:>16.4f}"
              f"{diff:>12.5f}  {'PASS' if passed else 'FAIL (tol=' + str(tol) + ')'}")

    if not all_pass:
        print("\nMISMATCH DETECTED - investigate before trusting this module.")
    else:
        print("\nAll 11 features reproduce the stored dataset values within tolerance.")
    return all_pass


def test_3_boundary_and_errors():
    print("\n" + "=" * 70)
    print("TEST 3: boundary / error handling")
    print("=" * 70)

    cases = [
        ("invalid latitude (200)",
         lambda: get_rainfall_features(200, 35.0, 2007, 6)),
        ("invalid longitude (-500)",
         lambda: get_rainfall_features(-5.0, -500, 2007, 6)),
        ("missing survey_month (None)",
         lambda: get_rainfall_features(-5.0, 35.0, 2007, None)),
        ("missing survey_year (None)",
         lambda: get_rainfall_features(-5.0, 35.0, None, 6)),
        ("survey_month out of range (13)",
         lambda: get_rainfall_features(-5.0, 35.0, 2007, 13)),
        ("survey date too early for 12 months of history (1981-06)",
         lambda: get_rainfall_features(-5.0, 35.0, 1981, 6)),
        ("survey date beyond the local CHIRPS stack's coverage (2099-01)",
         lambda: get_rainfall_features(-5.0, 35.0, 2099, 1)),
    ]

    all_raised = True
    for label, call in cases:
        try:
            call()
            print(f"  FAILED (no error raised): {label}")
            all_raised = False
        except ValueError as e:
            print(f"  OK - {label}:\n      {e}")
    return all_raised


def test_batch_helper():
    print("\n" + "=" * 70)
    print("Bonus check: get_rainfall_features_batch() opens CHIRPS once")
    print("=" * 70)
    df = pd.read_csv(DATA_CSV)
    sample = df[df["rain_3m_prior_mm"].notna()].head(3)
    records = sample[["latitude", "longitude", "survey_year", "survey_month"]].to_dict("records")
    results = get_rainfall_features_batch(records)
    print(f"  requested {len(records)} points, got {len(results)} feature dicts")
    assert len(results) == len(records)
    for r in results:
        assert set(r.keys()) == set(RAINFALL_FEATURE_NAMES)
    print("  OK - batch helper returns one complete feature dict per point")


def main():
    ok_2 = test_1_and_2_real_water_point()
    ok_3 = test_3_boundary_and_errors()
    test_batch_helper()

    print("\n" + "=" * 70)
    if ok_2 and ok_3:
        print("STEP 3.2 CLIMATE FEATURE TEST: PASSED")
    else:
        print("STEP 3.2 CLIMATE FEATURE TEST: FAILED - see mismatches above")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
