import pandas as pd, json
m = pd.read_parquet("data/processed/majiguard_master_v0.parquet")
out = {}
lab = m.label_functional_status_clean
out["labelled"] = int(lab.notna().sum())
agree = lab.notna() & (lab == m.label_functional_status_id)
out["agree_rows"] = int(agree.sum())
out["agree_functional"] = int((agree & (lab == 1)).sum()); out["agree_nonfunctional"] = int((agree & (lab == 0)).sum())
out["agree_by_dataset"] = {k: int(v) for k, v in m[agree].groupby("source_dataset_title").size().items()}
out["nonfunc_share_agree"] = round(float((m[agree].label_functional_status_clean == 0).mean()), 3)
out["nonfunc_share_by_source_all_labelled"] = {k: round(float(1 - v), 3) for k, v in m[lab.notna()].groupby("source_org").label_functional_status_clean.mean().items()}
out["n_by_source_org"] = {k: int(v) for k, v in m[lab.notna()].groupby("source_org").size().items()}
yr = m.survey_year
out["rows_2010_plus"] = int((yr >= 2010).sum()); out["rows_2013_plus"] = int((yr >= 2013).sum())
out["seasonal_dry_class"] = int((m.status_clean == "Non-Functional, dry season").sum())
out["needs_repair_class"] = int((m.status_clean == "Functional, needs repair").sum())
out["needs_repair_by_dataset"] = {k: int(v) for k, v in m[m.status_clean == "Functional, needs repair"].groupby("source_dataset_title").size().items()}
json.dump(out, open("data/interim/label_counts.json", "w"), indent=1)
print(json.dumps(out, indent=1))
