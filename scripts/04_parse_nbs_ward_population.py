"""Parse ward populations from the official NBS 2022 PHC 'Administrative Units Population Distribution Report (Vol 1a)' PDF,
join them to the NBS 2022 ward shapefile, and compare with WorldPop 2022 zonal sums (validation of the raster)."""
import re, json, warnings
import pymupdf, pandas as pd, numpy as np, geopandas as gpd, rasterio
from rasterio.mask import mask as rmask
warnings.filterwarnings("ignore")
PDF = "data/raw/population/nbs_census2022/Administrative_units_Population_Distribution_Report_Tanzania_volume1a.pdf"
doc = pymupdf.open(PDF)
num = re.compile(r"^\d{1,3}(,\d{3})*$|^\d+$")
rows, council = [], None
title = re.compile(r"Ward,\s*(.+?);\s*2022 PHC", re.S)
for pno in range(len(doc)):
    lines = [l.strip() for l in doc[pno].get_text().split("\n")]
    txt = " ".join(lines)
    m = title.search(txt)
    if not m or "Population Distribution by Sex" not in txt:
        continue
    council = re.sub(r"\s+", " ", m.group(1)).strip()
    i = 0
    L = [l for l in lines if l != ""]
    while i < len(L):
        if re.fullmatch(r"\d{1,3}\.", L[i]) and i + 7 < len(L) and not num.match(L[i + 1]):
            name = L[i + 1]; vals = L[i + 2:i + 8]
            if all(num.match(v.replace(" ", "")) or re.fullmatch(r"\d+\.\d", v) for v in vals):
                rows.append((council, name, int(vals[0].replace(",", "")), int(vals[1].replace(",", "")), int(vals[2].replace(",", "")), int(vals[4].replace(",", "")), pno + 1))
                i += 8; continue
        i += 1
df = pd.DataFrame(rows, columns=["council", "ward", "pop_total", "pop_male", "pop_female", "households", "pdf_page"])
# council-level summary tables (region -> councils) use the same row layout; drop them
is_council_row = df.ward.apply(lambda t: bool(re.search(r"(council|city|municipal|district|region|town)", str(t), flags=re.I)))
print("dropped council-summary rows", int(is_council_row.sum()))
df = df[~is_council_row].reset_index(drop=True)
print("parsed ward rows", len(df), "councils", df.council.nunique(), "sum pop", int(df.pop_total.sum()))
w = gpd.read_file("data/raw/geographic/nbs_tz_2022_wards/extracted/TANZANIA_2022PHC_WARDS_SHAPEFILES.shp")
def ckey(s):
    s = s.lower()
    s = re.sub(r"halmashauri ya (wilaya|mji|manispaa|jiji) ya|halmashauri ya (wilaya|mji|manispaa|jiji)|district council|town council|municipal council|city council|municipal|city", "", s)
    return re.sub(r"[^a-z]", "", s)
wkey = lambda s: re.sub(r"[^a-z]", "", str(s).lower())
df["ck"] = df.council.map(ckey); df["wk"] = df.ward.map(wkey)
w["ck"] = w.counc_name.map(ckey); w["wk"] = w.ward_name.map(wkey)
# some councils in the PDF are named by region ("Dodoma City"): also try dist_name
w["dk"] = w.dist_name.map(ckey)
dd = df.drop_duplicates(["ck", "wk"], keep=False)
j = w.merge(dd[["ck", "wk", "pop_total", "households", "council", "pdf_page"]], on=["ck", "wk"], how="left")
miss = j.pop_total.isna()
j2 = w[miss.values].merge(dd[["ck", "wk", "pop_total", "households", "council", "pdf_page"]].rename(columns={"ck": "dk"}), on=["dk", "wk"], how="left")
j.loc[miss, ["pop_total", "households", "council", "pdf_page"]] = j2[["pop_total", "households", "council", "pdf_page"]].values
j = j.drop_duplicates("OBJECTID_1")
rate = float(j.pop_total.notna().mean())
print("shapefile wards", len(w), "matched", int(j.pop_total.notna().sum()), "rate", round(rate, 3))
# zonal sum of WorldPop 2022 per ward (only matched wards, for the validation)
gj = j[j.pop_total.notna()].copy(); gj["geometry"] = gj.geometry.make_valid()
src = rasterio.open("data/raw/population/worldpop_R2025A_TZA/tza_pop_2022_CN_100m_R2025A_v1.tif")
gj = gj.to_crs(4326)
sums = []
for g in gj.geometry:
    try:
        a, _ = rmask(src, [g.__geo_interface__], crop=True, nodata=0, filled=True); a = a[0]; a[a < 0] = 0; sums.append(float(a.sum()))
    except Exception:
        sums.append(np.nan)
gj["worldpop2022_sum"] = sums
ok = gj.worldpop2022_sum.notna() & (gj.pop_total > 0)
ratio = gj.loc[ok, "worldpop2022_sum"] / gj.loc[ok, "pop_total"]
stats = {"pdf_ward_rows_parsed": int(len(df)), "pdf_councils": int(df.council.nunique()), "pdf_sum_population": int(df.pop_total.sum()),
         "shapefile_wards": int(len(w)), "shapefile_wards_matched_to_pdf": int(j.pop_total.notna().sum()), "match_rate": rate,
         "validation_n": int(ok.sum()), "worldpop_over_census_median": float(ratio.median()), "worldpop_over_census_p10": float(ratio.quantile(.1)), "worldpop_over_census_p90": float(ratio.quantile(.9)),
         "pearson_ward_totals": float(np.corrcoef(gj.loc[ok, "worldpop2022_sum"], gj.loc[ok, "pop_total"])[0, 1]),
         "spearman_ward_totals": float(gj.loc[ok, "worldpop2022_sum"].corr(gj.loc[ok, "pop_total"], method="spearman")),
         "sum_census_matched": float(gj.loc[ok, "pop_total"].sum()), "sum_worldpop_matched": float(gj.loc[ok, "worldpop2022_sum"].sum())}
print(json.dumps(stats, indent=1))
out = j[["reg_code", "reg_name", "dist_code", "dist_name", "counc_name", "ward_code", "ward_name", "pop_total", "households", "council", "pdf_page"]].copy()
out.to_csv("data/interim/nbs_ward_population_2022_parsed.csv", index=False)
df.to_csv("data/interim/nbs_ward_population_2022_pdf_rows.csv", index=False)
json.dump(stats, open("data/interim/nbs_ward_population_stats.json", "w"), indent=1)
