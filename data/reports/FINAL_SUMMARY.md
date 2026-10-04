# MajiGuard AI — Data Foundation: Final Summary (2026-09-20)

Detailed reports (same folder): `water_point_data_audit.md`, `population_data_research.md`, `climate_data_research.md`, `geographic_data_research.md`, `target_definition.md`, `master_dataset_design.md`. Registers: `data/metadata/data_sources.csv`, `data_dictionary.csv`, `DATA_DOWNLOAD_INSTRUCTIONS.md`, `raw_file_checksums.csv`.

## Headline findings
1. Your WPdx+ CSV is the **global** export (440,270 rows); Tanzania = **17,518** rows (matches the official API count). It lives in `Downloads`, so it was copied unchanged into `data/raw/water_points/`.
2. **Future-failure prediction is not supportable**: 99.8% of points have a single observation and 99.1% were surveyed in 2004–2009.
3. **The status label is unreliable**: `#status_id` and `#status_clean` disagree on 39.3% of labelled rows and the same raw text maps to opposite classes. Fix the label (or use a transparent priority index) before any model claim.
4. Climate (CHIRPS), population (WorldPop, NBS ward counts) and geography (NBS wards, facilities) are downloaded and successfully attached to every point; independent checks agree (WorldPop vs WPdx 1 km population: Spearman 0.91; WorldPop vs NBS ward census counts: Pearson 0.90).

## A. Datasets found

| Domain | Dataset | Provider | Tanzania coverage | Time coverage | Format | Status |
|---|---|---|---|---|---|---|
| Water points | WPdx+ (global export; TZ rows) | WPdx | 17,518 pts, Mainland | 1978–2024 (99.1% 2004–09) | CSV | Downloaded |
| Water points | WPdx-Basic (TZ rows) | WPdx | 28,256 rows | 2002–2024 | CSV/API | Downloaded (comparison) |
| Population | WorldPop R2025A 100 m (2022) | WorldPop | country file | 2015–2030 | GeoTIFF | Downloaded (2022) |
| Population | NBS Census 2022 Admin Units Population (Vol. 1a) | NBS | wards/councils | Aug 2022 | PDF | Downloaded, parsed (79.4% of wards matched) |
| Population | NBS Census 2022 microdata | NBS | national | 2022 | microdata | Manual (terms) |
| Climate | CHIRPS v3.0 monthly | UCSB CHC | Tanzania window | 1981-01 → 2026-08 | GeoTIFF (stack) | Downloaded |
| Climate | ERA5-Land monthly | Copernicus | Tanzania subset | 1950 → present | NetCDF/GRIB | Manual (CDS key) |
| Climate | TMA station data | TMA | stations | long, sparse | – | Request only |
| Geographic | NBS 2022 ward shapefile | NBS | 4,344 wards | 2022 | Shapefile | Downloaded |
| Geographic | geoBoundaries ADM0–ADM3 | geoBoundaries | Tanzania | 2015–2021 | GeoJSON | Downloaded |
| Geographic | Healthsites (6,729) / OSM education (103,030) | Healthsites.io / HOT via HDX | Tanzania | to 2025 / 2026-09 | GeoJSON | Downloaded |
| Geographic | OSM roads (Geofabrik / HOT) | OSM | Tanzania | snapshot | PBF/GPKG (0.6–1.9 GB) | Not downloaded (size); WPdx+ road distances used |

## B. Datasets actually downloaded (all under `C:\Users\mshiu\Desktop\MajiGuardppt\data\raw\`)
* `water_points/WPdx_Plus_global_export_20260912.csv` (587 MB, copy of your file) · `water_points/wpdx_basic_tanzania_api_2026-09-20.csv` (24.9 MB)
* `population/worldpop_R2025A_TZA/tza_pop_2022_CN_100m_R2025A_v1.tif` (135 MB) + licence + catalogue JSON · `population/nbs_census2022/Administrative_units_Population_Distribution_Report_Tanzania_volume1a.pdf` (15 MB)
* `climate/chirps_v3_monthly_TZA/chirps-v3.0_monthly_TZA_clip_1981-2026.tif` (127 MB, 548 monthly bands) + `.meta.json`
* `geographic/nbs_tz_2022_wards/TANZANIA_2022PHC_WARD_SHAPEFILES.zip` (10.4 MB; extracted copy in `extracted/`) · `geographic/geoboundaries_TZA/geoBoundaries-TZA-ADM{0,1,2,3}.geojson` (+ API metadata) · `geographic/facilities/tanzania-healthsites_tanzania.geojson`, `…/hotosm_tza_education_facilities_…geojson.zip`
* Derived (not raw): `data/interim/wpdx_tanzania_typed.parquet`, `nbs_ward_population_2022_parsed.csv`, `data/processed/majiguard_master_v0.parquet|csv`.

## C. Datasets requiring manual action
See `data/metadata/DATA_DOWNLOAD_INSTRUCTIONS.md`: (1) **ERA5-Land** — create a CDS account/API key, run the provided request (temperature, soil moisture; Tanzania box); (2) **TMA** — send a formal data request (met@meteo.go.tz); (3) **NBS microdata / village-level shapefiles** — accept terms / formal request (optional); (4) **OSM roads** — optional 0.7–1.9 GB download; (5) **current ground-truth status** from the Ministry of Water / RUWASA or a re-survey (most important).

## D. Recommended MajiGuard features
Water point: technology category, source, management, payment, age, usage capacity. Climate (CHIRPS): 12- and 3-month rainfall z-scores, mean annual rainfall, dry months in prior 12, survey month. Impact: WorldPop population within 1 km and density, health/school proximity. Context: water points within 1 km, distance to nearest other point, WPdx+ tertiary-road distance (provisional). Grouping: NBS ward/district. **Excluded (leakage):** status fields, `rehab_priority`, `crucialness_score`, `pressure_score`, `water_point_population`, `#pop_who_would_gain_access`, functional-neighbour distances, staleness/date-derived scores.

## E. Master dataset design
`majiguard_master_v0` (17,518 × 71): identifiers · lat/lon · survey date · source · water-point attributes · label candidates · NBS region/district/ward · nearest-neighbour and count features · WPdx+ road/town distances · CHIRPS features (11 + availability flag) · WorldPop features (4) · health/school distances. Dictionary: `data/metadata/data_dictionary.csv` (79 entries incl. planned features).

## F. Data integration method
* WPdx → one row per observation (`wpdx_id`). * Climate raster → point: nearest 0.05° cell; sums/anomalies over windows ending the month before the survey; 1991–2020 normal. * Population raster → buffer: sum of 100 m cells within 500 m/1 km/2 km; NBS ward counts for validation/control. * Boundaries → point-in-polygon spatial join (NBS wards) — WPdx admin names are not trusted. * Roads → WPdx+ distances now (OSM-derived distances later). * Nearby water points → KD-tree in EPSG:32736 (all statuses). * Facilities → nearest-neighbour distance.

## G. Target variable recommendation
Future disruption prediction: **not supported**. Supported now: (A) transparent priority index (risk indicators × community impact) for the dashboard, and (B) a supervised **"status classification proxy"** trained on the 2004–2009 label with mandatory label-quality controls (agreement subset of 10,603 rows; spatial group CV; leave-one-source-out). Plan to obtain real current/maintenance data (Track C in `target_definition.md`).

## H. Data-quality risks
Duplicates: 264 points ≤10 m apart (12 ≤1 m), 0 exact; WPdx's 62 `is_duplicate` flags don't cover them. Coordinates: 0 invalid; 64 slightly outside the border polygon (≤1.73 km); 47 region conflicts, 41 in no ward. Missing values: rehab year/rehabilitator 100%, install year 5.5%, technology 5.7%. **Status inconsistency 39.3%**. Temporal inconsistency: statuses 17–21 years old; population 2022. Geographic mismatch: coverage is NGO-project based (23 of 26 mainland regions, 1,202 of 4,344 wards; none in Zanzibar, Dar es Salaam, Katavi, Mbeya). Leakage: see D. Failure history: 29 multi-observation points only. WPdx-Basic additionally has 2,155 rows from a Uganda-named dataset lying inside Tanzania.

## I. Next 10 data-science steps
1. Decide the label policy with your supervisor (agreement subset vs priority index) and record it in `target_definition.md`.
2. Trace the original survey sources (WPdx catalogue datasets `tanzania-water-point-mapping-multiple-sources-5f047beb`, WaterAid/SNV/AMREF/Concern) to understand why `status_clean` contradicts the raw text; rebuild the functionality field if possible.
3. Review the 264 near-duplicate pairs; remove confirmed duplicates and rows with `is_duplicate = true`.
4. Fix invalid install years (21), unify legacy region names, drop `Others`.
5. EDA per source and per region: label rates, maps of points vs wards, feature distributions, missingness patterns.
6. Request current status / maintenance records (Ministry of Water, RUWASA, district engineers) and plan a small re-survey.
7. Create your CDS account and download ERA5-Land (temperature, soil moisture); send the TMA data request.
8. Improve NBS ward-population matching (codes/fuzzy) from 79.4% to ~100% and compute `estimated_population_served` (catchment sharing over all points).
9. Build baseline models (logistic regression → gradient boosting) with spatial group CV and leave-one-source-out; report PR-AUC/recall/calibration and label-noise sensitivity — no claims beyond that.
10. Package the pipeline (scripts → PostgreSQL table → FastAPI → React dashboard) and keep "ILLUSTRATIVE" labelling on any demo figures until real validated outputs exist.
