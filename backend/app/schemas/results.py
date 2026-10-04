from datetime import datetime
from pydantic import BaseModel, ConfigDict

class PredictionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; water_point_id: int; probability_non_functional: float|None; probability_functional: float|None; predicted_status: str|None; decision_threshold: float|None; risk_band: str|None; risk_band_note: str|None; prediction_methodology_version: str; computed_at: datetime
class ImpactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; water_point_id: int; impact_available: bool; impact_score: float|None; population_component: float|None; alternative_scarcity_component: float|None; impact_unavailable_reason: str|None; impact_methodology_version: str; computed_at: datetime
class ConsequenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; water_point_id: int; risk_available: bool; probability_non_functional: float|None; probability_functional: float|None; predicted_status: str|None; decision_threshold: float|None; risk_band: str|None; risk_band_note: str|None; prediction_methodology_version: str|None; impact_available: bool; impact_score: float|None; impact_methodology_version: str|None; population_component: float|None; alternative_scarcity_component: float|None; risk_impact_index_available: bool; risk_impact_index: float|None; risk_impact_index_note: str|None; consequence_priority_methodology_version: str; consequence_priority_unavailable_reason: str|None; computed_at: datetime
class ComputeResponse(BaseModel):
    water_point: dict
    prediction: PredictionResponse
    impact: ImpactResponse
    consequence: ConsequenceResponse
