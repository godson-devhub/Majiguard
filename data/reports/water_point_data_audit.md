# MajiGuard AI — Water-Point Data Audit (Tanzania)

Audit date: 2026-09-20 · Scripts: `scripts/02_audit_waterpoints.py`, `scripts/05_extra_stats_and_checksums.py` · Machine-readable numbers: `data/interim/audit_stats.json`, `data/interim/extra_stats.json`, `data/interim/basic_vs_plus.json`

## 1. Source and what the file actually is

| Item | Finding |
|---|---|
| File supplied | `C:\Users\mshiu\Downloads\Water_Point_Data_Exchange_-_Plus_(WPdx+)_20260912.csv` (587,322,818 bytes). **Not in the project folder**; copied unchanged to `data/raw/water_points/WPdx_Plus_global_export_20260912.csv` (identical SHA-256 `451a35fe…a13d`). |
| Scope of the file | It is the **global WPdx+ export**, not a Tanzania file: 440,270 rows, 73 columns, 19 countries (Nigeria 99,245; Uganda 98,767; … Tanzania 17,518). |
| Tanzania rows | **17,518** (filtered on `#clean_country_name == Tanzania`). The official WPdx+ API (`data.waterpointdata.org/resource/eqje-vguj`, count with `clean_country_name='Tanzania'`) also returns 17,518 → your file is a complete WPdx+ Tanzania extract. |
| Official portal | https://www.waterpointdata.org/access-data/ → WPdx-Basic (`jfkt-jmqa`) and WPdx+ (`eqje-vguj`), both CSV, "fully free and open". No explicit licence string is exposed by the API metadata. |
| Tanzania-specific WPdx+ file? | No separate Tanzania file exists; WPdx+ is one global dataset in which Tanzania is a listed country (filter by country). |
| WPdx-Basic Tanzania (downloaded for comparison) | 28,256 rows via API on 2026-09-20 → `data/raw/water_points/wpdx_basic_tanzania_api_2026-09-20.csv`. |
| Tanzania extract (derived) | `data/interim/wpdx_tanzania_typed.parquet` (typed columns + audit flags). Raw file untouched. |

**WPdx+ vs WPdx-Basic (Tanzania).** All 17,518 WPdx+ points are found in WPdx-Basic by coordinate (5-dp match); Basic has ≈10,700 more rows. On the 18,181 Basic rows whose coordinates match a Plus point, `status_clean` agrees 97.4% → the two share the same labelling. `row_id` values are **not** comparable between the two products (only 61 shared) — join on coordinates/`wpdx_id`, never `row_id`.
WPdx-Basic Tanzania has its own problems: **2,155 rows come from a dataset named `mwe-uganda-…` (Ministry of Water and Environment, Uganda) but sit inside Tanzania's border** (99.3% inside ADM0) → suspected mis-country/mis-geocoded rows; and 2,519 rows share exact coordinates with another row. These rows are *not* in WPdx+.

## 2. Dimensions, dates, geography

| Item | Value |
|---|---|
| Rows / columns (Tanzania) | 17,518 / 73 original columns (+ my derived audit columns) |
| `#report_date` range | 1978-10-27 → 2024-05-10 (all 17,518 parse) |
| **Concentration in time** | **99.1% of records were reported 2004–2009** (2005: 4,105; 2006: 1,968; 2007: 4,806; 2008: 5,817). Only 129 rows are from 2010 or later. |
| Datasets inside | `AMREF SNV Concern and WA_Tanzania_2005-2008` 16,704 · `Ongawa_Tanzania_2008` 509 · `WPDx Reingestion_Global` 235 · `WaterAid_Global_2019-2020` 55 · `Global Water Institute_Tanzania_2021` 15 |
| Data owners (`#source`) | WaterAid 10,861 · SNV 3,970 · Concern 1,330 · Ongawa 509 · AMREF 373 · Plan 330 · other 145 |
| Coverage | **Tanzania Mainland only**: 0 points in the five Zanzibar/Pemba regions. 23 of the 26 mainland NBS-2022 regions have ≥1 point (Iringa has only 1): Dodoma 2,731, Kagera 2,527, Singida 1,903, Tabora 1,198, Njombe 1,016 … Tanga 167, Manyara 126, Lindi 99. **No points fall in Dar es Salaam, Katavi or Mbeya** (WPdx points labelled "Mbeya" lie in the newer Songwe polygon). Coverage is a set of NGO project areas, **not a random sample of the country**. |
| Wards / districts touched | 1,202 of 4,344 NBS-2022 wards; 70 of 150 NBS districts |

## 3. Coordinate and boundary validation (against boundaries, not WPdx's own fields)

Boundaries used: geoBoundaries TZA ADM0 (CC BY 4.0), NBS 2022 PHC ward shapefile (official; 4,344 wards, 31 regions, 150 districts).

* Missing lat/lon: **0**. Invalid (|lat|>90 or |lon|>180): **0**. Zeros: **0**. Outside a rough Tanzania bounding box: **0**.
* Inside Tanzania ADM0 polygon: **17,454**; outside: 64, of which 62 are within 1 km of the border/coast and 2 are 1–1.73 km out (max 1.73 km) → boundary generalisation, **not** wrong-country points.
* Inside an NBS ward polygon: 17,477; 41 fall in no ward (lake/coast slivers).
* `#clean_adm1` vs NBS region polygon (after treating Coast/Coast Region/Pwani as one name): **17,430 agree; 47 true conflicts** (e.g. WPdx "Manyara" but polygon Dodoma ×10, Singida ×6, Arusha ×2; "Mwanza" vs Simiyu ×9; "Simiyu" vs Mwanza ×3) + 41 unassignable. Conflicts are mainly region boundary changes / geocoding of the 2005–2008 surveys. **Region/district/ward for the master dataset must come from the NBS polygons (spatial join), not from `#clean_adm*`.**
* `#clean_adm1` has 23 distinct values incl. legacy names ("Coast", "Coast Region"). `#clean_adm4` is 100% empty; `#adm3`/`#clean_adm3` are free-text (1,072 values).

## 4. Duplicates

* Duplicate `#wpdx_id`: 0. Exact duplicate coordinates: 0.
* Nearest-neighbour distance to another Tanzanian point: ≤1 m: 12; ≤10 m: 264; ≤25 m: 473; ≤50 m: 1,101; median 371 m.
* WPdx flags 62 rows `is_duplicate = true`; none of them is among the ≤10 m pairs, so **the flag does not cover the near-duplicate cases**. Recommendation: review the 264 ≤10 m pairs (same source/technology/status?) and drop or merge confirmed duplicates; keep `is_duplicate` rows out of training until inspected.

## 5. Missingness (original columns)

100% empty: `#clean_adm4`, `#rehabilitator`, **`#rehab_year`**, `#fecal_coliform_*`, `#orig_lnk`. ~99.6%: `#activity_id`, `is_duplicate`; 99.5% `#photo_lnk`; 62.5% `#scheme_id`; 58.4% `rehab_priority`; 58.2% `#pop_who_would_gain_access`.
Useful columns with low missingness: `#water_tech_clean` 5.7%, `#water_tech_category` 5.9%, `#install_year` 5.5%, `#management_clean` 2.3%, `#installer` 1.8%, `#subjective_quality_clean` 1.3%, `#pay_clean` 0.6%, `#water_source_clean` ~0%. Full table: `audit_stats.json → missingness_pct`.
**There is no rehabilitation history at all** (`#rehab_year`, `#rehabilitator` empty) and no water-quality lab values.

## 6. Status fields — the most important finding

`#status_id` (Yes/No), `#status_clean` (7 classes), raw `#status` (free text) and `#notes` (place names).

| `#status_clean` | rows |
|---|---|
| Non-Functional | 8,640 |
| Non-Functional, dry season | 5,137 |
| Functional | 2,978 |
| Functional, needs repair | 375 |
| Abandoned/Decommissioned | 328 |
| Others / Functional, not in use | 44 / 16 |

**The labels are internally inconsistent:**

1. `#status_id` and `#status_clean` disagree on **6,871 of 17,474 labelled rows (39.3%)** (e.g. 5,697 rows are `status_id = Yes` but `status_clean = Non-Functional`).
2. In the main 2005–2008 dataset the raw `#status` text is a **water-quantity remark** ("Enough / Insufficient / Seasonal / Dry Water Quantity"), and the same raw text is mapped to *opposite* clean classes: "Enough Water Quantity" → `Non-Functional` (4,561, status_id Yes) **or** `Non-Functional, dry season` (1,954, status_id No); "Insufficient Water Quantity" → `Functional` (2,231, Yes) **or** `Non-Functional` (2,061, No). There is no deterministic raw→clean rule.
3. The implied non-functional rate is 80.7% of labelled rows (14,105 / 17,474) — far higher than `status_id` implies (Yes = 56.6% functional) and not verifiable against the original survey documentation.
4. Notes are place names only ("Kwa Stephen", "Shuleni"); **no** breakdown/repair keywords (0 hits for broke/repair/dry terms). Notes can't be used to reconstruct failure history.

**Consequence:** any label built from this file is *noisy and of unknown provenance*. See `target_definition.md`.

## 7. Repeated observations / history

`water_point_history` (JSON) has 1 observation for 17,489 points, 2 for 28, 3 for 1 → **29 points (0.17%)** with more than one observation, mostly 2019–2020 re-visits days apart; status sequences: Yes→Yes 24, No→Yes 2, No→No 2, Yes→Yes→Yes 1. **No usable failure history.**
Age: `#install_year` 1921–2020; 21 points have install year *after* the report year (age <0) → invalid; median age at report 10 yr (p95 = 35).

## 8. Columns computed by WPdx (not raw observations)

`local_population_1km`, `water_point_population`, `#pop_who_would_gain_access`, `crucialness_score`, `pressure_score`, `rehab_priority`, `#distance_to_primary/secondary/tertiary_road`, `#distance_to_city/town`, `usage_capacity`, `is_urban`, `cluster_size`, `days_since_report`, `staleness_score`. WPdx documents its population source as the *Facebook Continent-of-Africa High Resolution Population* data and 1 km radius (https://www.waterpointdata.org/use-data/rehabilitation-priority/); the road/city/town distance methodology is **not documented** there (page cites OSM for roads). Several depend on the water point's own status/functional neighbours (see leakage).

## 9. Leakage risks

| Column | Why it leaks / risk | Use |
|---|---|---|
| `#status_id`, `#status_clean`, `#status`, `#status_clean` derivatives, `converted` | They *are* the outcome (or a text of it) | Label only |
| `rehab_priority` | Populated for **95.9% of `status_id=No` and 0.0% of `Yes`** — a status-defined column | Never as a feature |
| `#pop_who_would_gain_access` | 58% missing, populated almost only for non-functional points | Never |
| `crucialness_score`, `pressure_score`, `water_point_population` | Computed from the count of *functional* neighbouring points → uses neighbours' (and own) status | Exclude from first model; rebuild status-free versions |
| `dist_nearest_functional_other_m` (mine) | Uses neighbours' status | Exclude / handle with strict time-splits |
| `days_since_report`, `staleness_score` | Function of report date vs export date | Exclude |
| `#photo_lnk`, `#activity_id`, `is_duplicate`, `#scheme_id`, `dataset_title`, `#source` | Source-collection artefacts; `#source`/dataset are strongly tied to which NGO recorded status (label mapping differs by dataset) | Use only for stratified validation; do not use as predictors without deliberate justification |

## 10. Data-quality issues to fix before modelling (ranked)

1. **Label unreliability** (39% `status_id` vs `status_clean` conflict; contradictory raw→clean mapping). Highest risk.
2. **Age of observations**: 99.1% of statuses are 15–20 years old; they describe 2005–2009, not 2026.
3. **No temporal/failure history** (29 multi-visit points).
4. Geographic coverage is NGO-project-based (23 mainland regions, 1,202 wards; nothing in Dar es Salaam/Katavi/Mbeya/Zanzibar); sample is not nationally representative.
5. 264 near-duplicate pairs ≤10 m not flagged as duplicates.
6. Invalid install years (21); legacy region names; 47 region conflicts; 41 points outside any ward.
7. Regional/`#source` confounding: functional rate by `#source` and dataset differs sharply (see `status_by_dataset` in `audit_stats.json`).

## 11. Recommended columns for ML (first prototype)

Keep (observed, low leakage): `latitude`, `longitude`, `#water_source_clean`, `#water_tech_clean` (or category), `#management_clean`, `#pay_clean`, `#installer` (grouped), `#install_year` → `age_at_survey`, `usage_capacity` (technology-derived), `#subjective_quality_clean` (with caution), survey month/year (as a control), NBS region/district/ward (from polygons).
Derived externally (see other reports): rainfall features (CHIRPS), population within radius (WorldPop), nearest facilities, density of neighbouring water points (all-status).
Exclude: everything in §9.
