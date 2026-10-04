# MajiGuard AI — Manual data download instructions

Everything not listed here was downloaded automatically (see `data_sources.csv`, `raw_file_checksums.csv`). Never overwrite files in `data/raw/`; save new downloads under a new file name.

## 1. ERA5-Land (temperature, soil moisture) — needs your Copernicus account

* Official page: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-land-monthly-means (dataset id `reanalysis-era5-land-monthly-means`)
* Format: NetCDF (or GRIB). Expected size for the request below: a few MB (monthly, Tanzania box).
* Steps
  1. Create a free account at https://cds.climate.copernicus.eu/ and accept the dataset licence on the dataset page ("Download" tab).
  2. Copy your API key (profile page) and create `C:\Users\<you>\.cdsapirc`:
     ```
     url: https://cds.climate.copernicus.eu/api
     key: <YOUR-PERSONAL-ACCESS-TOKEN>
     ```
  3. `python -m pip install "cdsapi"` and run:
     ```python
     import cdsapi
     c = cdsapi.Client()
     c.retrieve("reanalysis-era5-land-monthly-means", {
         "product_type": "monthly_averaged_reanalysis",
         "variable": ["2m_temperature", "volumetric_soil_water_layer_1", "volumetric_soil_water_layer_2"],
         "year": [str(y) for y in range(2003, 2011)],           # survey years + 12-month look-back; add recent years for the dashboard
         "month": [f"{m:02d}" for m in range(1, 13)],
         "time": "00:00",
         "area": [-0.5, 29.0, -12.0, 41.0],                    # N, W, S, E  (Tanzania + margin)
         "data_format": "netcdf",
     }, "data/raw/climate/era5land_monthly_TZA_2003-2010.nc")
     ```
     (The web form gives the same request; if the API rejects a parameter name, use "Show API request" on the CDS page — names change between CDS releases.)
* Restrict to Tanzania: `area` above (do not request the globe).
* Connection to water points: `xarray.open_dataset(...).sel(latitude=lat, longitude=lon, method="nearest")` at each point for the 3 months before the survey month; same window logic as CHIRPS (`03_extract_features.py`).

## 2. Tanzania Meteorological Authority (TMA) station data — request only

* Official site https://www.meteo.go.tz/ ; library https://portal.meteo.go.tz/portal/library_home (restricted content requires sign-in).
* Contact printed on the portal: **met@meteo.go.tz**, +255 26 2962610; TMA, Dodoma (P.O. Box 27).
* Send a formal letter/email (attach the hackathon/e-GA context): request **monthly (preferably daily) rainfall and temperature** for stations in Dodoma, Singida, Tabora, Kagera, Njombe, Simiyu, Mwanza, Arusha, Ruvuma, Morogoro, Pwani (the regions that contain your water points), period 1990–present, with station metadata (ID, name, lat/lon, elevation). Ask about licence/fees.
* Use: validation of CHIRPS at nearby stations, not a replacement.

## 3. NBS census 2022 microdata (optional)

* https://microdata.nbs.go.tz/index.php/catalog/45 → "Get Microdata" → accept the confidentiality declaration (statistical/scientific use only; no redistribution without NBS written approval).
* Expected: anonymised household/individual files. Not required for the first prototype.
* Other census volumes (e.g. Zanzibar/other administrative-unit tables): browse https://www.nbs.go.tz/index.php/statistics/subtopic/administrative-reports and download any additional "Administrative Units Population Distribution" volumes to `data/raw/population/nbs_census2022/`.

## 4. Village-level boundaries / population (only by request)

* NBS states shapefiles below ward level are available by formal request: sg@nbs.go.tz, +255 26 2963822 (P.O. Box 2683, Dodoma). Include: purpose, geographic scope (your ward list), agreement to NBS terms.

## 5. OpenStreetMap roads (optional — only if you replace WPdx+ road distances)

* Geofabrik: https://download.geofabrik.de/africa/tanzania-latest.osm.pbf (705,783,873 bytes on 2026-09-20; ODbL). Alternatively HDX "Roads of Tanzania" https://data.humdata.org/dataset/hotosm_tza_roads (GeoPackage ≈ 619 MB).
* Use: `pyogrio`/`geopandas` to read the `lines` layer, filter `highway` classes, project to EPSG:32736 and compute nearest-line distance (`scipy` / `shapely.STRtree`). Keep the download date and snapshot in `data_sources.csv`.

## 6. CHIRPS daily (optional)

* https://data.chc.ucsb.edu/products/CHIRPS/v3.0/daily/final/ (COG/GeoTIFF; folders are by year/subset — inspect the directory listing). Read only the Tanzania window (`rasterio` with `/vsicurl/`, as in `scripts/01_download_chirps_tz.py`). Needed only for dry-spell length / rainy-day counts.

## 7. Refreshing WPdx (when new water-point records appear)

* https://data.waterpointdata.org/dataset/Water-Point-Data-Exchange-Plus-WPDx-/eqje-vguj/data → Export → CSV, or API: `https://data.waterpointdata.org/resource/eqje-vguj.csv?$where=clean_country_name='Tanzania'&$limit=50000`. Save as a new dated file in `data/raw/water_points/`.

## 8. Ground-truth status (Track C, most important)

See `data/reports/target_definition.md` §3. Ask the Ministry of Water / RUWASA / district water engineers for a current water-point inventory with functionality and maintenance/breakdown records, or plan a re-survey of a sample of the existing WPdx points (coordinates are already known).
