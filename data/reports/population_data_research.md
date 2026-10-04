# MajiGuard AI — Population Data Research (Tanzania)

Research date: 2026-09-20 · Scripts: `scripts/03_extract_features.py`, `scripts/04_parse_nbs_ward_population.py` · Stats: `data/interim/feature_stats.json`, `data/interim/nbs_ward_population_stats.json`

## 1. Recommended approach in one paragraph

Use the **WorldPop 2022 constrained 100 m Tanzania raster** as the *spatial* population source (population within a radius of each water point), and use the **official NBS 2022 census ward counts** as the *administrative* control/validation (ward totals, household counts). Never attach a district total to every water point. Both are downloaded.

## 2. Sources investigated

### A. Tanzania National Bureau of Statistics (official, prioritised)

| Resource | What it is | Status |
|---|---|---|
| Census 2022 portal https://www.nbs.go.tz/statistics/topic/census-2022 (→ https://sensa.nbs.go.tz/) | Landing page of publications: initial results, administrative reports, age/sex, regional profiles, projections 2023–2050 (council-level). Not a data API. | Read; no direct table downloads on the page |
| **Administrative Units — Population Distribution Report, Vol. 1a** | PDF with population by sex, households and household size for regions, councils and **wards** (2022 PHC). URL: `https://www.nbs.go.tz/nbs/takwimu/Census2022/Administrative_units_Population_Distribution_Report_Tanzania_volume1a.pdf` (15,016,674 bytes, 290 pages, last-modified 2024-06-25) | **Downloaded** → `data/raw/population/nbs_census2022/` |
| **2022 PHC ward shapefile** https://www.nbs.go.tz/uploads/statistics/documents/en-1714652282-TANZANIA_2022PHC_WARD_SHAPEFILES.zip (10,419,963 bytes) | 4,344 ward polygons, with region/district/council/constituency/division/ward names and codes; CRS EPSG:3395. **No population attribute.** | **Downloaded** → `data/raw/geographic/nbs_tz_2022_wards/` |
| Census 2022 microdata https://microdata.nbs.go.tz/index.php/catalog/45 | Anonymised public-use file; users must accept a confidentiality/terms declaration (no redistribution without NBS written approval, statistical/scientific use only, no re-identification). | **Not downloaded** (needs terms acceptance by the user) |
| Lower-level (village/EA) shapefiles | Catalogue entry 49: shapefiles "up to level three" (ward) are public; lower levels only "by formal request to NBS" (sg@nbs.go.tz, +255 26 2963822). | Not available publicly → **village-level population is not available**; document as a limitation |

The Vol. 1a PDF was parsed (text layer is machine-readable): 3,831 ward rows across 173 councils (sum 58,420,444 people). These were matched by council+ward name to the shapefile: **3,448 of 4,344 wards (79.4%)**. The reason for the unmatched 896 wards (name spelling differences, councils absent from Vol. 1a, or Zanzibar/other volumes) was **not investigated**. Output: `data/interim/nbs_ward_population_2022_parsed.csv` (interim, derived; raw PDF untouched).

I did not verify the national total from the initial-results PDF (its text could not be extracted); do not quote a national total from this report.

### B. WorldPop

| Field | Value (verified from the WorldPop REST catalogue `hub.worldpop.org/rest/data/pop/G2_CN_POP_R25A_100m?iso3=TZA`) |
|---|---|
| Product | "United Republic of Tanzania — Spatial Distribution of Population", **Global2 R2025A v1, constrained, 100 m (3 arc-second)** |
| Years | 2015 … 2030 (one file per year) |
| Variable | Estimated **people per grid cell** (float32); nodata −99999 |
| Format / CRS | GeoTIFF, EPSG:4326 |
| Method | Random-forest dasymetric redistribution; "constrained" products restrict population to mapped settlement areas (see the WorldPop release statement) |
| DOI | 10.5258/SOTON/WP00839 (published 2025-09-01) |
| Licence | Creative Commons Attribution 4.0 (`hub.worldpop.org/data/licence.txt`) |
| Caveat | The catalogue record says the dataset "currently represents an **alpha** version (R2025A) … may change over the coming year" — record the version in every result. |
| **Downloaded** | `tza_pop_2022_CN_100m_R2025A_v1.tif` — 135,374,149 bytes, 12,932 × 13,327 px, res 0.000833°, bounds 29.34–40.45E / 11.76–0.98S. URL: `https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2022/TZA/v1/100m/constrained/tza_pop_2022_CN_100m_R2025A_v1.tif`. Country-specific file → no global download and no clipping needed. |

**Why 2022:** it equals the census year, so the raster can be checked against the NBS census, and it is the year closest to the census-based population totals. Other years can be downloaded by changing the year in the URL.

### C. Why not WPdx's own population columns?
WPdx+ provides `local_population_1km` (from the Facebook/Meta HRSL, per WPdx documentation) and derived potential-user fields. They are useful for cross-checks but (a) `water_point_population`, `crucialness_score`, `pressure_score` depend on functional neighbours (leakage) and (b) provenance/vintage is fixed by WPdx. We use WorldPop as our own reproducible feature and WPdx's `local_population_1km` only as a comparison.

## 3. Validation results (real numbers)

* WorldPop 2022 raster total: **63,766,640** people (constrained, whole raster).
* **Point level:** WorldPop population within 1 km of each water point vs WPdx+ `local_population_1km`: Pearson **0.849**, Spearman **0.910**, median ratio **1.02** (n≈17,088). Independent sources broadly agree.
* **Ward level:** For the 3,448 wards matched to NBS ward counts, WorldPop 2022 zonal sums vs NBS 2022 census ward totals: Pearson **0.903**, Spearman **0.904**, median ratio **1.04** (p10 0.73, p90 1.41); matched-ward totals 50.46 M (census) vs 52.16 M (WorldPop).
* Conclusion: WorldPop is a defensible spatial disaggregation of the census, with ±30–40% scatter at ward level; treat population within radius as an *estimate*, not a count.

## 4. How to associate population with individual water points

Do **not** copy a district/ward total onto each water point. Recommended, in order:

1. **Buffer population (implemented):** `pop_within_500m/1000m/2000m` = sum of WorldPop cells whose centres are within R of the point (metric distance). Median 987 people within 1 km; 5th–95th percentile 244–6,441; only 0.09% of points have zero. 1 km ≈ the walking-distance service assumption used by WPdx; 2 km is a sensitivity analysis.
2. **Density:** `pop_within_1000m / (π·1 km²)`.
3. **Service-area/catchment share (next step):** split each populated cell among the water points within R (inverse-distance weights) so a village near 5 water points is not counted 5×. This must use **all water points regardless of status** (using only functional ones leaks the label). Output `estimated_population_served`.
4. **Ward context (justified only as a sanity check):** NBS ward population and household size for validation and for reporting at the ward level in the dashboard. Do not use as a per-point feature except as a coarse control.

Temporal caveat: WorldPop 2022 describes 2022 population; the water-point status was observed 2005–2009. For the prototype's *current-risk* framing this is appropriate (impact now). For any *historical* model use the year matching the survey (2015 is the earliest WorldPop year in this product; earlier years require the older WorldPop "wpgp" series (the catalogue lists a 2000 Tanzania layer; check the available years before use)).

## 5. Limitations
* Village-level census counts are not public; wards (mean ≈ 15 k people in the parsed table) are the finest official unit.
* Ward-name matching between the PDF and shapefile covers 79.4% — improve with fuzzy matching or NBS codes if ward-level joins are needed.
* WorldPop R2025A is flagged alpha; results may change with later releases.
