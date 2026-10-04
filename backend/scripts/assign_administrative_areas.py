"""Reproducibly assign existing water points from NBS 2022 ward polygons."""
from app.db.session import SessionLocal
from app.db.models import WaterPoint
from app.geography.assignment import ASSIGNMENT_CRS, ASSIGNMENT_SOURCE, ASSIGNMENT_VERSION, assign_coordinate
def main():
    with SessionLocal() as db:
        points = db.query(WaterPoint).order_by(WaterPoint.id).all()
        counts = {}
        for point in points:
            result = assign_coordinate(point.longitude, point.latitude)
            point.nbs_region = result.region
            point.nbs_district = result.district
            point.nbs_ward = result.ward
            point.nbs_ward_code = result.ward_code
            point.administrative_assignment_source = ASSIGNMENT_SOURCE
            point.administrative_assignment_version = ASSIGNMENT_VERSION
            point.administrative_assignment_status = result.status
            point.administrative_assignment_crs = ASSIGNMENT_CRS
            counts[result.status] = counts.get(result.status, 0) + 1
        db.commit()
        print(counts)
if __name__ == "__main__": main()
