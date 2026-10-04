from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import Point, shape
from shapely.ops import transform
from shapely.strtree import STRtree
from shapely.validation import make_valid

PROJECT_ROOT = Path(__file__).resolve().parents[3]
NBS_SHAPEFILE = PROJECT_ROOT / "data" / "raw" / "geographic" / "nbs_tz_2022_wards" / "extracted" / "TANZANIA_2022PHC_WARDS_SHAPEFILES.shp"
ASSIGNMENT_SOURCE = "NBS 2022 PHC ward shapefile"
ASSIGNMENT_VERSION = "NBS-2022-PHC-wards"
ASSIGNMENT_CRS = "EPSG:4326"
SOURCE_CRS = "EPSG:3395"


@dataclass(frozen=True)
class AdministrativeAssignment:
    region: str | None
    district: str | None
    ward: str | None
    ward_code: str | None
    status: str


@dataclass(frozen=True)
class AdministrativeArea:
    level: str
    name: str
    code: str | None
    region: str | None
    district: str | None
    bounds: tuple[float, float, float, float]


@dataclass(frozen=True)
class BoundaryIndex:
    geometries: tuple[Any, ...]
    attributes: tuple[dict[str, str], ...]
    tree: STRtree
    invalid_geometry_count: int
    repaired_geometry_count: int


@lru_cache(maxsize=1)
def load_boundary_index() -> BoundaryIndex:
    if not NBS_SHAPEFILE.exists():
        raise FileNotFoundError(f"Authoritative NBS boundary file not found: {NBS_SHAPEFILE}")

    reader = shapefile.Reader(str(NBS_SHAPEFILE), encoding="utf-8")
    field_names = [field[0] for field in reader.fields[1:]]
    source_transformer = Transformer.from_crs(
        CRS.from_user_input(SOURCE_CRS), CRS.from_epsg(4326), always_xy=True
    )
    geometries: list[Any] = []
    attributes: list[dict[str, str]] = []
    invalid = 0
    repaired = 0

    for record_shape, record in zip(reader.iterShapes(), reader.iterRecords()):
        geometry = shape(record_shape.__geo_interface__)
        if not geometry.is_valid:
            invalid += 1
            geometry = make_valid(geometry)
            repaired += 1
        geometry = transform(source_transformer.transform, geometry)
        if not geometry.is_valid:
            geometry = make_valid(geometry)
        geometries.append(geometry)
        attributes.append({name: str(value).strip() for name, value in zip(field_names, record)})

    return BoundaryIndex(
        geometries=tuple(geometries),
        attributes=tuple(attributes),
        tree=STRtree(geometries),
        invalid_geometry_count=invalid,
        repaired_geometry_count=repaired,
    )


def boundary_metadata() -> dict[str, str | int]:
    index = load_boundary_index()
    return {
        "source": ASSIGNMENT_SOURCE,
        "version": ASSIGNMENT_VERSION,
        "source_crs": SOURCE_CRS,
        "assignment_crs": ASSIGNMENT_CRS,
        "geometry_count": len(index.geometries),
        "invalid_geometry_count": index.invalid_geometry_count,
        "repaired_geometry_count": index.repaired_geometry_count,
    }


def assign_coordinate(longitude: float | None, latitude: float | None) -> AdministrativeAssignment:
    if longitude is None or latitude is None:
        return AdministrativeAssignment(None, None, None, None, "unassigned_missing_coordinates")
    if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
        return AdministrativeAssignment(None, None, None, None, "unassigned_invalid_coordinates")

    index = load_boundary_index()
    point = Point(float(longitude), float(latitude))
    candidates = index.tree.query(point, predicate="intersects")
    containing: list[int] = []
    for candidate in candidates:
        candidate_index = int(candidate)
        # covers deliberately includes exact boundary points. No arbitrary
        # tolerance or nearest-area fallback is used.
        if index.geometries[candidate_index].covers(point):
            containing.append(candidate_index)

    if not containing:
        return AdministrativeAssignment(None, None, None, None, "unassigned_outside_or_boundary_gap")

    # Deterministic policy for shared/exact boundaries: prefer the smallest
    # containing polygon, then stable ward code. This never assigns a point
    # merely because it is close to a boundary.
    containing.sort(key=lambda i: (index.geometries[i].area, index.attributes[i].get("ward_code", "")))
    attrs = index.attributes[containing[0]]
    status = "assigned" if len(containing) == 1 else "assigned_boundary_tie_resolved"
    return AdministrativeAssignment(
        attrs.get("reg_name") or None,
        attrs.get("dist_name") or None,
        attrs.get("ward_name") or None,
        attrs.get("ward_code") or None,
        status,
    )


def _area_key(attrs: dict[str, str], level: str) -> tuple[str, str | None, str | None]:
    if level == "region":
        return attrs.get("reg_name", ""), None, None
    if level == "district":
        return attrs.get("dist_name", ""), attrs.get("reg_name"), None
    return attrs.get("ward_name", ""), attrs.get("reg_name"), attrs.get("dist_name")


def list_areas(level: str, *, region: str | None = None, district: str | None = None) -> list[AdministrativeArea]:
    if level not in {"region", "district", "ward"}:
        raise ValueError("level must be region, district, or ward")
    index = load_boundary_index()
    grouped: dict[tuple[str, str | None, str | None], list[Any]] = {}
    for geometry, attrs in zip(index.geometries, index.attributes):
        if region is not None and attrs.get("reg_name") != region:
            continue
        if district is not None and attrs.get("dist_name") != district:
            continue
        key = _area_key(attrs, level)
        grouped.setdefault(key, []).append(geometry)

    areas: list[AdministrativeArea] = []
    for key, geometries in grouped.items():
        name, parent_region, parent_district = key
        union = geometries[0]
        for geometry in geometries[1:]:
            union = union.union(geometry)
        min_x, min_y, max_x, max_y = union.bounds
        code = None
        for attrs in index.attributes:
            if _area_key(attrs, level) == key:
                code = attrs.get({"region": "reg_code", "district": "dist_code", "ward": "ward_code"}[level]) or None
                break
        areas.append(AdministrativeArea(level, name, code, parent_region, parent_district, (min_x, min_y, max_x, max_y)))
    return sorted(areas, key=lambda area: area.name)



