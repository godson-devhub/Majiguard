"""Build data/metadata/data_dictionary.csv for majiguard_master_v0 (+ planned features). Examples are taken from real rows."""
import pandas as pd, numpy as np
m = pd.read_parquet("data/processed/majiguard_master_v0.parquet")
ex = m.dropna(subset=["rain_12m_z", "water_technology", "install_year"]).iloc[3]
def e(c):
    v = ex.get(c, np.nan)
    if pd.isna(v): return ""
    return str(round(v, 2)) if isinstance(v, (float, np.floating)) else str(v)
W = "WPdx+ Tanzania (water_points)"; C = "CHIRPS v3.0 monthly (climate)"; P = "WorldPop R2025A 2022 100m (population)"
N = "NBS 2022 PHC ward shapefile (geographic)"; G = "WPdx+ Tanzania points (spatial context)"; H = "Healthsites.io (geographic)"; O = "OSM education facilities (geographic)"
# name, source, meaning, dtype, spatial, temporal, available, processing, ml_candidate, leakage
R = [
 ("master_id", "MajiGuard", "Row key MG000001…", "string", "-", "-", "yes", "generated", "no", "none"),
 ("wpdx_id", W, "WPdx unique id (Plus Code based)", "string", "point", "-", "yes", "none", "no (key)", "none"),
 ("row_id_export", W, "row_id of this WPdx+ export (not stable across products)", "string", "-", "-", "yes", "none", "no", "none"),
 ("latitude", W, "WGS84 latitude of the water point", "float", "point", "-", "yes", "validated against ADM0", "yes (coarse/spatial CV only)", "low"),
 ("longitude", W, "WGS84 longitude", "float", "point", "-", "yes", "validated against ADM0", "yes (coarse/spatial CV only)", "low"),
 ("survey_date", W, "Date the status/attributes were recorded (#report_date)", "datetime", "-", "observation date", "yes", "parsed", "no (use year/month)", "low"),
 ("survey_year", W, "Year of survey", "int", "-", "observation date", "yes", "derived", "control only", "medium (confounded with source)"),
 ("survey_month", W, "Month of survey (season control)", "int", "-", "observation date", "yes", "derived", "yes", "low"),
 ("source_dataset_title", W, "WPdx dataset the row came from", "string", "-", "-", "yes", "none", "no (validation groups)", "high (label convention differs by dataset)"),
 ("source_org", W, "Organisation that collected the row", "string", "-", "-", "yes", "none", "no (validation groups)", "high"),
 ("water_source", W, "Clean water-source type", "category", "point", "at survey", "yes", "none", "yes", "low"),
 ("water_technology", W, "Clean water technology (e.g. Hand Pump - Nira)", "category", "point", "at survey", "yes", "group rare classes", "yes", "low"),
 ("water_tech_category", W, "Hand pump / Public tapstand / Motorized", "category", "point", "at survey", "yes", "none", "yes", "low"),
 ("management_type", W, "Management model (community, government, …)", "category", "point", "at survey", "yes", "none", "yes", "low"),
 ("payment_type", W, "Payment regime", "category", "point", "at survey", "yes", "none", "yes", "low"),
 ("installer", W, "Installer (free text, 418 values)", "string", "point", "-", "yes", "group top-N", "maybe", "low"),
 ("install_year", W, "Installation year (5.5% missing; 21 invalid > survey year)", "int", "point", "install date", "yes", "clean invalid", "via age", "low"),
 ("age_at_survey_years", W, "survey_year − install_year (negative = invalid)", "float", "point", "at survey", "yes", "set negatives to NaN", "yes", "low"),
 ("usage_capacity", W, "WPdx capacity by technology (50/250/300 people)", "int", "point", "-", "yes", "none", "maybe", "low (technology-derived)"),
 ("subjective_water_quality", W, "Perceived quality (taste/colour/acceptable)", "category", "point", "at survey", "yes", "none", "with caution", "medium (may reflect status)"),
 ("status_clean", W, "WPdx cleaned status (7 classes)", "category", "point", "at survey", "yes", "see target_definition.md", "LABEL only", "IS the target"),
 ("status_id", W, "Yes/No functional flag (conflicts with status_clean on 39%)", "category", "point", "at survey", "yes", "see target_definition.md", "LABEL only", "IS the target"),
 ("status_raw_text", W, "Raw status text (water-quantity remarks)", "string", "point", "at survey", "yes", "-", "no", "high"),
 ("label_functional_status_clean", "MajiGuard", "1=functional-type, 0=non-functional-type (from status_clean)", "float", "point", "at survey", "yes", "derived", "LABEL", "IS the target"),
 ("label_functional_status_id", "MajiGuard", "1/0 from status_id", "float", "point", "at survey", "yes", "derived", "LABEL (agreement check)", "IS the target"),
 ("inside_tz_adm0", "geoBoundaries ADM0", "Point inside Tanzania polygon", "bool", "point-in-polygon", "-", "yes", "spatial join", "no (QA)", "none"),
 ("dist_to_tz_border_m", "geoBoundaries ADM0", "Distance outside polygon (0 if inside)", "float", "point-polygon", "-", "yes", "computed EPSG:32736", "no (QA)", "none"),
 ("nbs_region", N, "Region by point-in-polygon (NBS 2022)", "category", "point-in-polygon", "2022 boundaries", "yes", "spatial join", "grouping / maybe", "low"),
 ("nbs_district", N, "District by point-in-polygon", "category", "point-in-polygon", "2022 boundaries", "yes", "spatial join", "grouping", "low"),
 ("nbs_ward", N, "Ward by point-in-polygon", "category", "point-in-polygon", "2022 boundaries", "yes", "spatial join", "grouping (spatial CV)", "low"),
 ("nbs_ward_code", N, "Ward code", "string", "point-in-polygon", "2022 boundaries", "yes", "spatial join", "grouping", "none"),
 ("wpdx_adm1_region", W, "WPdx region name (legacy spelling; 47 conflicts with polygons)", "category", "-", "-", "yes", "-", "no", "none"),
 ("wpdx_adm2_district", W, "WPdx district name", "category", "-", "-", "yes", "-", "no", "none"),
 ("wpdx_region_matches_nbs", "MajiGuard", "WPdx region equals polygon region", "bool", "-", "-", "yes", "derived", "no (QA)", "none"),
 ("wpdx_is_urban", W, "WPdx urban flag (164 True)", "bool", "point", "-", "yes", "-", "maybe", "low"),
 ("dist_nearest_any_water_point_m", G, "Distance to nearest other recorded water point (any status)", "float", "nearest neighbour (KD-tree, EPSG:32736)", "static", "yes", "computed", "yes", "low (depends on inventory completeness)"),
 ("n_water_points_within_500m", G, "Count of other recorded points within 500 m", "int", "radius", "static", "yes", "computed", "yes", "low"),
 ("n_water_points_within_1000m", G, "… within 1 km", "int", "radius", "static", "yes", "computed", "yes", "low"),
 ("n_water_points_within_5000m", G, "… within 5 km", "int", "radius", "static", "yes", "computed", "yes", "low"),
 ("wpdx_is_duplicate_flag", W, "WPdx duplicate flag (62 true)", "bool", "-", "-", "yes", "-", "no (filter)", "none"),
 ("n_history_observations", W, "Number of observations in water_point_history (max 3)", "int", "-", "-", "yes", "-", "no", "low"),
 ("wpdx_dist_primary_road_m", W, "WPdx+ distance to primary road (method undocumented)", "float", "precomputed", "unknown", "yes", "verify vs OSM", "yes (provisional)", "low"),
 ("wpdx_dist_secondary_road_m", W, "WPdx+ distance to secondary road", "float", "precomputed", "unknown", "yes", "verify vs OSM", "yes (provisional)", "low"),
 ("wpdx_dist_tertiary_road_m", W, "WPdx+ distance to tertiary road", "float", "precomputed", "unknown", "yes", "verify vs OSM", "yes (provisional)", "low"),
 ("wpdx_dist_city_m", W, "WPdx+ distance to city", "float", "precomputed", "unknown", "yes", "verify", "yes (provisional)", "low"),
 ("wpdx_dist_town_m", W, "WPdx+ distance to town", "float", "precomputed", "unknown", "yes", "verify", "yes (provisional)", "low"),
 ("wpdx_local_population_1km", W, "WPdx+ population within 1 km (Meta HRSL per WPdx docs)", "float", "radius 1 km", "fixed vintage", "yes", "-", "comparison only", "low"),
 ("wpdx_water_point_population_LEAKY", W, "WPdx+ potential users assigned to this point", "float", "1 km", "-", "yes", "-", "NO", "HIGH (uses functional neighbours)"),
 ("wpdx_crucialness_score_LEAKY", W, "WPdx+ crucialness", "float", "1 km", "-", "yes", "-", "NO", "HIGH"),
 ("wpdx_pressure_score_LEAKY", W, "WPdx+ pressure", "float", "1 km", "-", "yes", "-", "NO", "HIGH"),
 ("wpdx_rehab_priority_LEAKY", W, "WPdx+ rehab priority (95.9% populated for status_id=No, 0% for Yes)", "float", "-", "-", "yes", "-", "NO", "HIGH (status-defined)"),
 ("wpdx_pop_would_gain_access_LEAKY", W, "WPdx+ population who would gain access", "float", "-", "-", "yes", "-", "NO", "HIGH"),
 ("dist_nearest_functional_other_m_LEAKY", G, "Distance to nearest other point labelled functional", "float", "nearest neighbour", "at survey", "yes", "-", "NO for training; OK for dashboard with CURRENT status", "HIGH"),
 ("rain_3m_prior_mm", C, "Rainfall total in the 3 months before the survey month", "float", "raster cell at point (nearest 0.05° cell)", "window ends month before survey", "yes", "extracted", "yes", "low"),
 ("rain_3m_pct_of_normal", C, "3-month total ÷ 1991–2020 mean of same window ×100", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_3m_z", C, "3-month standardised anomaly (SPI-like)", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_6m_prior_mm", C, "6-month total", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_6m_pct_of_normal", C, "6-month % of normal", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_6m_z", C, "6-month standardised anomaly", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_12m_prior_mm", C, "12-month total before survey month", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_12m_pct_of_normal", C, "12-month % of normal", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_12m_z", C, "12-month standardised anomaly", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_mean_annual_1991_2020_mm", C, "Long-term mean annual rainfall", "float", "cell", "1991–2020 climatology", "yes", "extracted", "yes", "low"),
 ("dry_months_prior12_lt30mm", C, "Months <30 mm in the 12 months before survey (drought proxy)", "float", "cell", "same", "yes", "extracted", "yes", "low"),
 ("rain_features_available", "MajiGuard", "False if survey before 1982-01", "bool", "-", "-", "yes", "derived", "no (QA)", "none"),
 ("worldpop2022_pop_within_500m", P, "People within 500 m (sum of 100 m cells)", "float", "radius, metric distance to cell centres", "2022 population", "yes", "extracted", "yes", "low"),
 ("worldpop2022_pop_within_1000m", P, "People within 1 km", "float", "radius", "2022", "yes", "extracted", "yes (impact)", "low"),
 ("worldpop2022_pop_within_2000m", P, "People within 2 km", "float", "radius", "2022", "yes", "extracted", "sensitivity", "low"),
 ("worldpop2022_density_per_km2_1km", P, "pop_within_1000m ÷ π km²", "float", "radius", "2022", "yes", "derived", "yes", "low"),
 ("dist_nearest_health_facility_m", H, "Distance to nearest health facility (centroid)", "float", "nearest neighbour", "2011–2025 mixed", "yes", "computed", "impact/context", "low"),
 ("dist_nearest_school_m", O, "Distance to nearest OSM education facility", "float", "nearest neighbour", "2026-09 snapshot", "yes", "computed", "impact/context", "low"),
]
d = pd.DataFrame(R, columns=["feature_name", "source_dataset", "meaning", "data_type", "spatial_relationship", "temporal_relationship", "available_now", "requires_processing", "candidate_ml_feature", "leakage_risk"])
d["example"] = [e(c) if c in m.columns else "" for c in d.feature_name]
missing = [c for c in m.columns if c not in set(d.feature_name)]
print("master columns without dictionary entry:", missing)
missing_in_master = [c for c in d.feature_name if c not in m.columns]
print("dictionary entries not in master:", missing_in_master)
PLANNED = [
 ("temp_mean_prior3m_c", "ERA5-Land monthly (climate)", "Mean 2 m temperature in prior 3 months", "float", "0.1° cell", "window before survey/analysis date", "no", "manual CDS download", "yes", "low"),
 ("soil_moisture_l1l2_prior3m", "ERA5-Land monthly (climate)", "Volumetric soil water 0–28 cm", "float", "0.1° cell", "same", "no", "manual CDS download", "yes", "low"),
 ("dist_nearest_road_osm_m", "OSM roads (geographic)", "Distance to nearest road (all classes)", "float", "nearest line", "OSM snapshot", "no", "download Geofabrik/HOT roads + compute", "yes", "low"),
 ("road_density_5km_km_per_km2", "OSM roads (geographic)", "Road length per km² in 5 km buffer", "float", "buffer", "snapshot", "no", "same", "yes", "low"),
 ("estimated_population_served", "WorldPop + all water points", "Cell population shared among water points within R (inverse-distance)", "float", "catchment", "2022", "no", "compute (all statuses)", "impact (dashboard)", "low"),
 ("ward_population_2022", "NBS Census 2022 Vol 1a", "Ward total population", "int", "ward polygon", "2022", "partly (79% of wards matched)", "improve name matching", "control/report", "low"),
 ("current_status_2026", "New survey / MoW / RUWASA (Track C)", "Current functionality", "category", "point", "2026", "no", "must be obtained", "LABEL for dashboard/validation", "IS the target"),
 ("n_functional_alternatives_within_1km_current", "New status data + point layer", "Functional alternatives now", "int", "radius", "current", "no", "needs current status", "dashboard impact only", "HIGH if used for training"),
]
dp = pd.DataFrame(PLANNED, columns=d.columns[:-1]); dp["example"] = ""
out = pd.concat([d, dp], ignore_index=True)
out.to_csv("data/metadata/data_dictionary.csv", index=False)
print("rows", len(out))
