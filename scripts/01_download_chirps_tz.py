"""Download CHIRPS v3.0 MONTHLY rainfall (Africa subset) for 1981-01 .. latest, reading ONLY the Tanzania window
via HTTP range requests (rasterio /vsicurl) and stacking to one GeoTIFF (1 band per month). Source values are unchanged.
Source: https://data.chc.ucsb.edu/products/CHIRPS/v3.0/monthly/africa/tifs/  (CC BY 4.0, DOI 10.15780/G2JQ0P)"""
import re, sys, json, datetime, requests, numpy as np, rasterio
from rasterio.windows import from_bounds
from rasterio.transform import from_origin
from concurrent.futures import ThreadPoolExecutor
BASE = "https://data.chc.ucsb.edu/products/CHIRPS/v3.0/monthly/africa/tifs"
BBOX = (29.0, -12.0, 41.0, -0.5)   # Tanzania (29.34-40.45E, 11.76-0.98S) + 0.25-0.5 deg margin
OUT = "data/raw/climate/chirps_v3_monthly_TZA/chirps-v3.0_monthly_TZA_clip_1981-2026.tif"
idx = requests.get(BASE + "/", timeout=60).text
names = sorted(set(re.findall(r"chirps-v3\.0\.(\d{4})\.(\d{2})\.tif", idx)))
print(len(names), "monthly files on server:", names[0], "->", names[-1])
def read(ym):
    y, m = ym
    for attempt in range(4):
        try:
            with rasterio.open(f"/vsicurl/{BASE}/chirps-v3.0.{y}.{m}.tif") as r:
                w = from_bounds(*BBOX, transform=r.transform).round_offsets().round_lengths()
                a = r.read(1, window=w); t = r.window_transform(w)
                return ym, a, t, r.nodata
        except Exception as e:
            err = e
    raise RuntimeError(f"{ym}: {err}")
res = {}
with ThreadPoolExecutor(8) as ex:
    for k, (ym, a, t, nd) in enumerate(ex.map(read, names)):
        res[ym] = (a, t, nd)
        if k % 60 == 0: print("read", k, ym, a.shape, flush=True)
keys = sorted(res); a0, t0, nd = res[keys[0]]
stack = np.stack([res[k][0] for k in keys]).astype("float32")
print("stack", stack.shape, "nodata", nd, "min/max", float(np.nanmin(stack)), float(np.nanmax(stack)))
prof = dict(driver="GTiff", height=stack.shape[1], width=stack.shape[2], count=stack.shape[0], dtype="float32", crs="EPSG:4326", transform=t0, nodata=-9999.0, compress="lzw")
with rasterio.open(OUT, "w", **prof) as dst:
    for i, k in enumerate(keys, 1):
        b = stack[i-1].copy(); b[b == (nd if nd is not None else -9999)] = -9999.0
        dst.write(b, i); dst.set_band_description(i, f"{k[0]}-{k[1]}")
json.dump({"source": BASE, "bbox": BBOX, "n_months": len(keys), "first": "-".join(keys[0]), "last": "-".join(keys[-1]),
           "downloaded": str(datetime.date.today()), "units": "mm/month", "note": "clip of original CHIRPS v3.0 monthly Africa tifs; values unchanged"},
          open(OUT.replace(".tif", ".meta.json"), "w"), indent=1)
print("wrote", OUT)
