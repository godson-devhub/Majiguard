# MajiGuard AI — data folder

```
data/
  raw/          original downloads (never edited): water_points/ climate/ population/ geographic/
  interim/      derived intermediate files, audit statistics (JSON), parsed NBS ward populations
  processed/    majiguard_master_v0.parquet / .csv  (prototype master dataset, 17,518 x 71)
  metadata/     data_sources.csv, data_dictionary.csv, DATA_DOWNLOAD_INSTRUCTIONS.md, raw_file_checksums.csv
  reports/      FINAL_SUMMARY.md and the six research/audit reports
../scripts/     00–08 reproducible pipeline scripts (run in numeric order)
```
Start with `reports/FINAL_SUMMARY.md`. Important: the status label in the supplied WPdx+ file is internally inconsistent and statuses date from 2004–2009 — read `reports/target_definition.md` before modelling.
