"""Shared methodology-version constants.

Kept dependency-free (no imports from `app.services` or `app.repositories`) so
both layers can import the current version without introducing a circular
import - `priority_service` owns the *meaning* of this constant, but
`water_point_repository` also needs its value to restrict its own "latest
PriorityResult" subqueries to the same version (see
`PriorityRepository._latest_ids`'s docstring for why an unfiltered latest-id
lookup is unsafe).
"""
from __future__ import annotations

PRIORITY_METHODOLOGY_VERSION = "priority_v2"
