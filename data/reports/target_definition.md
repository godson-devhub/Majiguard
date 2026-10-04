# MajiGuard AI — Target Variable Definition

Numbers: `data/interim/audit_stats.json`, `data/interim/label_counts.json`, `data/interim/feature_stats.json`. **No model has been trained; nothing below is a model result.**

## 1. Can the current data support future-disruption prediction? — **No.**

| Test | Result |
|---|---|
| Observations per water point | 17,489 points have **1** observation, 28 have 2, 1 has 3 (`water_point_history`). Only **29 points (0.17%)** were seen more than once, and the repeats are days-to-months apart in 2019–2020 (status sequences Yes→Yes 24, No→Yes 2, No→No 2, Yes→Yes→Yes 1). |
| Time span of statuses | 99.1% reported 2004–2009; only 129 rows (0.7%) are from 2010 or later. There is no panel over time. |
| Failure/breakdown dates | None. `#rehab_year` and `#rehabilitator` are 100% empty; notes are place names (0 breakdown/repair keywords); raw `#status` is a water-quantity remark. |
| Maintenance records | None in WPdx. |

A defensible *future* target needs (a) the same water point observed at ≥2 dates, (b) a definable event ("was functional at t₀, non-functional at t₁ ≤ t₀+H"), (c) enough events. The data contain none of these. **We must not claim to predict future failure from this data.**

## 2. Can it support "current risk" classification? — **Only conditionally, and only as a proxy.**

What the data *does* contain is one cross-sectional status per point, observed in 2004–2009. A classifier can learn *which observable characteristics (technology, management, age, climate at survey time, context) were associated with non-functional status in those surveys*. That is an **association-based risk proxy**, valid for the survey population and period, and it would have to be *transferred* to 2026 conditions.

Serious limitations of the label (details in `water_point_data_audit.md` §6):

* `#status_id` and `#status_clean` disagree on **6,871 of 17,474 labelled points (39.3%)**.
* The same raw status text maps to opposite clean classes (e.g. "Enough Water Quantity" → Non-Functional for 4,561 rows).
* Non-functional share by data owner varies from ~1% (Ongawa) and 0% (Mwanza, 19 rows) to 69–96% (ISF 69%, WaterAid 81%, Concern 82%, SNV 89%, AMREF 96%). The label's meaning differs by source; `#source` and the region are confounded with the label.
* Statuses are 17–21 years old.

## 3. Recommended target strategy (in order of defensibility)

**Track A — Transparent "Priority Index" (no supervised claim), usable now.** Priority = f(risk indicators, community impact): risk indicators from observable vulnerability (age, technology, management/payment, climate stress such as low `rain_12m_z` or many dry months, remote location) and impact from population within 1–2 km, number of nearby alternatives, proximity of schools/health facilities. Weights are set with water-sector experts and documented; the index is *decision support*, not a validated failure probability. This can power the dashboard immediately and stays honest.

**Track B — Supervised prototype: "status classification proxy" (allowed, must be labelled as such).**
* Label (primary) `y_nonfunctional`: 1 = `Non-Functional`, `Non-Functional, dry season`, `Abandoned/Decommissioned`; 0 = `Functional`, `Functional, needs repair`, `Functional, not in use`; drop `Others` (44). 17,474 labelled rows (functional 3,369; non-functional 14,105).
* **Label-quality control:** run every experiment on (i) all labelled rows and (ii) the **agreement subset** (`status_id` and `status_clean` agree): **10,603 rows** (functional 3,190; non-functional 7,413; 69.9% non-functional; 10,064 come from the 2005–2008 multi-source dataset, 352 Ongawa, 187 reingestion). If results differ materially, the label — not the model — is the problem.
* Secondary labels (later): 3-class {functional, functional-needs-repair (only 375 rows; 310 from Ongawa), non-functional}; **`seasonal_failure`** = `Non-Functional, dry season` (5,137 rows) as a *climate-sensitive* target — the most relevant class for a climate-aware system, but its definition must first be reconciled with the raw text.
* Name the output "**risk score (proxy)**"; never "probability of failure in the next N months".

**Track C — Obtain a real target (needed for a credible system).** Ask the Ministry of Water / RUWASA / district water engineers whether a current national water-point inventory with functionality status and maintenance/breakdown logs exists and can be shared (this is a *request to make*, I did not find such a public dataset); alternatives: re-survey a sample of the same points (the points already have coordinates and `#wpdx_id`) to obtain a second observation (t₁ ≈ 2026) — this alone would create a genuine 20-year transition dataset for a few thousand points; or obtain the original NGO survey files (WaterAid/SNV/AMREF/Concern) to rebuild the functionality field.

## 4. Splits

**Time-based split is not possible with current data** (single time slice). If Track C provides repeated observations:
* Order observations by date; train on transitions observed before T, validate on the next period, test on the last period — never randomly shuffle points that appear in more than one transition.
* Event = functional at t₀ and non-functional at t₁ within horizon H (e.g. 12 months); censor otherwise; features only from information available at t₀ (rainfall windows ending before t₀).

**For Track B** (cross-sectional):
* **Spatial group cross-validation:** `GroupKFold` grouped by NBS ward (primary) or district; hold out whole districts/regions to test geographic transfer (nearby points are strongly correlated; random splits will inflate scores).
* **Leave-one-source-out / leave-one-dataset-out** to test whether the model learns the *source's labelling convention* instead of physics/climate.
* Nested train/validation/test: e.g. test = 3–4 districts never used in tuning; validation via group folds inside train.
* Report calibration, PR-AUC and recall at fixed precision; class prior differs by source.

## 5. Leakage rules (enforced in the feature list)

Exclude from features: `#status*`, `status_clean/id/raw`, `rehab_priority`, `#pop_who_would_gain_access`, `crucialness_score`, `pressure_score`, `water_point_population` (computed from functional neighbours), `dist_nearest_functional_other_m`, `days_since_report`, `staleness_score`, `converted`, collection-artefact columns, and `#source`/dataset (except for validation splits). Neighbour **counts over all points** are allowed; neighbour **status** is not.
