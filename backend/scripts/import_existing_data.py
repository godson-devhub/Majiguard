import csv
import json
import time
from datetime import date
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pyarrow.parquet as pq
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import WaterPoint

root = Path(__file__).resolve().parents[2]
parquet_path = root / 'data' / 'processed' / 'majiguard_master_v0.parquet'
csv_path = root / 'data' / 'processed' / 'majiguard_master_v0.csv'
parquet = pq.ParquetFile(parquet_path)
parquet_cols = parquet.schema_arrow.names
csv_header = next(csv.reader(csv_path.open('r', encoding='utf-8-sig', newline='')))
if not set(csv_header).issubset(set(parquet_cols)):
    raise RuntimeError(f'CSV contains columns absent from authoritative Parquet: {sorted(set(csv_header)-set(parquet_cols))}')
# Parquet is authoritative: it is the complete processed serialization and may contain legitimate extra fields.
if len(csv_header) != 70 or len(parquet_cols) != 71:
    raise RuntimeError(f'Unexpected source column counts: csv={len(csv_header)}, parquet={len(parquet_cols)}')
rows = parquet.read().to_pylist()
if len(rows) != 17518:
    raise RuntimeError(f'Unexpected Parquet row count: {len(rows)}')
ids = ['master_id', 'wpdx_id', 'row_id_export']
for col in ids:
    vals = [r.get(col) for r in rows]
    if any(v is None or not isinstance(v, str) or v != v.strip() for v in vals):
        raise RuntimeError(f'Invalid identifier values in {col}')
    if len(set(vals)) != len(vals):
        raise RuntimeError(f'Duplicate identifier values in {col}')
if len({tuple(sorted((k, repr(v)) for k, v in r.items())) for r in rows}) != len(rows):
    raise RuntimeError('Duplicate source rows detected')
for i, r in enumerate(rows):
    lat, lon = r.get('latitude'), r.get('longitude')
    if lat is not None and not (-90 <= lat <= 90): raise RuntimeError(f'Invalid latitude row {i}')
    if lon is not None and not (-180 <= lon <= 180): raise RuntimeError(f'Invalid longitude row {i}')
source_to_db = {'status_clean':'observed_status','status_id':'observed_status_id','label_functional_status_clean':'label_functional_status','wpdx_water_point_population_LEAKY':'wpdx_water_point_population_leaky','wpdx_crucialness_score_LEAKY':'wpdx_crucialness_score_leaky','wpdx_pressure_score_LEAKY':'wpdx_pressure_score_leaky','wpdx_rehab_priority_LEAKY':'wpdx_rehab_priority_leaky','wpdx_pop_would_gain_access_LEAKY':'wpdx_pop_would_gain_access_leaky','dist_nearest_functional_other_m_LEAKY':'dist_nearest_functional_other_m_leaky'}
model_cols = {c.name for c in WaterPoint.__table__.columns if c.name != 'id'}
all_mapping = {c: source_to_db.get(c, c) for c in parquet_cols if c in model_cols or c in source_to_db}
unmapped = sorted(set(parquet_cols) - set(all_mapping))
if unmapped: raise RuntimeError(f'Unmapped source columns: {unmapped}')
def clean(v):
    if v is None: return None
    if hasattr(v, 'item'): v = v.item()
    if isinstance(v, str) and v.lower() in {'true', 'false'}: return v.lower() == 'true'
    return v
payload=[]
for r in rows:
    item={}
    for src,dst in all_mapping.items():
        v=clean(r.get(src))
        if dst == 'survey_date' and v is not None and not isinstance(v,date): v = v.date() if hasattr(v,'date') else date.fromisoformat(str(v)[:10])
        item[dst]=v
    payload.append(item)
engine=create_engine(settings.database_url,pool_pre_ping=True)
start=time.perf_counter()
with Session(engine) as session:
    existing=session.execute(text('SELECT count(*) FROM water_points')).scalar_one()
    if existing: raise RuntimeError(f'Idempotency guard: water_points already contains {existing} rows; refusing duplicate import')
    session.execute(WaterPoint.__table__.insert(),payload)
    session.commit()
duration=time.perf_counter()-start
with engine.connect() as c:
    counts={n:c.execute(text(f'SELECT count(*) FROM {n}')).scalar_one() for n in ['water_points','prediction_results','impact_results','consequence_results']}
    uniq={col:c.execute(text(f'SELECT count(DISTINCT {col}) FROM water_points')).scalar_one() for col in ids}
print(json.dumps({'rows':len(rows),'source_columns':len(parquet_cols),'csv_columns':len(csv_header),'unmapped':unmapped,'duration_seconds':round(duration,3),'counts':counts,'distinct':uniq},default=str))
engine.dispose()




