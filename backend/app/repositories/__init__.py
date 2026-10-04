"""Database repositories for application data access."""

from .consequence_repository import ConsequenceRepository
from .impact_repository import ImpactRepository
from .prediction_repository import PredictionRepository
from .priority_repository import PriorityRepository
from .water_point_repository import WaterPointRepository

__all__ = [
    "ConsequenceRepository",
    "ImpactRepository",
    "PredictionRepository",
    "PriorityRepository",
    "WaterPointRepository",
]
