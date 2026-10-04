# MajiGuard AI — Impact Score (methodology `impact_v1`)

## 1. Purpose
Estimates the *potential magnitude of consequence* to the surrounding community if a water point is or becomes Non-Functional, using only locally available spatial exposure data. It is a **relative prioritization signal**, not a measurement of real-world impact.

## 2. Mathematical definition
```
population_percentile        = percentile(log1p(worldpop2022_pop_within_1000m), reference)
alternative_access_percentile = percentile(log1p(n_water_points_within_1000m), reference)
alternative_scarcity          = 1 - alternative_access_percentile

impact_score = 0.5 * population_percentile + 0.5 * alternative_scarcity
```

## 3. Input features
- `worldpop2022_pop_within_1000m` — WorldPop 2022 population within 1 km (people).
- `n_water_points_within_1000m` — count of *other mapped* WPDx water points within 1 km, **regardless of their status** (not confirmed functioning/usable/accessible alternatives).

No other feature is used in the numeric score.

## 4. Transformations
Both raw inputs are `log1p`-transformed before normalization, to compress their right-skewed distributions (a small number of very dense/crowded locations otherwise dominate a linear scale). `log1p` is monotonic, so relative ordering (and hence direction) is preserved through the transform.

## 5. Percentile normalization convention
For a transformed value `v` against the fixed, sorted reference array `R` (length `N`):
```
percentile(v) = (count(R < v) + count(R <= v)) / (2N)
```
This is the mean of the weak and strict empirical CDF — deterministic, reproducible, and tie-consistent (repeated identical values always receive the same percentile). Implemented with `numpy.searchsorted`. Always bounded to `[0, 1]` by construction: a value below the reference minimum scores 0, a value above the reference maximum scores 1 — no separate clipping step is needed. Whenever this boundary behavior is actually triggered, an explicit `*_below_reference_range` / `*_above_reference_range` audit flag is set to `True`.

## 6. Alternative-scarcity inversion
More nearby mapped points should *lower* potential impact, but `log1p(count)` and its percentile both *increase* with the count — the opposite of what an impact contribution should do. This is corrected by an explicit, separately-named derived variable: `alternative_scarcity = 1 - alternative_access_percentile`. Only `alternative_scarcity` (never the raw count, its log, or its un-inverted percentile) contributes to the score — the variable's name itself signals the direction, so the inversion can never be silently missed.

## 7. Equal weighting
Both components are weighted 0.5 / 0.5. This is a deliberate, transparent default, not a claim that the two dimensions are truly equally important — no expert-elicited or otherwise defensible evidence currently exists to justify weighting one above the other. Revisit if/when such evidence becomes available.

## 8. Missing-data behavior
If either required input is missing, `impact_score` is `None`, `impact_score_available` is `False`, and `impact_unavailable_reason` names exactly which input(s) are missing. **No imputation, no reduced-dimension partial score.** Genuinely invalid input (negative or non-finite values) raises a clear error rather than being silently corrected.

The one known record with missing climate data (`master_id=MG011656`, `wpdx_id=6G6HRQVX+884`, surveyed 1978-10, before CHIRPS coverage begins in 1981) is **not blocked**, because climate was deliberately excluded from the primary numeric score in Step 5.3 — this record has valid population and alternative-access data and scores normally.

## 9. Reference distribution
Built once by `scripts/18_build_impact_reference_distribution.py` from `data/processed/majiguard_master_v0.parquet` (all 17,518 rows; 0 excluded — both required features are 100% populated, non-negative, and finite in the current dataset). Stored as `reference_distribution.npz` (the two sorted, `log1p`-transformed arrays) plus `methodology.json` (full metadata). Loaded fresh by the scoring code — **never recomputed from whatever is being scored** — so every point scored under `impact_v1` is compared against this exact same fixed baseline, and adding new water points to the system never changes existing scores.

## 10. Versioning
Methodology version: **`impact_v1`**. Every scored record carries this tag. `methodology.json` records enough to reproduce the reference distribution exactly: source dataset path, row counts, feature names, transformation, percentile convention, directionality, weights, and creation timestamp.

## 11. Interpretation
A relative, normalized index intended for **comparing water points against each other**, not for standalone absolute interpretation. It is **not** a probability, **not** a percentage or count of people affected, and **not** validated against any real-world outcome (no such ground truth exists for this project — the same limitation documented for the prediction model itself). No Low/Medium/High labels or thresholds are defined at this stage.

## 12. Limitations
- Population and alternative-access are proxies, not confirmed dependency or redundancy data.
- `n_water_points_within_1000m` counts all mapped points regardless of functional status.
- Equal weighting is a default, not an evidence-based conclusion.
- Percentile normalization is relative to the current reference dataset's geographic/temporal coverage (predominantly 2004–2009 WPDx survey points) — it does not adjust for changes in population or water-point density since then.
- **This score has not been validated against any real-world impact outcome.**

## 13. Audit fields
Every scored record exposes: `impact_score`, `population_raw`, `population_log1p`, `population_percentile`, `population_below_reference_range`, `population_above_reference_range`, `alternative_count_raw`, `alternative_count_log1p`, `alternative_access_percentile`, `alternative_below_reference_range`, `alternative_above_reference_range`, `alternative_scarcity`, `population_component`, `alternative_scarcity_component`, `impact_score_available`, `impact_unavailable_reason`, `methodology_version`.

## 14. Testing results
`scripts/19_test_impact_score.py` — all checks passed, including: a real record's intermediate values verified arithmetically consistent; zero-population and zero-alternative edge cases; directionality (higher population → higher score; fewer alternatives → higher score); missing-input handling (population, alternatives, both); the known 1978 record scoring successfully; out-of-reference-range boundary clipping with audit flags; tie-consistent percentile handling; batch-vs-individual and fixed-reference consistency (adding records never changes existing scores); a fresh-process artifact reload producing identical results; and a fully hand-worked synthetic example (population_percentile=0.2, alternative_access_percentile=0.4, alternative_scarcity=0.6, impact_score=0.4).

## 15. Known limitations / future work
- No expert-weighting elicitation has occurred; equal weighting remains provisional.
- No Low/Medium/High categorical interpretation has been defined.
- The reference distribution reflects the current, largely 2004–2009 dataset; a re-baselining policy will be needed if/when the underlying water-point inventory is substantially refreshed.
- Not yet wired into prediction, API, database, or UI (out of scope for Step 5.4).
