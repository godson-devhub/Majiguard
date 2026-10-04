# MajiGuard AI database schema design (Step 8.5)

## Scope and evidence

This is a schema definition only. The PostgreSQL database remains unpopulated: Step 8.6 will perform reviewed ETL. The design is based on inspection of `data/processed/majiguard_master_v0.parquet` (17,518 rows, 71 columns) and the frozen prediction, impact, and consequence outputs. The CSV has 70 columns and omits `status_raw_text`; Parquet is the authoritative processed artifact for schema inspection.

The inspected identifiers are all non-null and unique in the Parquet file: `master_id`, `wpdx_id`, and `row_id_export`. They are retained as source identifiers, while the database uses an internal integer primary key for stable application joins. The current row-level processed artifact has no duplicate identifiers. `wpdx_is_duplicate_flag` is preserved as a nullable source field; it is not used to discard records.

## Tables

### `water_points`

One processed source observation/application record, including stable source identity, historical observation values, location, administrative context, and derived model-context features. `observed_status` is historical/source status only; it is never the current predicted status.

Primary key: `id` (integer identity).

Unique constraints: `master_id`, `wpdx_id`, and `row_id_export` are each unique because all three were unique in the inspected artifact. This is a constraint on this processed snapshot, not an assertion that all future WPDx exports have identical identity semantics.

Important groups of columns:

- Identity/provenance: `master_id`, `wpdx_id`, `row_id_export`, `source_dataset_title`, `source_org`.
- Historical observation: `survey_date`, `survey_year`, `survey_month`, `observed_status`, `observed_status_id`, `status_raw_text`, functional labels, water source/technology, management, payment, installer, age, usage, and subjective quality.
- Map/admin: nullable `latitude`, `longitude`, Tanzania/boundary flags, NBS/WPDx region/district/ward fields.
- Derived context: nearby-water-point counts/distances, road/city/town distances, local population fields, rainfall/climate, WorldPop, health-facility and school distances. These are stored once on the source/feature snapshot rather than duplicated in every result table.

The inspected Parquet artifact currently has valid coordinates for all 17,518 rows, but coordinates are nullable in the schema to preserve historical records and support future source data with missing coordinates. Check constraints prevent non-null invalid ranges. The coordinate pair index supports map bounding/filter queries; rows with NULL coordinates remain identifiable but are not mappable.

### `prediction_results`

A versioned prediction run for a water point. It is one-to-many from `water_points` so future model runs can be retained rather than overwritten.

Stores the frozen output semantics: `probability_non_functional` is an uncalibrated model output, `probability_functional`, `predicted_status`, `decision_threshold`, `risk_band`, `risk_band_note`, `prediction_methodology_version`, and `computed_at`.

### `impact_results`

A versioned impact assessment run. It stores `impact_available`, nullable `impact_score`, `population_component`, `alternative_scarcity_component`, an unavailable reason, `impact_methodology_version`, and `computed_at`. Impact is a relative, unitless proxy; it is not people affected, a probability, a measured consequence, or an arbitrary low/medium/high band.

### `consequence_results`

A versioned Step 7 Layer 1 consequence-priority result. It stores the risk and impact snapshot used by the calculation, availability flags, `risk_impact_index` and its note, unavailable reason, `consequence_priority_methodology_version`, and `computed_at`. The risk-impact index remains a relative consequence signal and is not called maintenance priority, expected loss, affected population, or failure probability. No maintenance-priority field or band is introduced.

## Relationships and result history

`water_points.id` is referenced by each result table with `ON DELETE CASCADE`. Each result table is one-to-many from a water point because repeated model/methodology runs must be auditable. No result table is forced to be one-to-one, and results are not mixed into the identity table.

## Types, nullability, and constraints

Identifiers are bounded text because the source identifiers are strings. Dates use `DATE`; computed times use timezone-aware `TIMESTAMP`. Numeric source features and scores use floating-point values for this analytical MVP; future financial/accounting quantities are outside scope. Missing values remain NULL. Boolean availability flags distinguish unavailable results from a numeric zero. Probability and threshold checks constrain non-null values to [0, 1]. Coordinates have geographic range checks.

No fake zero is used for missing population, coordinates, impact, prediction, or result components. `*_unavailable_reason` and availability flags provide explicit missing-result context.

## Indexes

- Coordinate pair index on `water_points(latitude, longitude)` for map filtering.
- `nbs_region` for regional filtering.
- `observed_status` for historical-status filtering.
- Result predicted status, risk band, and non-functional probability for dashboard/API filters.
- Impact score and risk-impact index for ranking/filtering.

Source identifiers are protected by unique constraints (and their backing indexes). No index is added to every feature column.

## Versioning and provenance

`prediction_methodology_version`, `impact_methodology_version`, and `consequence_priority_methodology_version` are explicit on results. The currently approved values are `v1_random_forest`, `impact_v1`, and `consequence_priority_v1`; the schema does not invent new methodology versions. `computed_at` records result time. Source identifiers and source fields stay on `water_points` and are not duplicated wholesale into result tables.

The 42 model inputs are not blindly duplicated into prediction rows. The inspected processed artifact already contains source and derived context features on the water-point snapshot, preserving traceability without creating a second copy of the entire feature vector. Result tables retain methodology outputs and versions.

## Migration and current database state

This document and ORM models define the next schema only. No new migration is applied in Step 8.5. The existing empty Alembic baseline remains intact. Autogeneration should detect the four proposed application tables and their indexes/constraints, while PostgreSQL should continue to contain only `alembic_version` until schema approval and the later migration step.

## Explicitly outside this schema

No PostGIS extension, application users/authentication, operational feasibility, scheduling, crew assignment, routing, budget optimization, retraining, recalibration, API business endpoints, or frontend-specific tables are introduced. No dataset import occurs in Step 8.5.
