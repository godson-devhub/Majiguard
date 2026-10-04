from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.repositories.prediction_repository import PredictionRepository
from app.repositories.impact_repository import ImpactRepository
from app.repositories.consequence_repository import ConsequenceRepository
from app.repositories.water_point_repository import WaterPointRepository
from app.services.prediction_service import PredictionService
from app.services.impact_service import ImpactService
from app.services.consequence_service import ConsequenceService
from app.services.ml_service import MLService
from app.schemas.results import PredictionResponse, ImpactResponse, ConsequenceResponse, ComputeResponse

router = APIRouter(prefix="/water-points", tags=["results"])

def _point_or_404(db, water_point_id):
    point = WaterPointRepository(db).get_by_id(water_point_id)
    if point is None: raise HTTPException(status_code=404, detail="Water point not found")
    return point

@router.get("/{water_point_id}/prediction", response_model=PredictionResponse, summary="Get stored prediction")
def get_prediction(water_point_id: int = Path(..., ge=1), db: Session = Depends(get_db)):
    _point_or_404(db, water_point_id)
    result = PredictionService(PredictionRepository(db)).get_latest(water_point_id)
    if result is None: raise HTTPException(404, "Prediction result not found")
    return result

@router.get("/{water_point_id}/impact", response_model=ImpactResponse, summary="Get stored impact result")
def get_impact(water_point_id: int = Path(..., ge=1), db: Session = Depends(get_db)):
    _point_or_404(db, water_point_id)
    result = ImpactService(ImpactRepository(db)).get_latest(water_point_id)
    if result is None: raise HTTPException(404, "Impact result not found")
    return result

@router.get("/{water_point_id}/consequence", response_model=ConsequenceResponse, summary="Get stored consequence signal")
def get_consequence(water_point_id: int = Path(..., ge=1), db: Session = Depends(get_db)):
    _point_or_404(db, water_point_id)
    result = ConsequenceService(ConsequenceRepository(db)).get_latest(water_point_id)
    if result is None: raise HTTPException(404, "Consequence result not found")
    return result

@router.post("/{water_point_id}/compute", response_model=ComputeResponse, summary="Compute one water point")
def compute(water_point_id: int = Path(..., ge=1), db: Session = Depends(get_db)):
    try:
        point = _point_or_404(db, water_point_id)
        service_result = MLService(db).compute(water_point_id)
        if service_result is None: raise HTTPException(404, "Water point not found")
        prediction, impact, consequence = service_result
        db.commit()
        prediction_row = PredictionRepository(db).get_latest_by_water_point(water_point_id)
        impact_row = ImpactRepository(db).get_latest_by_water_point(water_point_id)
        consequence_row = ConsequenceRepository(db).get_latest_by_water_point(water_point_id)
        return {"water_point": {"id": point.id, "master_id": point.master_id, "wpdx_id": point.wpdx_id}, "prediction": prediction_row, "impact": impact_row, "consequence": consequence_row}
    except HTTPException:
        db.rollback(); raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="ML computation failed safely") from exc

