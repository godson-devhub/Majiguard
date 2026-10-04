"""Audit of the Tanzania rows inside the user's global WPdx+ export. Reads the ORIGINAL file (never modifies it),
writes a typed Tanzania extract to data/interim and machine-readable audit stats to data/interim/audit_stats.json"""
import pandas as pd, numpy as np, json, warnings
import geopandas as gpd
from scipy.spatial import cKDTree
warnings.filterwarnings("ignore")
SRC = r"C:\Users\mshiu\Downloads\Water_Point_Data_Exchange_-_Plus_(WPdx+)_20260912.csv"
tz = pd.read_pickle("data/interim/_tz_raw_str.pkl")  # Tanzania rows filtered from SRC (string dtype)
S = {}
S["n_rows_tz"] = len(tz)
src_cols = list(pd.read_csv(SRC, nrows=0).columns)
S["n_cols"] = len(src_cols)
num = lambda s: pd.to_numeric(s.astype(str).str.replace(",", "", regex=False), errors="coerce")
tz["lat"] = num(tz["#lat_deg"]); tz["lon"] = num(tz["#lon_deg"])
tz["report_dt"] = pd.to_datetime(tz["#report_date"], format="%Y %b %d %I:%M:%S %p", errors="coerce")
tz["install_year_n"] = num(tz["#install_year"])
for c in ["#distance_to_primary_road", "#distance_to_secondary_road", "#distance_to_tertiary_road", "#distance_to_city", "#distance_to_town",
          "local_population_1km", "water_point_population", "rehab_priority", "#pop_who_would_gain_access", "crucialness_score",
          "pressure_score", "usage_capacity", "days_since_report", "staleness_score", "cluster_size"]:
    tz[c.lstrip("#") + "_n"] = num(tz[c])
S["report_date_min"] = str(tz.report_dt.min().date()); S["report_date_max"] = str(tz.report_dt.max().date())
S["report_year_counts"] = {int(k): int(v) for k, v in tz.report_dt.dt.year.value_counts().sort_index().items()}
S["share_reported_2004_2009"] = float(tz.report_dt.dt.year.between(2004, 2009).mean())
# ---- coordinates
S["lat_lon_missing"] = int(tz.lat.isna().sum() + tz.lon.isna().sum())
S["lat_lon_global_invalid"] = int(((tz.lat.abs() > 90) | (tz.lon.abs() > 180)).sum())
S["lat_lon_zero"] = int(((tz.lat == 0) | (tz.lon == 0)).sum())
S["outside_rough_tz_box"] = int((~tz.lat.between(-11.9, -0.9) | ~tz.lon.between(29.3, 40.5)).sum())
gdf = gpd.GeoDataFrame(tz[["#wpdx_id", "lat", "lon"]].copy(), geometry=gpd.points_from_xy(tz.lon, tz.lat), crs=4326)
gb = "data/raw/geographic/geoboundaries_TZA/"
adm0 = gpd.read_file(gb + "geoBoundaries-TZA-ADM0.geojson").to_crs(32736).union_all()
utm = gdf.to_crs(32736)
tz["dist_to_tz_border_m"] = utm.geometry.map(lambda p: 0.0 if adm0.contains(p) else float(adm0.distance(p))).values
tz["inside_tz_adm0"] = tz.dist_to_tz_border_m == 0
S["inside_adm0"] = int(tz.inside_tz_adm0.sum()); S["outside_adm0"] = int((~tz.inside_tz_adm0).sum())
S["outside_adm0_within_1km"] = int(((~tz.inside_tz_adm0) & (tz.dist_to_tz_border_m <= 1000)).sum())
S["outside_adm0_gt_1km"] = int((tz.dist_to_tz_border_m > 1000).sum())
S["outside_adm0_gt_10km"] = int((tz.dist_to_tz_border_m > 10000).sum())
S["outside_adm0_max_km"] = float(tz.dist_to_tz_border_m.max() / 1000)
# ---- administrative validation vs NBS 2022 wards
w = gpd.read_file("data/raw/geographic/nbs_tz_2022_wards/extracted/TANZANIA_2022PHC_WARDS_SHAPEFILES.shp")
w["geometry"] = w.geometry.make_valid()
w = w.to_crs(4326)
j = gpd.sjoin(gdf, w[["reg_name", "dist_name", "counc_name", "ward_name", "ward_code", "reg_code", "dist_code", "geometry"]], how="left", predicate="within")
j = j[~j.index.duplicated(keep="first")]
for c in ["reg_name", "dist_name", "ward_name", "ward_code", "reg_code", "dist_code"]:
    tz["nbs_" + c] = j[c].values
S["in_nbs_ward_polygon"] = int(tz.nbs_ward_name.notna().sum()); S["not_in_any_nbs_ward"] = int(tz.nbs_ward_name.isna().sum())
norm = lambda s: s.fillna("").astype(str).str.lower().str.replace(r"[^a-z]", "", regex=True)
reg_wp = norm(tz["#clean_adm1"]).replace({"coastregion": "coast"}); reg_nbs = norm(tz["nbs_reg_name"]).replace({"pwani": "coast"})
tz["region_match"] = (reg_wp == reg_nbs) & tz.nbs_reg_name.notna()
S["region_name_matches_nbs"] = int(tz.region_match.sum())
S["region_name_mismatch_or_unmatched"] = int((~tz.region_match).sum())
S["clean_adm1_unique_raw"] = int(tz["#clean_adm1"].nunique())
valid_regions = set(w.reg_name.str.lower()) | {"coast region", "pwani"}
S["clean_adm1_values_not_a_region_name"] = tz.loc[~tz["#clean_adm1"].str.lower().isin(valid_regions), "#clean_adm1"].value_counts().head(15).to_dict()
S["n_points_with_nonregion_adm1"] = int((~tz["#clean_adm1"].str.lower().isin(valid_regions)).sum())
mm = tz[(~tz.region_match) & tz.nbs_reg_name.notna()]
S["region_mismatch_top_pairs"] = {f"{a} -> {b}": int(n) for (a, b), n in mm.groupby(["#clean_adm1", "nbs_reg_name"]).size().sort_values(ascending=False).head(12).items()}
a2 = norm(tz["#clean_adm2"]); b2 = norm(tz["nbs_dist_name"])
tz["district_match"] = [bool(y) and bool(x) and (x == y or x in y or y in x) for x, y in zip(a2, b2)]
S["district_name_matches_nbs_loose"] = int(tz.district_match.sum())
S["wpdx_adm2_unique"] = int(tz["#clean_adm2"].nunique()); S["nbs_districts_hit"] = int(tz.nbs_dist_name.nunique())
S["nbs_wards_hit"] = int(tz[["nbs_reg_code", "nbs_dist_code", "nbs_ward_code"]].dropna().drop_duplicates().shape[0])
S["zanzibar_points"] = int(tz.nbs_reg_name.isin(["Kaskazini Unguja", "Kusini Unguja", "Mjini Magharibi", "Kaskazini Pemba", "Kusini Pemba", "Kusini Unguja "]).sum())
S["nbs_region_counts"] = {str(k): int(v) for k, v in tz.nbs_reg_name.value_counts(dropna=False).items()}
# ---- duplicates / proximity (metric CRS)
xy = np.c_[utm.geometry.x, utm.geometry.y]; tree = cKDTree(xy)
d, i = tree.query(xy, k=2); tz["nn_dist_m"] = d[:, 1]
S["exact_coord_duplicates"] = int(tz.duplicated(["lat", "lon"], keep=False).sum()); S["wpdx_id_duplicates"] = int(tz["#wpdx_id"].duplicated().sum())
for m in (1, 10, 25, 50):
    S[f"nn_within_{m}m"] = int((tz.nn_dist_m <= m).sum())
S["is_duplicate_flag_true"] = int(tz.is_duplicate.notna().sum())
S["nn_dist_quantiles_m"] = {str(q): float(tz.nn_dist_m.quantile(q)) for q in (.05, .25, .5, .75, .95)}
for r in (500, 1000, 5000):
    tz[f"n_wp_within_{r}m"] = [len(x) - 1 for x in tree.query_ball_point(xy, r)]
S["neighbors_within_1km_median"] = float(tz.n_wp_within_1000m.median()); S["neighbors_within_1km_zero_share"] = float((tz.n_wp_within_1000m == 0).mean())
tz["is_functional_now"] = tz["#status_id"].eq("Yes")
func_idx = np.where(tz.is_functional_now.values)[0]; ft = cKDTree(xy[func_idx])
dd, ii = ft.query(xy, k=2); same = func_idx[ii[:, 0]] == np.arange(len(tz))
tz["dist_nearest_functional_other_m"] = np.where(same, dd[:, 1], dd[:, 0])
S["nearest_functional_other_km_quantiles"] = {str(q): float(tz.dist_nearest_functional_other_m.quantile(q) / 1000) for q in (.25, .5, .75, .95)}
# ---- status / target candidates
S["status_id_counts"] = tz["#status_id"].value_counts().to_dict(); S["status_clean_counts"] = tz["#status_clean"].value_counts().to_dict()
S["dry_season_nonfunctional"] = int((tz["#status_clean"] == "Non-Functional, dry season").sum())
S["status_by_dataset"] = {k: {a: int(b) for a, b in v.items() if b} for k, v in pd.crosstab(tz["dataset_title"], tz["#status_clean"]).to_dict("index").items()}
S["functional_rate_by_report_year"] = {int(y): round(float(v), 3) for y, v in tz.groupby(tz.report_dt.dt.year)["#status_id"].apply(lambda s: (s == "Yes").mean()).items()}
tz["is_functional"] = tz["#status_id"].eq("Yes").astype(int)
S["functional_rate"] = float(tz.is_functional.mean())
S["status_id_vs_status_clean"] = {k: {a: int(b) for a, b in v.items() if b} for k, v in pd.crosstab(tz["#status_id"], tz["#status_clean"]).to_dict("index").items()}
# ---- rehab / age / history
S["rehab_year_nonnull"] = int(tz["#rehab_year"].notna().sum()); S["rehabilitator_nonnull"] = int(tz["#rehabilitator"].notna().sum())
S["install_year_min_max"] = [float(tz.install_year_n.min()), float(tz.install_year_n.max())]
S["install_year_after_report_year"] = int((tz.install_year_n > tz.report_dt.dt.year).sum())
tz["age_at_report"] = tz.report_dt.dt.year - tz.install_year_n
S["age_at_report_negative"] = int((tz.age_at_report < 0).sum())
S["age_quantiles"] = {str(q): float(tz.age_at_report.quantile(q)) for q in (.05, .25, .5, .75, .95)}
h = tz["water_point_history"].map(lambda s: json.loads(s) if isinstance(s, str) else {})
tz["n_hist_obs"] = h.map(len)
S["history_obs_counts"] = {int(k): int(v) for k, v in tz.n_hist_obs.value_counts().sort_index().items()}
multi = tz[tz.n_hist_obs > 1]
S["multi_obs_points"] = int(len(multi)); S["multi_obs_sources"] = multi["#source"].value_counts().to_dict()
seqs = multi["water_point_history"].map(lambda s: "->".join(str(v.get("status_id")) for k, v in sorted(json.loads(s).items())))
S["multi_obs_status_sequences"] = seqs.value_counts().to_dict()
S["multi_obs_example_dates"] = [sorted(json.loads(s).keys()) for s in multi["water_point_history"].head(4)]
S["single_obs_with_history_report_dates_all_same_as_report_date"] = True
# ---- notes mining
nt = tz["#notes"].fillna("").str.lower()
kw = {"broken/breakdown": r"broke|break|vunji|imeharibika|haifanyi|not working|kimeharibika", "dry": r"\bdry\b|kavu|kausha|imekauka|kukauka",
      "repair/rehab": r"repair|rehab|karabati|imetengenezwa|fixed", "pump/spare": r"spare|pump|pampu"}
S["notes_keyword_hits"] = {k: int(nt.str.contains(v, regex=True).sum()) for k, v in kw.items()}
S["notes_nonnull"] = int((tz["#notes"].fillna("") != "").sum()); S["status_raw_nonnull"] = int(tz["#status"].notna().sum())
S["status_raw_top"] = tz["#status"].value_counts().head(8).to_dict()
S["notes_examples"] = tz["#notes"].dropna().sample(8, random_state=3).tolist()
# ---- missingness (only the original 73 columns)
miss = tz[[c for c in src_cols if c in tz.columns]].isna().mean()
S["missingness_pct"] = (miss * 100).round(1).sort_values(ascending=False).to_dict()
S["water_source_counts"] = {str(k): int(v) for k, v in tz["#water_source_clean"].value_counts(dropna=False).items()}
S["water_tech_category_counts"] = {str(k): int(v) for k, v in tz["#water_tech_category"].value_counts(dropna=False).items()}
S["water_tech_clean_counts"] = {str(k): int(v) for k, v in tz["#water_tech_clean"].value_counts(dropna=False).items()}
S["management_counts"] = {str(k): int(v) for k, v in tz["#management_clean"].value_counts(dropna=False).items()}
S["pay_counts"] = {str(k): int(v) for k, v in tz["#pay_clean"].value_counts(dropna=False).items()}
S["installer_top"] = tz["#installer"].value_counts().head(8).to_dict(); S["dataset_titles"] = tz["dataset_title"].value_counts().to_dict(); S["sources"] = tz["#source"].value_counts().to_dict()
S["wpdx_plus_derived_quantiles"] = {c: {str(q): float(tz[c + "_n"].quantile(q)) for q in (.05, .5, .95)} for c in
    ["distance_to_primary_road", "distance_to_secondary_road", "distance_to_tertiary_road", "distance_to_city", "distance_to_town", "local_population_1km", "water_point_population", "crucialness_score", "pressure_score"]}
S["rehab_priority_nonnull"] = int(tz.rehab_priority_n.notna().sum())
S["rehab_priority_nonnull_share_by_status_id"] = {k: round(float(v), 3) for k, v in tz.groupby("#status_id").rehab_priority_n.apply(lambda s: s.notna().mean()).items()}
S["is_urban_true"] = int((tz.is_urban.astype(str).str.lower() == "true").sum())
# ---- save
tz.drop(columns=["water_point_history"]).to_parquet("data/interim/wpdx_tanzania_typed.parquet", index=False)
json.dump(S, open("data/interim/audit_stats.json", "w"), indent=1, default=str)
print("audit done", len(tz))
