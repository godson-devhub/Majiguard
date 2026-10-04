from math import ceil
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.repositories.water_point_repository import WaterPointRepository
from app.schemas.water_point import AdministrativeAreaOut, AdministrativeMetadataOut, MapPageMeta, PageMeta, WaterPointOut
from app.geography.assignment import boundary_metadata, list_areas
from app.services.water_point_service import WaterPointService
router=APIRouter(prefix="/water-points", tags=["water-points"])
def service(db: Session=Depends(get_db)): return WaterPointService(WaterPointRepository(db))
def page_result(items,total,page,page_size): return {"items":items,"page":page,"page_size":page_size,"total":total,"total_pages":ceil(total/page_size) if total else 0}
def _validate_admin_scope(nbs_region: str|None = None, nbs_district: str|None = None, nbs_ward: str|None = None):
    if nbs_district is not None and nbs_region is None: raise HTTPException(422, "nbs_region is required when nbs_district is supplied")
    if nbs_ward is not None and nbs_district is None: raise HTTPException(422, "nbs_district is required when nbs_ward is supplied")
    if nbs_region is not None and nbs_district is not None and not any(a.name == nbs_district for a in list_areas("district", region=nbs_region)): raise HTTPException(422, "District does not belong to the selected region")
    if nbs_district is not None and nbs_ward is not None and not any(a.name == nbs_ward for a in list_areas("ward", district=nbs_district, region=nbs_region)): raise HTTPException(422, "Ward does not belong to the selected district")
@router.get("/administrative/metadata", response_model=AdministrativeMetadataOut)
def administrative_metadata(): return boundary_metadata()
@router.get("/administrative/regions", response_model=list[AdministrativeAreaOut])
def administrative_regions(): return list_areas("region")
@router.get("/administrative/districts", response_model=list[AdministrativeAreaOut])
def administrative_districts(region: str = Query(..., min_length=1)): return list_areas("district", region=region)
@router.get("/administrative/wards", response_model=list[AdministrativeAreaOut])
def administrative_wards(region: str = Query(..., min_length=1), district: str = Query(..., min_length=1)):
    _validate_admin_scope(region, district, None); return list_areas("ward", region=region, district=district)
@router.get("",response_model=PageMeta)
def list_water_points(page:int=Query(1,ge=1),page_size:int=Query(50,ge=1,le=500),observed_status:str|None=None,nbs_region:str|None=None,nbs_district:str|None=None,nbs_ward:str|None=None,s:WaterPointService=Depends(service)):
    _validate_admin_scope(nbs_region,nbs_district,nbs_ward); items=s.list(page=page,page_size=page_size,observed_status=observed_status,nbs_region=nbs_region,nbs_district=nbs_district,nbs_ward=nbs_ward); return page_result(items,s.repository.count(observed_status=observed_status,nbs_region=nbs_region,nbs_district=nbs_district,nbs_ward=nbs_ward),page,page_size)
@router.get("/map",response_model=MapPageMeta)
def map_water_points(page:int=Query(1,ge=1),page_size:int=Query(500,ge=1,le=500),observed_status:str|None=None,nbs_region:str|None=None,nbs_district:str|None=None,nbs_ward:str|None=None,s:WaterPointService=Depends(service)):
    _validate_admin_scope(nbs_region,nbs_district,nbs_ward); items=s.list_for_map(page=page,page_size=page_size,observed_status=observed_status,nbs_region=nbs_region,nbs_district=nbs_district,nbs_ward=nbs_ward); return page_result(items,s.repository.count(observed_status=observed_status,nbs_region=nbs_region,nbs_district=nbs_district,nbs_ward=nbs_ward),page,page_size)
@router.get("/master/{master_id}",response_model=WaterPointOut)
def by_master(master_id: str = Path(..., min_length=1, max_length=128), s: WaterPointService = Depends(service)):
    item=s.get_by_master_id(master_id)
    if item is None: raise HTTPException(404,"Water point not found")
    return item
@router.get("/{water_point_id}",response_model=WaterPointOut)
def by_id(water_point_id:int,s:WaterPointService=Depends(service)):
    item=s.get(water_point_id)
    if item is None: raise HTTPException(404,"Water point not found")
    return item

