"""One-time batch driver for POST /water-points/{id}/compute.

Calls the exact same, unmodified MLService.compute() the API uses, directly
against the database instead of over HTTP, for every water point that does
not already have a stored PredictionResult. This script does not change any
model, threshold, or repository logic - it only decides which ids to call
compute() for, commits periodically instead of after every point, and
records what happened.

Run from the backend/ directory (same convention as the other scripts in
this folder), with the virtualenv active so `app` is importable:

    python scripts/batch_compute_all_water_points.py                    # full run, every water point
    python scripts/batch_compute_all_water_points.py --limit 20         # first 20 ids only, for validation
    python scripts/batch_compute_all_water_points.py --ids 1,2,999999   # explicit ids only, for validation
    python scripts/batch_compute_all_water_points.py --commit-batch-size 500
"""
from __future__ import annotations

import argparse
import json
import time
from collections.abc import Sequence
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import PredictionResult, WaterPoint
from app.db.session import SessionLocal
from app.services.ml_service import MLService

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = PROJECT_ROOT / "data" / "interim" / "batch_compute_report.json"

DEFAULT_COMMIT_BATCH_SIZE = 200


def _ordered_water_point_ids(db: Session) -> list[int]:
    """Every water point id, in stable ascending id order."""
    return list(db.scalars(select(WaterPoint.id).order_by(WaterPoint.id)).all())


def _already_assessed_ids(db: Session) -> set[int]:
    """Ids that already have at least one stored PredictionResult. These are
    never recomputed, so the batch never creates a duplicate result for a
    water point that has already been assessed."""
    rows = db.execute(select(PredictionResult.water_point_id).distinct()).all()
    return {row[0] for row in rows}


def run_batch(
    db: Session,
    ids: Sequence[int],
    *,
    commit_batch_size: int = DEFAULT_COMMIT_BATCH_SIZE,
) -> tuple[dict, list[dict]]:
    """Call the unmodified MLService.compute() for every id in `ids` that
    does not already have a stored PredictionResult, committing every
    `commit_batch_size` successes instead of after each point.

    If one water point fails, its id and the error are recorded and the loop
    continues - failures are never silently swallowed. Any already-flushed
    successes for other points are committed *before* rolling back the
    failing point's session state, so one point's failure never discards
    another point's already-completed work.

    Returns (summary, failures).
    """
    done = set(_already_assessed_ids(db))
    service = MLService(db)

    total = len(ids)
    processed = 0
    skipped = 0
    failures: list[dict] = []
    pending = 0
    started = time.monotonic()

    for water_point_id in ids:
        if water_point_id in done:
            skipped += 1
            continue

        try:
            result = service.compute(water_point_id)
            if result is None:
                raise ValueError(f"water point {water_point_id} not found")
        except Exception as exc:  # noqa: BLE001 - recorded, never swallowed
            if pending > 0:
                db.commit()
                pending = 0
            db.rollback()
            failures.append(
                {
                    "water_point_id": water_point_id,
                    "error_type": type(exc).__name__,
                    "error": str(exc),
                }
            )
            continue

        done.add(water_point_id)
        processed += 1
        pending += 1
        if pending >= commit_batch_size:
            db.commit()
            pending = 0

    if pending > 0:
        db.commit()

    elapsed = time.monotonic() - started
    summary = {
        "total": total,
        "processed": processed,
        "skipped": skipped,
        "failed": len(failures),
        "elapsed_seconds": round(elapsed, 2),
    }
    return summary, failures


def _write_report(summary: dict, failures: list[dict], ids: Sequence[int]) -> Path:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "run_at": datetime.now(timezone.utc).isoformat(),
        "requested_ids_count": len(ids),
        "summary": summary,
        "failures": failures,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    return REPORT_PATH


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only process the first N water points, in id order (for validation runs).",
    )
    selection.add_argument(
        "--ids",
        type=str,
        default=None,
        help="Comma-separated explicit water point ids to process, in the given order "
        "(for targeted validation; does not have to be the full estate).",
    )
    parser.add_argument(
        "--commit-batch-size",
        type=int,
        default=DEFAULT_COMMIT_BATCH_SIZE,
        help=f"Commit after this many successful computations instead of after every "
        f"point (default {DEFAULT_COMMIT_BATCH_SIZE}).",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()

    with SessionLocal() as db:
        if args.ids is not None:
            ids = [int(part.strip()) for part in args.ids.split(",") if part.strip()]
        else:
            ids = _ordered_water_point_ids(db)
            if args.limit is not None:
                ids = ids[: args.limit]

        summary, failures = run_batch(db, ids, commit_batch_size=args.commit_batch_size)

    report_path = _write_report(summary, failures, ids)

    print("Batch compute summary:")
    print(f"  total:     {summary['total']}")
    print(f"  processed: {summary['processed']}")
    print(f"  skipped:   {summary['skipped']}")
    print(f"  failed:    {summary['failed']}")
    print(f"  elapsed:   {summary['elapsed_seconds']}s")
    print(f"  report:    {report_path}")
    if failures:
        for failure in failures:
            print(f"    - water_point_id={failure['water_point_id']} ({failure['error_type']}): {failure['error']}")


if __name__ == "__main__":
    main()
