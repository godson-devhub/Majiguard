"""High Impact classification (impact_high_threshold_v1).

A presentation/decision-support classification layered on top of the frozen
impact_v1 score - it never changes impact_score itself, and it is a separate,
independently versioned concept from `impact_methodology_version` (the score
formula) and `priority_methodology_version` (the ranking logic).

impact_score is the average of two already-percentile-ranked components
(model_artifacts/impact_v1/methodology.json), so its population-wide
distribution has no natural break: investigation against the live register
found mean == median =~ 0.500 and a roughly triangular shape with no gap or
cluster anywhere. No percentile cutoff is therefore more "data-discovered"
than another - this is an explicit operational/policy decision, not an
externally validated threshold.

IMPACT_HIGH_THRESHOLD_CUTOFF is the national 90th percentile of impact_score,
computed once (2026-10-03) against the register's 17,518 distinct water
points (de-duplicated - three consequence_results rows exist for
water_point_id 1 with identical values; see project notes), rounded to a
stable, documented constant. It is a frozen snapshot, not a live per-request
recompute: a live recompute would let a point's High Impact status flip
silently whenever unrelated points changed, which is harder to audit.

If the register changes materially, this constant must be explicitly
recomputed and the version bumped (e.g. to "impact_high_threshold_v2") rather
than silently edited in place - the same governance already used for the ML
model and priority methodology versions.
"""
from __future__ import annotations

IMPACT_HIGH_THRESHOLD_VERSION = "impact_high_threshold_v1"
IMPACT_HIGH_THRESHOLD_CUTOFF = 0.6856


def is_high_impact(impact_score: float | None) -> bool | None:
    """None when impact_score itself is unavailable - never a false negative
    standing in for "unknown", the same convention `impact_available` already
    uses for its sibling fields."""
    if impact_score is None:
        return None
    return impact_score >= IMPACT_HIGH_THRESHOLD_CUTOFF
