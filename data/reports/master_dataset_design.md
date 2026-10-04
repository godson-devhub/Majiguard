# MajiGuard AI — Master Dataset Design and Integration Plan

Entity of the master dataset: **one water-point observation** (`wpdx_id` + `survey_date`). Prototype v0 is built: `data/processed/majiguard_master_v0.parquet` / `.csv` — 17,518 rows × 71 columns. Full data dictionary (79 entries incl. planned features): `data/metadata/data_dictionary.csv`.

```
Water point (WPdx+, 17,518)            ── attributes, label candidates
  + Climate      (CHIRPS raster)        ── value at the point's cell, windows ending BEFORE survey month
  + Population   (WorldPop raster)      ── sum of cells within R of the point (500 m / 1 km / 2 km)
  + Geography    (NBS wards, health, schools, WPdx points, WPdx+ road distances)
  ==> MajiGuard ML dataset (one row per observation)
```

## 1. How each source is attached

| Source | Join type | Method | Time logic |
|---|---|---|---|
| WPdx+ | entity table | Tanzania rows; typed; validated | `survey_date` = `#report_date` |
| NBS 2022 wards | **spatial, point-in-polygon** | `sjoin(predicate="within")` on polygons repaired with `make_valid`; 41 points unassigned | static (2022 boundaries) |
| geoBoundaries ADM0 | spatial QA | distance to border polygon | static |
| CHIRPS monthly | **spatial raster→point + temporal window** | nearest 0.05° cell from the raster transform; sums of the 3/6/12 months **ending the month before the survey**; 1991–2020 climatology per calendar window for % of normal and z-score | survey-date dependent (no future information) |
| WorldPop 2022 | **spatial raster→buffer** | sum of 100 m cell values whose centres lie within R (metric distance) | 2022 snapshot (impact "now") |
| WPdx points themselves | **spatial point→point** | KD-tree in EPSG:32736: nearest neighbour, counts within 500 m/1/5 km (all statuses) | static |
| Healthsites / OSM education | spatial nearest-neighbour | KD-tree in EPSG:32736 (polygon centroids) | snapshot |
| WPdx+ road/town distances | attribute (precomputed by WPdx) | as supplied; verify against OSM | unknown vintage |
| NBS ward population (planned) | attribute join by ward | name matching 79.4% now; use codes/fuzzy matching next | 2022 |
| ERA5-Land (planned) | raster→point + window | as CHIRPS | survey-date dependent |

Two time concepts must never be mixed: **observation time** (status recorded 2004–2009) and **analysis time** (population 2022; dashboard "today"). For training use climate at observation time; for the dashboard recompute climate windows at the latest available month.

## 2. Master columns (v0)
Identifiers `master_id, wpdx_id, row_id_export` · location `latitude, longitude` · time `survey_date, survey_year, survey_month` · provenance `source_dataset_title, source_org` · water-point attributes `water_source, water_technology, water_tech_category, management_type, payment_type, installer, install_year, age_at_survey_years, usage_capacity, subjective_water_quality` · label candidates `status_clean, status_id, status_raw_text, label_functional_status_clean, label_functional_status_id` · geography `inside_tz_adm0, dist_to_tz_border_m, nbs_region, nbs_district, nbs_ward, nbs_ward_code, wpdx_adm1_region, wpdx_adm2_district, wpdx_region_matches_nbs, wpdx_is_urban` · spatial context `dist_nearest_any_water_point_m, n_water_points_within_{500,1000,5000}m` · WPdx+ derived `wpdx_dist_{primary,secondary,tertiary}_road_m, wpdx_dist_city_m, wpdx_dist_town_m, wpdx_local_population_1km` and the **`*_LEAKY`** columns (kept only for transparency) · climate `rain_{3m,6m,12m}_{prior_mm,pct_of_normal,z}, rain_mean_annual_1991_2020_mm, dry_months_prior12_lt30mm, rain_features_available` · population `worldpop2022_pop_within_{500,1000,2000}m, worldpop2022_density_per_km2_1km` · services `dist_nearest_health_facility_m, dist_nearest_school_m`.

Availability check (rows with values): rainfall features 17,517/17,518; WorldPop 100%; NBS ward 17,477; `install_year` 94.5%; `water_technology` 94.3%.

## 3. Recommended minimum dataset for the first ML prototype

| Group | Features (all checked to exist in the data) |
|---|---|
| Water point | `water_tech_category` (or grouped `water_technology`), `water_source`, `management_type`, `payment_type`, `age_at_survey_years`, `usage_capacity` |
| Climate | `rain_12m_z`, `rain_3m_z`, `rain_mean_annual_1991_2020_mm`, `dry_months_prior12_lt30mm`, `survey_month` |
| Population/impact (not a risk feature; for priority) | `worldpop2022_pop_within_1000m`, `worldpop2022_density_per_km2_1km` |
| Geographic context | `n_water_points_within_1000m`, `dist_nearest_any_water_point_m`, `wpdx_dist_tertiary_road_m` (provisional), `dist_nearest_health_facility_m`, `dist_nearest_school_m` |
| Grouping only (not predictors) | `nbs_ward`, `nbs_district`, `source_org` |
| Label | `label_functional_status_clean` (+ agreement subset, see `target_definition.md`) |

Exploratory associations on the 17,473 labelled rows that have rainfall (Spearman with `label_functional`, 1 = functional; **not model results — the label is noisy and confounded by data source**): `dry_months_prior12_lt30mm` +0.115, `worldpop2022_pop_within_1000m` +0.099, `rain_3m_z` −0.077, `rain_12m_z` −0.021, age −0.028, annual rainfall ≈ 0, distance to health facility ≈ 0. The signs for dry months and population are the *opposite* of intuition (more dry months → more functional), which is a warning that region/source confounding dominates. Expect modest, unstable performance until the label is repaired.

## 4. Integration workflow (practical data-science terms)

| # | Step | What it means here | Done? |
|---|---|---|---|
| 1 | Raw data | Immutable copies in `data/raw/` with SHA-256 (`data/metadata/raw_file_checksums.csv`) and a source register (`data_sources.csv`) | ✔ |
| 2 | Data audit | Row/column counts, dates, missingness, categories, duplicates (`water_point_data_audit.md`) | ✔ |
| 3 | Cleaning | Typed columns; invalid install years → NaN; near-duplicate (≤10 m) review; merge legacy region names; drop `Others` label class | partly (flags created, rows not yet removed) |
| 4 | Geographic validation | Points vs ADM0 and NBS wards; admin fields re-derived spatially | ✔ |
| 5 | Feature extraction | Raster sampling (CHIRPS windows, WorldPop buffers), nearest-neighbour distances | ✔ (v0) |
| 6 | Integration | One row per observation; keys `wpdx_id`, spatial joins only (no attribute joins on names) | ✔ (v0) |
| 7 | Master dataset | `majiguard_master_v0` with a data dictionary and leakage flags | ✔ (v0) |
| 8 | EDA | Class balance by source, maps, missingness patterns, feature/label relationships within source | to do |
| 9 | Feature engineering | Group rare technologies/installers, log-transform population/distances, interaction (technology × dry months), status-free neighbour density | to do |
| 10 | Target definition | Agreement-subset binary label; seasonal-failure class; or transparent index | defined, see `target_definition.md` |
| 11 | Split | Spatial group CV by ward/district; leave-one-source-out; small recent (2010+, 129 rows) sanity set | to do |
| 12 | Model training | Regularised logistic regression → gradient-boosted trees; source/region as stratifier not predictor | to do |
| 13 | Evaluation | PR-AUC, recall at fixed precision, calibration, per-source and per-region metrics; label-noise sensitivity | to do |
| 14 | Risk score | Calibrated probability-like score named "risk proxy" | to do |
| 15 | Community impact | Population within 1–2 km, estimated population served, alternatives (current status), schools/health nearby | partly |
| 16 | Maintenance priority | Rank by risk × impact with expert-set weights; ties broken by remoteness; explain drivers | to do |
| 17 | API | FastAPI reads the processed table/PostgreSQL and returns risk, impact, priority per point/ward | to do |
| 18 | Dashboard | React dashboard: map, ward filters, priority list, driver explanation; "ILLUSTRATIVE" banners until real results exist | to do |

## 5. Reproducibility
Scripts (run in order): `00_extract_tanzania_from_wpdx.py` → `01_download_chirps_tz.py` → `02_audit_waterpoints.py` → `03_extract_features.py` → `04_parse_nbs_ward_population.py` → `05_extra_stats_and_checksums.py` → `06_label_counts.py` → `07_build_data_dictionary.py` → `08_build_source_register.py`. Python packages: pandas, numpy, geopandas, shapely, rasterio, pyproj, scipy, pymupdf, pyarrow. `00_extract_tanzania_from_wpdx.py` creates `data/interim/_tz_raw_str.pkl` (Tanzania rows from the raw WPdx+ CSV), which `02_audit_waterpoints.py` reads.
