# MajiGuard AI — Geographic / Spatial Data Research (Tanzania)

Research date: 2026-09-20 · Scripts: `scripts/02_audit_waterpoints.py`, `scripts/03_extract_features.py`

## 1. Recommended geographic layers (prototype)

| Need | Recommended source | Status |
|---|---|---|
| Region / district / **ward** assignment | **NBS 2022 PHC ward shapefile** (official) | Downloaded |
| Country outline / QA of coordinates | **geoBoundaries TZA ADM0** (CC BY 4.0) | Downloaded |
| Alternative admin levels (cross-check) | geoBoundaries TZA ADM1–ADM3 | Downloaded |
| Distance to road / city / town | WPdx+ columns (`#distance_to_primary/secondary/tertiary_road`, `_city`, `_town`) for the prototype; **OpenStreetMap** roads for a reproducible replacement | WPdx+ columns available now; OSM roads *documented, not downloaded* |
| Distance to health facility | Healthsites.io (via HDX) | Downloaded |
| Distance to school | OSM education facilities (HOT export via HDX) | Downloaded |
| Neighbouring water points / density / alternatives | The water-point data itself | Computed |

## 2. Administrative boundaries

### NBS (prioritised, official)
* Page: https://www.nbs.go.tz/statistics/topic/gis — lists (a) **2022 PHC Tanzania Wards** `TANZANIA_2022PHC_WARD_SHAPEFILES.zip` (dated 12 Apr 2024), (b) 2012 PHC ward shapefiles, (c) 2012 PHC regions/districts (`Tanzania GIS Maps.zip`), (d) Districts shapefiles 2019. CRS stated by NBS: GCS Arc 1960 (the 2022 file reads as EPSG:3395 in my environment — re-project explicitly). No licence text is given on the page; microdata-catalogue terms require citation and statistical/scientific use.
* **Downloaded**: 2022 PHC wards: 4,344 wards / 150 districts / 31 regions; attributes `reg_name/code`, `dist_name/code`, `counc_name/code`, `const_*`, `div_*`, `ward_name/code`. 0.48% of polygons are invalid as delivered (fixed with `make_valid`).
* Lower levels (village/sub-village/EA): **not public**; NBS says lower-level shapefiles are available only by formal request (sg@nbs.go.tz).
* Older layers (2012 PHC regions/districts, 2019 districts) pre-date later boundary changes; use the 2022 file, which reflects the current 31-region structure (including Songwe).

### geoBoundaries (open, cross-check)
API https://www.geoboundaries.org/api/current/gbOpen/TZA/{ADMn}/ ; released files (build 12 Dec 2023) downloaded to `data/raw/geographic/geoboundaries_TZA/` with their API metadata:

| Level | Units | Year represented | Source | Licence |
|---|---|---|---|---|
| ADM0 | 1 | 2021 | Sentinel-2 land cover | CC BY 4.0 |
| ADM1 | – | 2015 | OpenStreetMap/Wambacher | ODbL 1.0 |
| ADM2 | – | 2021 | NBS / UN OCHA ROSA | CC BY 3.0 IGO |
| ADM3 | 3,644 | 2015 | OpenStreetMap | ODbL 1.0 |

Because the ADM1 layer is dated 2015, use **NBS-2022** for the master dataset and geoBoundaries only for country-border QA.

## 3. Validation of WPdx geography (results)
See `water_point_data_audit.md` §3. Summary: 0 invalid coordinates; 17,454/17,518 inside the ADM0 polygon and the other 64 within 1.73 km of it; 17,477 inside a ward polygon; WPdx `#clean_adm1` conflicts with the ward polygon's region for 47 points (+41 unassignable). Region/district/ward are therefore **re-derived by spatial join**, and `#clean_adm*` kept only for comparison.

## 4. Roads and accessibility

* **OpenStreetMap** (ODbL). Tanzania extracts exist: Geofabrik `https://download.geofabrik.de/africa/tanzania-latest.osm.pbf` (**705,783,873 bytes**, modified 2026-09-19) and `tanzania-latest-free.shp.zip` (1,914,147,177 bytes); HDX "Roads of Tanzania" (HOT export, ODbL) is 370–620 MB depending on format. **Not downloaded** because of size and because WPdx+ already provides road distances; download only when you need to reproduce/replace them.
* **WPdx+ columns available now:** distance to primary/secondary/tertiary road, city and town (metres). Medians: primary road 30.6 km, secondary 7.6 km, tertiary 1.6 km, town 21.0 km, city 74.4 km. **Methodology and reference date are not documented** on the WPdx rehab-priority page (which mentions OSM roads), so treat them as *provisional* features and verify a sample of points against OSM.
* Derivable from OSM later: distance to nearest road by class, road density (km/km²) in a 5 km buffer, distance to settlements (OSM `place` nodes / buildings layer). Travel-time accessibility would need a friction surface (e.g., Malaria Atlas Project accessibility) — I did not verify its availability or licence, so it is only a candidate.
* HDX also lists "Tanzania — Accessibility Indicators" (CC BY-SA, 734 MB GeoPackage) — not evaluated.

## 5. Health and school proximity (downloaded)

| Layer | Provider | Rows | Licence | File |
|---|---|---|---|---|
| Tanzania Healthsites | Healthsites.io via HDX (`tanzania-healthsites`), dataset period 2011-11-02 → 2025-12-13 | 6,729 features | ODbL | `facilities/tanzania-healthsites_tanzania.geojson` |
| Education facilities (OSM) | HOT export via HDX (`hotosm_tza_education_facilities`), dataset dated 2026-09-10 | 103,030 features (points + polygons; polygon centroids used) | ODbL | `facilities/hotosm_tza_education_facilities_…geojson.zip` |

Results: median distance to nearest health facility **3.6 km** (p25 1.25 km, p95 35 km); nearest school **0.81 km** (p95 3.3 km). Caveats: OSM/Healthsites completeness varies; a missing facility inflates distances. Use as *context/impact* (which services a water point supports) rather than as a strong risk driver.

## 6. Water-point spatial context (from WPdx itself; computed)

| Feature | Result (Tanzania rows) |
|---|---|
| Nearest other water point | median 371 m (p25 182 m, p75 774 m, p95 2.2 km) |
| Water points within 1 km | median 3; **18.1% have none** within 1 km |
| Nearest *functional-labelled* other water point | median 0.68 km, p95 6.8 km (**label-derived → leakage-prone**) |

Important interpretation limits: WPdx is **not a complete inventory** (NGO project areas only), so "no neighbours" may mean "no neighbours *recorded*". Count neighbours over **all** points (not only functional ones) for model features. "Functional alternatives" is a valid *impact* indicator for the dashboard (it must be recomputed with current status) but must not enter the training features because it encodes neighbour labels.

## 7. Limitations
* No village-level boundaries; ward is the finest public administrative unit.
* Road/facility layers depend on OSM completeness; WPdx+ road metrics are undocumented.
* All distances computed in EPSG:32736 (UTM 36S) — approximation acceptable for a prototype (≲0.5% distortion in the east); use a national CRS for production.
