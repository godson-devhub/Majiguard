# MajiGuard AI — Climate Data Research (Tanzania)

Research date: 2026-09-20 · Scripts: `scripts/01_download_chirps_tz.py`, `scripts/03_extract_features.py` · Stats: `data/interim/feature_stats.json`

## 1. Recommendation

**Prototype climate source = CHIRPS v3.0 monthly rainfall (downloaded).** It is open, Tanzania-covered, 1981–present, consistent with the 2004–2009 survey dates, and needs no account. **ERA5-Land** (temperature, soil moisture) is the recommended second source but requires a free CDS account/API key, so it is documented for manual download. **TMA station data** are not openly downloadable; they are a request-only source.

## 2. Dataset comparison

| Dataset | Provider | Tanzania coverage | Temporal coverage | Spatial resolution | Variables | Format | Access / licence | Status |
|---|---|---|---|---|---|---|---|---|
| **CHIRPS v3.0** | Climate Hazards Center, UC Santa Barbara | Yes (global 60°N–60°S; Africa subset files) | 1981 → near-present; server lists monthly files 1981-01 … **2026-08** (548 files) | 0.05° (~5.5 km) | Precipitation (daily, pentad, dekad, monthly, 2–6-monthly, annual) | GeoTIFF / NetCDF / BIL / COG | Public, https://data.chc.ucsb.edu/products/CHIRPS/v3.0/ ; CC BY 4.0; DOI 10.15780/G2JQ0P | **Downloaded (Tanzania window, monthly)** |
| **ERA5-Land monthly means** | ECMWF / Copernicus C3S | Yes (global) | 1950 → present (2–3-month lag) | 0.1° × 0.1° (native ~9 km) | 2 m temperature, total precipitation, volumetric soil water (4 layers), evaporation types | GRIB (NetCDF option) | Needs **CDS account + API key**; licence shown on the CDS page as CC-BY. Dataset page: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means | **Manual / needs your key** |
| **TMA station data** | Tanzania Meteorological Authority | National station network | Records from 1900s (per TMA library page) but sparse/partly digitised | Point stations | Rainfall, temperature, etc. | Not published as open files | **Restricted / by request** — see §5 | Not available |

Source pages read: https://www.chc.ucsb.edu/data/chirps3 (products, resolution, licence), https://cds.climate.copernicus.eu/ (ERA5-Land), https://portal.meteo.go.tz/portal/library_home and https://www.meteo.go.tz/ (TMA).

## 3. CHIRPS — what was downloaded and why monthly

* Product chosen: `monthly/africa/tifs/chirps-v3.0.YYYY.MM.tif` (Final product; ~4.99 MB per file, 1,600 × 1,500 px, EPSG:4326, LZW).
* To avoid downloading ~2.7 GB of continental files, only the **Tanzania window (29–41°E, 12–0.5°S)** was read with HTTP range requests and stacked into one GeoTIFF with one band per month (230 × 240 px, 548 bands, unit mm/month; values untouched): `data/raw/climate/chirps_v3_monthly_TZA/chirps-v3.0_monthly_TZA_clip_1981-2026.tif` (127 MB) + `.meta.json` (source URL, bbox, date).
* Why monthly and not daily: the label describes a single survey month; monthly totals give annual/recent rainfall and anomalies at a manageable size. **Dry-spell length and rainy-day counts require daily CHIRPS** (`…/v3.0/daily/final/`, files are large). Daily data are recommended *only if* the model shows rainfall matters; until then the proxy `dry_months_prior12_lt30mm` (months <30 mm in the previous 12) is used.
* Note: the download script is reproducible (`scripts/01_download_chirps_tz.py`); the last published month may be provisional.

## 4. How rainfall is attached to a water point (implemented)

CHIRPS is a raster (0.05° cells). For each water point:
1. The cell containing the point's (lon, lat) is found from the raster transform (nearest-cell; 0 points fell on nodata cells).
2. The **survey month** *t* of that point (`#report_date`) defines a time anchor. Windows end in the month **before** the survey (t−1), so the feature never contains rainfall from the same month as the status observation.
3. Features (per point):

| Feature | Definition |
|---|---|
| `rain_3m_prior_mm`, `rain_6m_prior_mm`, `rain_12m_prior_mm` | rainfall total in the 3/6/12 months before the survey month |
| `rain_*_pct_of_normal` | window total ÷ the 1991–2020 mean of the same calendar window at that cell ×100 |
| `rain_*_z` | (window total − 1991–2020 mean)/std — an SPI-like z-score (not the gamma-fitted SPI) |
| `rain_mean_annual_1991_2020_mm` | long-term mean annual rainfall at the cell (climatological normal) |
| `dry_months_prior12_lt30mm` | number of months <30 mm in the preceding 12 (a dry-season/drought proxy) |

Available for 17,517 of 17,518 points (one point was surveyed in 1978, before CHIRPS starts). All 17,517 have valid values.

The same code works for any date, so a future dashboard can compute current rainfall risk from the latest CHIRPS month for *today's* status.

## 5. Tanzania Meteorological Authority (TMA)

* Official: https://www.meteo.go.tz/ ; digital library https://portal.meteo.go.tz/portal/library_home (the library says "Please sign in below to access all the restricted data"; the page does not describe a public data download or fees).
* Contact printed on the portal: **met@meteo.go.tz**, +255 26 2962610, TMA, Dodoma (P.O. Box 27, 41218).
* I found **no open historical station download**. A secondary source (Frontiers in Environmental Science 2022, Dar es Salaam rainfall study) reports that only about 30% of historical data are digitised and many stations have long gaps — treat as reported, not verified by me.
* TMA also runs an agrometeorological database (https://tma.agrometeorology.info/) referenced in search results — access terms not verified.
* **What to do:** send a formal data request to TMA for daily/monthly rainfall and temperature for stations near your study regions (Dodoma, Singida, Kagera, Tabora, Njombe, …). Until then CHIRPS is the prototype substitute; station data would later be used to **bias-check** CHIRPS, not to replace it.

## 6. ERA5-Land — minimum useful variables (not downloaded)

I could not download ERA5-Land because it requires your Copernicus CDS credentials (no `~/.cdsapirc` exists on this machine); no key was fabricated. For the first prototype request only:

| Variable | Use |
|---|---|
| `2m_temperature` (monthly mean; optionally derive monthly max via daily stats) | heat exposure / evaporative demand |
| `volumetric_soil_water_layer_1` and `_2` (0–28 cm) | recent soil moisture / drought |
| `total_evaporation` (optional) | water balance |
| *(skip)* `total_precipitation` | duplicates CHIRPS; keep only to cross-check |

Area: Tanzania bbox `[-0.5, 29.0, -12.0, 41.0]` (N, W, S, E). Period: 2003-01 → 2010-12 (covers the survey years with a 12-month look-back) plus the latest 36 months for the dashboard. Size is small (monthly, ~ 115 × 120 cells). Manual steps are in `data/metadata/DATA_DOWNLOAD_INSTRUCTIONS.md`.

## 7. Limitations
* CHIRPS 0.05° smooths local rainfall; stations are sparse in Tanzania, so the product is partly satellite-derived.
* CHIRPS features are *exposure indicators*, not causes of failure. Exploratory correlations with the current (noisy) label are weak (|Spearman| ≤ 0.12; see `data/interim/feature_stats.json`) and must not be presented as model results.
* Temperature/soil moisture are not yet integrated.
