"""Tiny in-memory throttle for failed sign-ins (per email and client address)."""
from __future__ import annotations

import time
from collections import defaultdict, deque

_WINDOW_SECONDS = 15 * 60
_MAX_FAILURES = 6
_failures: dict[str, deque[float]] = defaultdict(deque)


def _prune(key: str) -> deque[float]:
    queue = _failures[key]
    cutoff = time.time() - _WINDOW_SECONDS
    while queue and queue[0] < cutoff:
        queue.popleft()
    return queue


def is_blocked(key: str) -> bool:
    return len(_prune(key)) >= _MAX_FAILURES


def record_failure(key: str) -> None:
    _prune(key).append(time.time())


def clear(key: str) -> None:
    _failures.pop(key, None)
