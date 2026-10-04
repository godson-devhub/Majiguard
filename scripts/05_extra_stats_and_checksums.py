import pandas as pd, numpy as np, hashlib, os, json, glob
import geopandas as gpd
tz = pd.read_parquet("data/interim/wpdx_tanzania_typed.parquet")
m = lambda s: s.fillna("").astype(str).str.lower().str.replace(r"[^a-z]", "", regex=True).replace({"coastregion": "coast", "pwani": "coast"})
rm = (m(tz["#clean_adm1"]) == m(tz["nbs_reg_name"])) & tz.nbs_reg_name.notna()
out = {}
out["region_match_corrected"] = int(rm.sum())
out["region_true_conflicts"] = int((~rm & tz.nbs_reg_name.notna()).sum())
out["unmatched_to_ward"] = int(tz.nbs_reg_name.isna().sum())
out["conflict_pairs"] = {f"{a} -> {b}": int(n) for (a, b), n in tz[~rm & tz.nbs_reg_name.notna()].groupby(["#clean_adm1", "nbs_reg_name"]).size().sort_values(ascending=False).head(8).items()}
sc = tz["#status_clean"]
f = sc.isin(["Functional", "Functional, needs repair", "Functional, not in use"]); n = sc.isin(["Non-Functional", "Non-Functional, dry season", "Abandoned/Decommissioned"])
out["labelled"] = int((f | n).sum()); out["functional"] = int(f.sum()); out["nonfunctional"] = int(n.sum()); out["nonfunc_share"] = round(float(n.sum() / (f | n).sum()), 3)
dis = ((f & (tz["#status_id"] == "No")) | (n & (tz["#status_id"] == "Yes"))).sum()
out["status_id_vs_clean_disagree_n"] = int(dis); out["status_id_vs_clean_disagree_share"] = round(float(dis / (f | n).sum()), 3)
out["nn_le_10m_flagged_duplicate"] = int(((tz.nn_dist_m <= 10) & tz.is_duplicate.notna()).sum()); out["nn_le_10m"] = int((tz.nn_dist_m <= 10).sum())
w = gpd.read_file("data/raw/geographic/nbs_tz_2022_wards/extracted/TANZANIA_2022PHC_WARDS_SHAPEFILES.shp")
out["nbs_regions"] = int(w.reg_name.nunique()); out["nbs_districts"] = int(w[["reg_code", "dist_code"]].drop_duplicates().shape[0]); out["nbs_wards"] = int(len(w))
out["nbs_region_names"] = sorted(w.reg_name.unique().tolist())
json.dump(out, open("data/interim/extra_stats.json", "w"), indent=1)
print(json.dumps(out, indent=1))
rows = []
for p in sorted(glob.glob("data/raw/**/*.*", recursive=True)):
    if os.path.isfile(p) and "extracted" not in p:
        sz = os.path.getsize(p)
        h = hashlib.sha256(open(p, "rb").read()).hexdigest() if sz < 700e6 else "skipped"
        rows.append((p.replace(os.sep, "/"), sz, h))
df = pd.DataFrame(rows, columns=["file", "bytes", "sha256"])
df.to_csv("data/metadata/raw_file_checksums.csv", index=False)
print(df.assign(mb=(df.bytes / 1e6).round(2))[["file", "mb"]].to_string())
