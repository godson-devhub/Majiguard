# MajiGuard AI Step 8.6 data import

## Source comparison and authority

The source artifacts were compared before import:

- `data/processed/majiguard_master_v0.parquet`: 17,518 rows, 71 columns
- `data/processed/majiguard_master_v0.csv`: 17,518 rows, 70 columns

All three identifiers (`master_id`, `wpdx_id`, `row_id_export`) are set-equal, order-equal, non-null, and unique in both artifacts. Common status fields (`status_clean`, `status_id`, and `label_functional_status_id`) match row-for-row and by identifier. `label_functional_status_clean` has the same values with a serialization difference (`0.0`/`1.0` in CSV versus `0`/`1` in Parquet), and the same 44 missing values. The only column mismatch is the legitimate Parquet-only `status_raw_text`, which contains 89 NULLs and is represented by the approved `water_points.status_raw_text` field.

Parquet was therefore selected as the authoritative import source: it is the complete processed serialization of the same 17,518 logical records and preserves the additional legitimate source field. Neither source file was modified. CSV remains unchanged and is retained as a cross-check artifact.

## Migration and destination

The approved Alembic migration `ef160622e343_create_application_schema.py` was generated from the ORM metadata and applied from revision `20260929_0001`. The destination was `water_points`. No ad-hoc SQL schema was used, and no downgrade/reset/drop operation was performed.

## Mapping and conversion

The importer is `backend/scripts/import_existing_data.py`. It uses an explicit source-to-ORM mapping. Name differences are mapped deliberately, including `status_clean` to `observed_status`, `status_id` to `observed_status_id`, `label_functional_status_clean` to `label_functional_status`, and the WPDx `_LEAKY` fields to the approved lowercase ORM names. `status_raw_text` maps directly. All 71 Parquet columns mapped to approved `water_points` fields; no source columns were silently excluded.

The import preserves NULL as SQL NULL, validates source identifiers and coordinates, converts Parquet dates to `DATE`, converts string booleans (`true`/`false`) to booleans where needed, and uses SQLAlchemy bulk insertion in one transaction. An idempotency guard refuses to insert if `water_points` is already non-empty.

## Validation and result policy

Source validation confirmed 17,518 rows, 71 Parquet columns, 70 CSV columns, matching identifiers, no duplicate source rows, and valid coordinate ranges. Representative first, middle, and last records matched PostgreSQL for identifiers, coordinates, observed status, survey date, water source, rainfall, WorldPop, and accessibility values. Database NULL handling was preserved; `status_raw_text` has 89 NULL rows as in Parquet.

No prediction, impact, or consequence results were generated. These tables remain empty pending later verified ML integration.

Import timestamp: 2026-09-29. Import duration: approximately 3.606 seconds.

## Final counts

```text
water_points              17,518
prediction_results             0
impact_results                 0
consequence_results            0
```

PostgreSQL also retains `alembic_version` as migration bookkeeping. No ML methodology, model artifact, training data, frontend, or frozen source dataset was changed.
