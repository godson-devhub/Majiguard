"""Filter the Tanzania rows out of the global WPdx+ export (raw file is read-only; nothing is modified).
Output: data/interim/_tz_raw_str.pkl (all columns as strings) used by 02_audit_waterpoints.py"""
import sys, pandas as pd
SRC = "data/raw/water_points/WPdx_Plus_global_export_20260912.csv"
OUT = sys.argv[1] if len(sys.argv) > 1 else "data/interim/_tz_raw_str.pkl"
keep, n = [], 0
for ch in pd.read_csv(SRC, chunksize=100000, dtype=str, low_memory=False):
    n += len(ch)
    keep.append(ch[(ch["#clean_country_id"] == "TZA") | ch["#clean_country_name"].fillna("").str.contains("Tanzania", case=False) | ch["#country_name"].fillna("").str.contains("Tanzania", case=False)])
tz = pd.concat(keep)
print("rows in global file:", n, "| Tanzania rows:", len(tz))
tz.to_pickle(OUT)
