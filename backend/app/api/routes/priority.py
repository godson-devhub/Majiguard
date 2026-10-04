from math import ceil
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.geography.assignment import list_areas
from app.repositories.priority_repository import PriorityRepository
from app.schemas.priority import PriorityPageMeta, PrioritySummaryOut
from app.services.priority_service import PriorityService

router = APIRouter(prefix="/priority", tags=["priority"])


def service(db: Session = Depends(get_db)) -> PriorityService:
    return PriorityService(PriorityRepository(db))


def _validate_admin_scope(nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None):
    if nbs_district is not None and nbs_region is None: raise HTTPException(422, "nbs_region is required when nbs_district is supplied")
    if nbs_ward is not None and nbs_district is None: raise HTTPException(422, "nbs_district is required when nbs_ward is supplied")
    if nbs_region is not None and nbs_district is not None and not any(a.name == nbs_district for a in list_areas("district", region=nbs_region)): raise HTTPException(422, "District does not belong to the selected region")
    if nbs_district is not None and nbs_ward is not None and not any(a.name == nbs_ward for a in list_areas("ward", district=nbs_district, region=nbs_region)): raise HTTPException(422, "Ward does not belong to the selected district")


def _item(row: dict) -> dict:
    return {
        "rank": row["priority_rank"],
        "water_point_id": row["id"],
        "master_id": row["master_id"],
        "region": row["nbs_region"],
        "district": row["nbs_district"],
        "ward": row["nbs_ward"],
        "observed_status": row["observed_status"],
        "risk_band": row["risk_band"],
        "probability_non_functional": row["probability_non_functional"],
        "impact_score": row["impact_score"],
        "impact_high": row["impact_high"],
        "priority_score": row["priority_score"],
        "priority_type": row["priority_type"],
        "priority_methodology_version": row["priority_methodology_version"],
        "why_prioritized": row["why_prioritized"],
        "recommended_action": row["recommended_action"],
        "computed_at": row["computed_at"],
    }


def _page_result(rows: list[dict], total: int, page: int, page_size: int) -> dict:
    return {"items": [_item(r) for r in rows], "page": page, "page_size": page_size, "total": total, "total_pages": ceil(total / page_size) if total else 0}


@router.get("/preventive", response_model=PriorityPageMeta)
def preventive(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=500), nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None, s: PriorityService = Depends(service)):
    _validate_admin_scope(nbs_region, nbs_district, nbs_ward)
    rows = s.list_ranked(priority_type="preventive", page=page, page_size=page_size, nbs_region=nbs_region, nbs_district=nbs_district, nbs_ward=nbs_ward)
    total = s.count_ranked(priority_type="preventive", nbs_region=nbs_region, nbs_district=nbs_district, nbs_ward=nbs_ward)
    return _page_result(rows, total, page, page_size)


@router.get("/restoration", response_model=PriorityPageMeta)
def restoration(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=500), nbs_region: str | None = None, nbs_district: str | None = None, nbs_ward: str | None = None, s: PriorityService = Depends(service)):
    _validate_admin_scope(nbs_region, nbs_district, nbs_ward)
    rows = s.list_ranked(priority_type="restoration", page=page, page_size=page_size, nbs_region=nbs_region, nbs_district=nbs_district, nbs_ward=nbs_ward)
    total = s.count_ranked(priority_type="restoration", nbs_region=nbs_region, nbs_district=nbs_district, nbs_ward=nbs_ward)
    return _page_result(rows, total, page, page_size)


@router.get("/summary", response_model=PrioritySummaryOut)
def summary(s: PriorityService = Depends(service)):
    return s.summary()
