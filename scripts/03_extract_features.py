"""Spatial/temporal feature extraction for the Tanzania WPdx+ water points (prototype master dataset v0).
Inputs : data/interim/wpdx_tanzania_typed.parquet (from 02_audit), CHIRPS TZ stack, WorldPop 2022 raster, healthsites, OSM education.
Outputs: data/processed/majiguard_master_v0.parquet / .csv  and data/interim/feature_stats.json"""
import json, zipfile, io, warnings
import numpy as np, pandas as pd, rasterio, geopandas as gpd
from scipy.spatial import cKDTree
warnings.filterwarnings("ignore")
tz = pd.read_parquet("data/interim/wpdx_tanzania_typed.parquet")
F = {}
# ------------------------------------------------------------------ CHIRPS monthly rainfall (1981-01 .. 2026-08)
with rasterio.open("data/raw/climate/chirps_v3_monthly_TZA/chirps-v3.0_monthly_TZA_clip_1981-2026.tif") as r:
    R = r.read().astype("float32"); T = r.transform
R[R < 0] = np.nan                                    # nodata (-9999) -> NaN
nT = R.shape[0]
rows, cols = rasterio.transform.rowcol(T, tz.lon.values, tz.lat.values)
rows = np.clip(np.array(rows), 0, R.shape[1] - 1); cols = np.clip(np.array(cols), 0, R.shape[2] - 1)
F["chirps_grid_shape"] = list(R.shape); F["chirps_points_on_nodata_cell"] = int(np.isnan(R[100, rows, cols]).sum())
# nodata cell fallback: mean of valid neighbours in 3x3 (coastal / lake cells)
def val(arr2d, rr, cc):
    v = arr2d[rr, cc].copy(); bad = np.isnan(v)
    for k in np.where(bad)[0]:
        win = arr2d[max(rr[k]-1, 0):rr[k]+2, max(cc[k]-1, 0):cc[k]+2]; v[k] = np.nanmean(win) if np.isfinite(win).any() else np.nan
    return v
def roll_sum(a, L):                                   # S[t] = sum of a[t-L+1..t]
    c = np.nancumsum(np.nan_to_num(a), axis=0); s = c.copy(); s[L:] = c[L:] - c[:-L]; s[:L-1] = np.nan; return s
S3, S6, S12 = roll_sum(R, 3), roll_sum(R, 6), roll_sum(R, 12)
years = 1981 + np.arange(nT) // 12; moy = np.arange(nT) % 12
ref = (years >= 1991) & (years <= 2020)               # WMO-style 30-year climatological normal
def clim(S):                                          # per calendar month (window end month): mean/std over 1991-2020
    m = np.zeros((12,) + S.shape[1:], "float32"); s = np.zeros_like(m)
    for k in range(12):
        sel = ref & (moy == k); m[k] = np.nanmean(S[sel], axis=0); s[k] = np.nanstd(S[sel], axis=0)
    return m, s
C3, C6, C12 = clim(S3), clim(S6), clim(S12)
ann = np.nanmean(np.stack([np.nansum(R[(years == y)], axis=0) for y in range(1991, 2021)]), axis=0)
tz["survey_year"] = tz.report_dt.dt.year; tz["survey_month"] = tz.report_dt.dt.month
t = ((tz.survey_year - 1981) * 12 + tz.survey_month - 1).values.astype(float)
ok = (t >= 12) & (t <= nT - 1) & tz.report_dt.notna().values         # need 12 full prior months
te = (t - 1).astype(int).clip(0, nT - 1)                              # window ends in the month BEFORE the survey month
def feat(S, C, name):
    v = np.full(len(tz), np.nan); mu = v.copy(); sd = v.copy()
    for tt in np.unique(te[ok]):
        idx = np.where(ok & (te == tt))[0]
        v[idx] = val(S[tt], rows[idx], cols[idx]); mu[idx] = val(C[0][tt % 12], rows[idx], cols[idx]); sd[idx] = val(C[1][tt % 12], rows[idx], cols[idx])
    tz[f"rain_{name}_prior_mm"] = v
    tz[f"rain_{name}_pct_of_normal"] = np.where(mu > 0, v / mu * 100, np.nan)
    tz[f"rain_{name}_z"] = np.where(sd > 0, (v - mu) / sd, np.nan)
feat(S3, C3, "3m"); feat(S6, C6, "6m"); feat(S12, C12, "12m")
tz["rain_mean_annual_1991_2020_mm"] = val(ann, rows, cols)
dry = (np.nan_to_num(R, nan=np.nan) < 30).astype("float32"); dry[np.isnan(R)] = np.nan
D12 = roll_sum(dry, 12); v = np.full(len(tz), np.nan)
for tt in np.unique(te[ok]):
    idx = np.where(ok & (te == tt))[0]; v[idx] = val(D12[tt], rows[idx], cols[idx])
tz["dry_months_prior12_lt30mm"] = v
tz["rain_features_available"] = ok
F["rain_features_available_n"] = int(ok.sum()); F["rain_features_missing_n"] = int((~ok).sum())
F["rain_features_missing_reason"] = "survey date before 1982-01 or missing"
# ------------------------------------------------------------------ WorldPop 2022 (constrained, 100 m) population around each point
wp = rasterio.open("data/raw/population/worldpop_R2025A_TZA/tza_pop_2022_CN_100m_R2025A_v1.tif")
P = wp.read(1).astype("float32"); P[P < 0] = 0; P[~np.isfinite(P)] = 0
pr, pc = rasterio.transform.rowcol(wp.transform, tz.lon.values, tz.lat.values); pr = np.array(pr); pc = np.array(pc)
res = wp.res[0]; H, W = P.shape
def pop_radius(R_m):
    out = np.zeros(len(tz), "float32"); k = int(np.ceil(R_m / (res * 111320 * 0.97))) + 1
    off = np.arange(-k, k + 1)
    for n in range(len(tz)):
        r0, c0 = pr[n], pc[n]
        if r0 < 0 or c0 < 0 or r0 >= H or c0 >= W: out[n] = np.nan; continue
        rr = np.clip(r0 + off, 0, H - 1); cc = np.clip(c0 + off, 0, W - 1)
        sub = P[np.ix_(rr, cc)]
        cy = wp.transform.f + (rr + .5) * wp.transform.e; cx = wp.transform.c + (cc + .5) * wp.transform.a
        dy = (cy - tz.lat.values[n]) * 110574.0; dx = (cx - tz.lon.values[n]) * 111320.0 * np.cos(np.radians(tz.lat.values[n]))
        d2 = dy[:, None] ** 2 + dx[None, :] ** 2
        out[n] = sub[d2 <= R_m ** 2].sum()
    return out
for Rm in (500, 1000, 2000):
    tz[f"worldpop2022_pop_within_{Rm}m"] = pop_radius(Rm)
tz["worldpop2022_density_per_km2_1km"] = tz["worldpop2022_pop_within_1000m"] / (np.pi * 1.0 ** 2)
F["worldpop_total_2022"] = float(P.sum())
a = tz["worldpop2022_pop_within_1000m"]; b = tz["local_population_1km_n"]
F["corr_worldpop1km_vs_wpdxplus_local_pop_1km_pearson"] = float(np.corrcoef(a[b.notna()], b[b.notna()])[0, 1])
F["corr_spearman"] = float(a[b.notna()].corr(b[b.notna()], method="spearman"))
F["median_ratio_worldpop_over_wpdx"] = float((a / b).replace([np.inf, -np.inf], np.nan).median())
F["worldpop_1km_quantiles"] = {str(q): float(a.quantile(q)) for q in (.05, .25, .5, .75, .95)}
F["worldpop_1km_zero_share"] = float((a == 0).mean())
# ------------------------------------------------------------------ facilities (health, education) - nearest distance
utm = gpd.GeoSeries(gpd.points_from_xy(tz.lon, tz.lat), crs=4326).to_crs(32736); xy = np.c_[utm.x, utm.y]
hs = gpd.read_file("data/raw/geographic/facilities/tanzania-healthsites_tanzania.geojson")
hs = hs[hs.geometry.notna()]; hs_utm = hs.to_crs(32736); hs_utm["geometry"] = hs_utm.geometry.centroid
F["healthsites_n"] = int(len(hs_utm))
tz["dist_nearest_health_facility_m"] = cKDTree(np.c_[hs_utm.geometry.x, hs_utm.geometry.y]).query(xy)[0]
with zipfile.ZipFile("data/raw/geographic/facilities/hotosm_tza_education_facilities_hotosm_tza_education_facilities_osm_geojson.zip") as z:
    nm = [n for n in z.namelist() if n.endswith(".geojson")][0]; ed = gpd.read_file(io.BytesIO(z.read(nm)))
F["osm_education_layer"] = nm; F["osm_education_n"] = int(len(ed)); ed_utm = ed[ed.geometry.notna()].to_crs(32736); ed_utm["geometry"] = ed_utm.geometry.centroid
tz["dist_nearest_school_m"] = cKDTree(np.c_[ed_utm.geometry.x, ed_utm.geometry.y]).query(xy)[0]
F["dist_health_quantiles_m"] = {str(q): float(tz.dist_nearest_health_facility_m.quantile(q)) for q in (.25, .5, .75, .95)}
F["dist_school_quantiles_m"] = {str(q): float(tz.dist_nearest_school_m.quantile(q)) for q in (.25, .5, .75, .95)}
# ------------------------------------------------------------------ label candidates (kept separate; see target_definition.md)
sc = tz["#status_clean"]
tz["label_functional_status_clean"] = np.where(sc.isin(["Functional", "Functional, needs repair", "Functional, not in use"]), 1, np.where(sc.isin(["Non-Functional", "Non-Functional, dry season", "Abandoned/Decommissioned"]), 0, np.nan))
tz["label_functional_status_id"] = tz["#status_id"].map({"Yes": 1, "No": 0})
F["label_disagreement_status_id_vs_clean"] = float((tz.label_functional_status_clean.notna() & (tz.label_functional_status_clean != tz.label_functional_status_id)).sum() / tz.label_functional_status_clean.notna().sum())
# ------------------------------------------------------------------ exploratory associations (NOT model results)
e = tz[tz.rain_features_available & tz.label_functional_status_clean.notna()].copy()
F["eda_n"] = int(len(e))
for c in ["rain_12m_z", "rain_3m_z", "rain_mean_annual_1991_2020_mm", "dry_months_prior12_lt30mm", "worldpop2022_pop_within_1000m", "age_at_report", "dist_nearest_health_facility_m"]:
    q = pd.qcut(e[c], 3, duplicates="drop", labels=False)
    F[f"eda_nonfunctional_share_by_tercile__{c}"] = {int(k): round(float(1 - v), 3) for k, v in e.groupby(q)["label_functional_status_clean"].mean().items()}
    F[f"eda_spearman_with_label__{c}"] = round(float(e[c].corr(e["label_functional_status_clean"], method="spearman")), 3)
F["eda_nonfunctional_share_by_survey_month"] = {int(k): round(float(1 - v), 3) for k, v in e.groupby("survey_month")["label_functional_status_clean"].mean().items()}
F["eda_n_by_survey_month"] = {int(k): int(v) for k, v in e.groupby("survey_month").size().items()}
# ------------------------------------------------------------------ assemble master v0
keep = {"#wpdx_id": "wpdx_id", "row_id": "row_id_export", "lat": "latitude", "lon": "longitude", "report_dt": "survey_date", "survey_year": "survey_year", "survey_month": "survey_month",
        "dataset_title": "source_dataset_title", "#source": "source_org",
        "#water_source_clean": "water_source", "#water_tech_clean": "water_technology", "#water_tech_category": "water_tech_category", "#management_clean": "management_type", "#pay_clean": "payment_type",
        "#installer": "installer", "install_year_n": "install_year", "age_at_report": "age_at_survey_years", "usage_capacity_n": "usage_capacity", "#subjective_quality_clean": "subjective_water_quality",
        "#status_clean": "status_clean", "#status_id": "status_id", "#status": "status_raw_text", "label_functional_status_clean": "label_functional_status_clean", "label_functional_status_id": "label_functional_status_id",
        "inside_tz_adm0": "inside_tz_adm0", "dist_to_tz_border_m": "dist_to_tz_border_m", "nbs_reg_name": "nbs_region", "nbs_dist_name": "nbs_district", "nbs_ward_name": "nbs_ward", "nbs_ward_code": "nbs_ward_code",
        "#clean_adm1": "wpdx_adm1_region", "#clean_adm2": "wpdx_adm2_district", "region_match": "wpdx_region_matches_nbs", "is_urban": "wpdx_is_urban",
        "nn_dist_m": "dist_nearest_any_water_point_m", "n_wp_within_500m": "n_water_points_within_500m", "n_wp_within_1000m": "n_water_points_within_1000m", "n_wp_within_5000m": "n_water_points_within_5000m",
        "is_duplicate": "wpdx_is_duplicate_flag", "n_hist_obs": "n_history_observations",
        "distance_to_primary_road_n": "wpdx_dist_primary_road_m", "distance_to_secondary_road_n": "wpdx_dist_secondary_road_m", "distance_to_tertiary_road_n": "wpdx_dist_tertiary_road_m",
        "distance_to_city_n": "wpdx_dist_city_m", "distance_to_town_n": "wpdx_dist_town_m", "local_population_1km_n": "wpdx_local_population_1km",
        "water_point_population_n": "wpdx_water_point_population_LEAKY", "crucialness_score_n": "wpdx_crucialness_score_LEAKY", "pressure_score_n": "wpdx_pressure_score_LEAKY",
        "rehab_priority_n": "wpdx_rehab_priority_LEAKY", "pop_who_would_gain_access_n": "wpdx_pop_would_gain_access_LEAKY", "dist_nearest_functional_other_m": "dist_nearest_functional_other_m_LEAKY"}
m = tz[list(keep)].rename(columns=keep)
add = [c for c in tz.columns if c.startswith(("rain_", "worldpop2022", "dry_months", "dist_nearest_health", "dist_nearest_school"))]
m = pd.concat([m, tz[add]], axis=1)
m.insert(0, "master_id", ["MG" + str(i).zfill(6) for i in range(1, len(m) + 1)])
m.to_parquet("data/processed/majiguard_master_v0.parquet", index=False)
m.drop(columns=["status_raw_text"]).to_csv("data/processed/majiguard_master_v0.csv", index=False)
F["master_rows"] = len(m); F["master_cols"] = m.shape[1]
F["master_missing_pct_top"] = (m.isna().mean() * 100).round(1).sort_values(ascending=False).head(15).to_dict()
json.dump(F, open("data/interim/feature_stats.json", "w"), indent=1, default=str)
print("features done", m.shape)
