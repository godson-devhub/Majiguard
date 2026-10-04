"""
Generates web-ready Tanzania administrative boundary GeoJSON from the
authoritative NBS 2022 PHC ward shapefile.

Source (read-only, never modified):
  data/raw/geographic/nbs_tz_2022_wards/extracted/TANZANIA_2022PHC_WARDS_SHAPEFILES.shp
  CRS: EPSG:3395 (World Mercator)

Output (written only here, frontend-only static assets):
  frontend/public/geo/tz-regions.geojson
  frontend/public/geo/tz-districts.geojson
  frontend/public/geo/wards/<region-slug>.geojson   (one file per region,
    plus wards/manifest.json listing the slugs) - ward boundaries are only
    ever rendered for one selected region at a time, so they are split per
    region rather than shipped as one multi-MB national file.

Each output level is reprojected to EPSG:4326 and simplified for browser
rendering. Region and district polygons are dissolved (unary_union) from the
ward-level source geometry grouped by the shapefile's own reg_name/dist_name
attributes - no boundary data is downloaded or invented, and geoBoundaries is
never used as the source. Run this script again to regenerate after any
change to the source shapefile; do not hand-edit the generated files.
"""

import json
import time
from collections import defaultdict
from pathlib import Path

import shapefile
from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import mapping, shape
from shapely.ops import transform, unary_union

ROOT = Path(__file__).resolve().parents[2]
SHP_PATH = ROOT / "data/raw/geographic/nbs_tz_2022_wards/extracted/TANZANIA_2022PHC_WARDS_SHAPEFILES.shp"
OUT_DIR = Path(__file__).resolve().parents[1] / "public/geo"

WARD_SIMPLIFY_DEG = 0.0006   # ~65m at the equator
DISTRICT_SIMPLIFY_DEG = 0.0025
REGION_SIMPLIFY_DEG = 0.01

_transformer = Transformer.from_crs("EPSG:3395", "EPSG:4326", always_xy=True)


def reproject(geom):
    return transform(lambda x, y, z=None: _transformer.transform(x, y), geom)


def clean(geom):
    if not geom.is_valid:
        geom = make_valid(geom)
    return geom


def simplify(geom, tolerance):
    return geom.simplify(tolerance, preserve_topology=True)


COORD_PRECISION = 5  # ~1.1m at the equator - plenty for a web outline


def _round_coords(value):
    if isinstance(value, float):
        return round(value, COORD_PRECISION)
    if isinstance(value, (list, tuple)):
        return [_round_coords(v) for v in value]
    return value


def feature(geom, properties):
    geojson = mapping(geom)
    geojson["coordinates"] = _round_coords(geojson["coordinates"])
    return {"type": "Feature", "geometry": geojson, "properties": properties}


def slugify(name: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in name).strip("-")


def write_fc(path: Path, features: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fc = {"type": "FeatureCollection", "features": features}
    path.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8")
    size_kb = path.stat().st_size / 1024
    print(f"  wrote {path.relative_to(ROOT)}: {len(features)} features, {size_kb:.0f} KB")


def main() -> None:
    started = time.time()
    print(f"Reading {SHP_PATH.relative_to(ROOT)} ...")
    reader = shapefile.Reader(str(SHP_PATH))
    print(f"  {len(reader)} ward records")

    ward_features_by_region: dict[str, list] = defaultdict(list)
    district_groups: dict[tuple[str, str], list] = defaultdict(list)
    region_groups: dict[str, list] = defaultdict(list)

    for shape_record in reader.iterShapeRecords():
        rec = shape_record.record
        geom_raw = shape(shape_record.shape.__geo_interface__)
        geom = clean(reproject(geom_raw))

        region = rec["reg_name"]
        district = rec["dist_name"]
        ward = rec["ward_name"]
        ward_code = rec["ward_code"]

        ward_features_by_region[region].append(
            feature(
                simplify(geom, WARD_SIMPLIFY_DEG),
                {"region": region, "district": district, "ward": ward, "ward_code": ward_code},
            )
        )
        district_groups[(region, district)].append(geom)
        region_groups[region].append(geom)

    district_features = []
    for (region, district), geoms in sorted(district_groups.items()):
        dissolved = clean(unary_union(geoms))
        district_features.append(
            feature(simplify(dissolved, DISTRICT_SIMPLIFY_DEG), {"region": region, "district": district})
        )

    region_features = []
    for region, geoms in sorted(region_groups.items()):
        dissolved = clean(unary_union(geoms))
        region_features.append(feature(simplify(dissolved, REGION_SIMPLIFY_DEG), {"region": region}))

    print("Writing GeoJSON ...")
    manifest = []
    for region, features in sorted(ward_features_by_region.items()):
        slug = slugify(region)
        write_fc(OUT_DIR / "wards" / f"{slug}.geojson", features)
        manifest.append({"region": region, "slug": slug, "wardCount": len(features)})
    (OUT_DIR / "wards" / "manifest.json").write_text(
        json.dumps(manifest, separators=(",", ":")), encoding="utf-8"
    )
    write_fc(OUT_DIR / "tz-districts.geojson", district_features)
    write_fc(OUT_DIR / "tz-regions.geojson", region_features)

    print(f"Done in {time.time() - started:.1f}s")


if __name__ == "__main__":
    main()
