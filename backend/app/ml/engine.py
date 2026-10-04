from functools import lru_cache
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from typing import Any

import pandas as pd

from majiguard_ml import consequence_priority, impact_score, predict
from majiguard_ml.data_prep import clean_dataset, select_model_features

from app.db.models import ConsequenceResult, ImpactResult, PredictionResult, WaterPoint

class MLIntegrationError(RuntimeError): pass
class ModelInputUnavailable(MLIntegrationError): pass
class ImpactUnavailable(MLIntegrationError): pass
class ConsequenceUnavailable(MLIntegrationError): pass

@lru_cache(maxsize=1)
def get_prediction_pipeline() -> Any:
    return predict.load_pipeline()

def _water_point_record(point: WaterPoint) -> dict[str, Any]:
    record = {column.name: getattr(point, column.name) for column in WaterPoint.__table__.columns}
    aliases = {
        'observed_status': 'status_clean',
        'observed_status_id': 'status_id',
        'label_functional_status': 'label_functional_status_clean',
        'wpdx_water_point_population_leaky': 'wpdx_water_point_population_LEAKY',
        'wpdx_crucialness_score_leaky': 'wpdx_crucialness_score_LEAKY',
        'wpdx_pressure_score_leaky': 'wpdx_pressure_score_LEAKY',
        'wpdx_rehab_priority_leaky': 'wpdx_rehab_priority_LEAKY',
        'wpdx_pop_would_gain_access_leaky': 'wpdx_pop_would_gain_access_LEAKY',
        'dist_nearest_functional_other_m_leaky': 'dist_nearest_functional_other_m_LEAKY',
    }
    for db_name, source_name in aliases.items():
        record[source_name] = record.get(db_name)
    return record

def build_prediction_input(point: WaterPoint) -> pd.DataFrame:
    try:
        clean = clean_dataset(pd.DataFrame([_water_point_record(point)]))
        return select_model_features(clean)
    except Exception as exc:
        raise ModelInputUnavailable(f"water point {point.id} cannot satisfy the frozen model input contract: {exc}") from exc

def predict_water_point(point: WaterPoint) -> dict[str, Any]:
    return predict.predict_record(build_prediction_input(point), pipeline=get_prediction_pipeline())

def compute_impact(point: WaterPoint) -> dict[str, Any]:
    try:
        return impact_score.compute_impact_score(point.worldpop2022_pop_within_1000m, point.n_water_points_within_1000m)
    except Exception as exc:
        raise ImpactUnavailable(f"impact unavailable for water point {point.id}: {exc}") from exc

def build_consequence(prediction_result: dict[str, Any] | None, impact_result: dict[str, Any] | None, water_point_id: int) -> dict[str, Any]:
    try:
        return consequence_priority.build_consequence_priority_signal(prediction_result, impact_result, water_point_id)
    except Exception as exc:
        raise ConsequenceUnavailable(f"consequence unavailable for water point {water_point_id}: {exc}") from exc

def prediction_orm(point_id: int, output: dict[str, Any]) -> PredictionResult:
    return PredictionResult(water_point_id=point_id, probability_non_functional=float(output['probability_non_functional']), probability_functional=float(output['probability_functional']), predicted_status=output['predicted_status'], decision_threshold=float(output['decision_threshold']), risk_band=output.get('risk_band'), risk_band_note=None, prediction_methodology_version='v1_random_forest')

def impact_orm(point_id: int, output: dict[str, Any]) -> ImpactResult:
    return ImpactResult(water_point_id=point_id, impact_available=bool(output['impact_score_available']), impact_score=output.get('impact_score'), population_component=output.get('population_component'), alternative_scarcity_component=output.get('alternative_scarcity_component'), impact_unavailable_reason=output.get('impact_unavailable_reason'), impact_methodology_version=output['methodology_version'])

def consequence_orm(output: dict[str, Any]) -> ConsequenceResult:
    return ConsequenceResult(water_point_id=output['water_point_id'], risk_available=bool(output['risk_available']), probability_non_functional=output.get('probability_non_functional'), probability_functional=output.get('probability_functional'), predicted_status=output.get('predicted_status'), decision_threshold=output.get('decision_threshold'), risk_band=output.get('risk_band'), risk_band_note=output.get('risk_band_note'), prediction_methodology_version=output.get('prediction_methodology_version'), impact_available=bool(output['impact_available']), impact_score=output.get('impact_score'), impact_methodology_version=output.get('impact_methodology_version'), population_component=output.get('population_component'), alternative_scarcity_component=output.get('alternative_scarcity_component'), risk_impact_index_available=bool(output['risk_impact_index_available']), risk_impact_index=output.get('risk_impact_index'), risk_impact_index_note=output.get('risk_impact_index_note'), consequence_priority_methodology_version=output['consequence_priority_methodology_version'], consequence_priority_unavailable_reason=output.get('consequence_priority_unavailable_reason'))


