"""Batch driver for the backend Priority Engine (priority_v2).

Unlike the per-point ML batch, priority ranking is inherently a whole-dataset
operation: a point's rank depends on every other eligible point's score. This
script reads every water point's observed status plus its latest stored
ConsequenceResult (never recomputing risk or impact), classifies each point
for both the PREVENTIVE and RESTORATION pathways per the v2 eligibility
rules (v1's rules plus a High Impact gate - see
app/services/impact_classification.py and PRIORITY_METHODOLOGY_VERSION's
docstring in app/services/priority_service.py), scores and ranks each
pathway's eligible population independently (scoring/ranking themselves are
unchanged from v1), and writes one PriorityResult row per (water_point,
priority_type) - 2 rows per water point - documenting eligibility and, where
ineligible, why.

This is a full recompute every run (ranks can shift as the underlying data
changes), consistent with the existing result tables' "insert new rows, keep
history, select latest by computed_at desc / id desc" convention. It never
deletes prior PriorityResult rows.

Run from the backend/ directory, with the virtualenv active:

    python -m scripts.compute_priority_rankings
"""
from __future__ import annotations

import json
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import func, select

from app.db.models import ConsequenceResult, PriorityResult, WaterPoint
from app.db.session import SessionLocal
from app.services.impact_classification import is_high_impact
from app.services.priority_service import PRIORITY_METHODOLOGY_VERSION

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = PROJECT_ROOT / "data" / "interim" / "priority_compute_report.json"
COMMIT_BATCH_SIZE = 1000

PREVENTIVE_RISK_BAND = "Non-Functional / High Risk"
FUNCTIONAL_STATUS = "Functional"
NON_FUNCTIONAL_STATUS = "Non-Functional"


def _fetch_points(db) -> list[dict]:
    latest_consequence = select(func.max(ConsequenceResult.id).label("id")).group_by(ConsequenceResult.water_point_id).subquery()
    stmt = (
        select(
            WaterPoint.id,
            WaterPoint.observed_status,
            ConsequenceResult.risk_available,
            ConsequenceResult.probability_non_functional,
            ConsequenceResult.risk_band,
            ConsequenceResult.impact_available,
            ConsequenceResult.impact_score,
            ConsequenceResult.population_component,
            ConsequenceResult.alternative_scarcity_component,
        )
        .select_from(WaterPoint)
        .outerjoin(ConsequenceResult, ConsequenceResult.water_point_id == WaterPoint.id)
        .outerjoin(latest_consequence, latest_consequence.c.id == ConsequenceResult.id)
        .where((ConsequenceResult.id.is_(None)) | (latest_consequence.c.id.is_not(None)))
    )
    return [dict(r) for r in db.execute(stmt).mappings().all()]


def _classify_preventive(point: dict) -> tuple[bool, str | None]:
    if point["observed_status"] != FUNCTIONAL_STATUS:
        return False, "observed status is not Functional"
    if not point["risk_available"]:
        return False, "risk assessment unavailable"
    if point["risk_band"] != PREVENTIVE_RISK_BAND:
        return False, "risk band is not Non-Functional / High Risk"
    if not point["impact_available"]:
        return False, "impact assessment unavailable"
    if not is_high_impact(point["impact_score"]):
        return False, "impact score is below the High Impact threshold"
    return True, None


def _classify_restoration(point: dict) -> tuple[bool, str | None]:
    if point["observed_status"] != NON_FUNCTIONAL_STATUS:
        return False, "observed status is not Non-Functional"
    if not point["impact_available"]:
        return False, "impact assessment unavailable"
    if not is_high_impact(point["impact_score"]):
        return False, "impact score is below the High Impact threshold"
    return True, None


def _median_or_none(values: list[float]) -> float | None:
    return statistics.median(values) if values else None


def _build_rows(points: list[dict], computed_at: datetime) -> tuple[list[PriorityResult], dict]:
    preventive_eligible: list[dict] = []
    restoration_eligible: list[dict] = []
    classified: list[dict] = []

    for point in points:
        prev_eligible, prev_reason = _classify_preventive(point)
        rest_eligible, rest_reason = _classify_restoration(point)
        entry = {"point": point, "preventive": (prev_eligible, prev_reason), "restoration": (rest_eligible, rest_reason)}
        classified.append(entry)
        if prev_eligible:
            preventive_eligible.append(point)
        if rest_eligible:
            restoration_eligible.append(point)

    preventive_impact_median = _median_or_none([p["impact_score"] for p in preventive_eligible])
    preventive_population_median = _median_or_none([p["population_component"] for p in preventive_eligible])
    preventive_alt_scarcity_median = _median_or_none([p["alternative_scarcity_component"] for p in preventive_eligible])

    restoration_impact_median = _median_or_none([p["impact_score"] for p in restoration_eligible])
    restoration_population_median = _median_or_none([p["population_component"] for p in restoration_eligible])
    restoration_alt_scarcity_median = _median_or_none([p["alternative_scarcity_component"] for p in restoration_eligible])

    preventive_scored = [(p, p["probability_non_functional"] * p["impact_score"]) for p in preventive_eligible]
    preventive_scored.sort(key=lambda t: (-t[1], -t[0]["probability_non_functional"], -t[0]["impact_score"], t[0]["id"]))
    preventive_rank = {p["id"]: i + 1 for i, (p, _score) in enumerate(preventive_scored)}
    preventive_score = {p["id"]: score for p, score in preventive_scored}

    restoration_scored = [(p, p["impact_score"]) for p in restoration_eligible]
    restoration_scored.sort(key=lambda t: (-t[1], -t[0]["impact_score"], t[0]["id"]))
    restoration_rank = {p["id"]: i + 1 for i, (p, _score) in enumerate(restoration_scored)}
    restoration_score = {p["id"]: score for p, score in restoration_scored}

    rows: list[PriorityResult] = []
    for entry in classified:
        point = entry["point"]
        prev_eligible, prev_reason = entry["preventive"]
        rest_eligible, rest_reason = entry["restoration"]

        rows.append(_priority_row(
            point, "preventive", prev_eligible, prev_reason,
            score=preventive_score.get(point["id"]), rank=preventive_rank.get(point["id"]),
            impact_median=preventive_impact_median, population_median=preventive_population_median, alt_scarcity_median=preventive_alt_scarcity_median,
            computed_at=computed_at,
        ))
        rows.append(_priority_row(
            point, "restoration", rest_eligible, rest_reason,
            score=restoration_score.get(point["id"]), rank=restoration_rank.get(point["id"]),
            impact_median=restoration_impact_median, population_median=restoration_population_median, alt_scarcity_median=restoration_alt_scarcity_median,
            computed_at=computed_at,
        ))

    summary = {
        "total_water_points": len(points),
        "preventive_eligible": len(preventive_eligible),
        "restoration_eligible": len(restoration_eligible),
    }
    return rows, summary


def _priority_row(point: dict, priority_type: str, eligible: bool, reason: str | None, *, score: float | None, rank: int | None, impact_median: float | None, population_median: float | None, alt_scarcity_median: float | None, computed_at: datetime) -> PriorityResult:
    impact_above_median = population_above_median = alt_scarcity_above_median = None
    if eligible:
        impact_above_median = point["impact_score"] >= impact_median if impact_median is not None else None
        population_above_median = point["population_component"] >= population_median if population_median is not None else None
        alt_scarcity_above_median = point["alternative_scarcity_component"] >= alt_scarcity_median if alt_scarcity_median is not None else None
    return PriorityResult(
        water_point_id=point["id"],
        priority_type=priority_type,
        eligible=eligible,
        priority_score=score,
        priority_rank=rank,
        probability_non_functional=point["probability_non_functional"],
        impact_score=point["impact_score"],
        risk_band=point["risk_band"],
        observed_status=point["observed_status"],
        impact_above_median=impact_above_median,
        population_above_median=population_above_median,
        alternative_scarcity_above_median=alt_scarcity_above_median,
        priority_methodology_version=PRIORITY_METHODOLOGY_VERSION,
        priority_unavailable_reason=reason,
        computed_at=computed_at,
    )


def run() -> dict:
    started = time.monotonic()
    computed_at = datetime.now(timezone.utc)
    with SessionLocal() as db:
        points = _fetch_points(db)
        rows, summary = _build_rows(points, computed_at)
        for start in range(0, len(rows), COMMIT_BATCH_SIZE):
            db.add_all(rows[start:start + COMMIT_BATCH_SIZE])
            db.commit()
    summary["rows_written"] = len(rows)
    summary["elapsed_seconds"] = round(time.monotonic() - started, 2)
    summary["priority_methodology_version"] = PRIORITY_METHODOLOGY_VERSION
    return summary


def _write_report(summary: dict) -> Path:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report = {"run_at": datetime.now(timezone.utc).isoformat(), "summary": summary}
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    return REPORT_PATH


def main() -> None:
    summary = run()
    report_path = _write_report(summary)
    print("Priority compute summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")
    print(f"  report: {report_path}")


if __name__ == "__main__":
    main()
