from app.db.models import ConsequenceResult, ImpactResult, PredictionResult, WaterPoint
from app.repositories import ConsequenceRepository, ImpactRepository, PredictionRepository, WaterPointRepository
from app.services import ConsequenceService, ImpactService, PredictionService, WaterPointService
from app.services._pagination import InvalidPagination

def test_water_point_repository_and_service(db_session):
    repo = WaterPointRepository(db_session); service = WaterPointService(repo)
    point = repo.get_by_master_id("MG000001")
    assert point is not None and repo.get_by_id(point.id).master_id == point.master_id
    assert repo.get_by_wpdx_id(point.wpdx_id).id == point.id
    assert service.list(page=1, page_size=2)[0].id == point.id
    assert len(service.list(page=2, page_size=2)) == 2
    assert service.list(observed_status=point.observed_status, page_size=1)
    assert service.list(nbs_region=point.nbs_region, page_size=1)
    mapped = service.list_for_map(page_size=1)
    assert mapped[0]["master_id"] == point.master_id and mapped[0]["latitude"] is not None
    assert service.get_by_master_id("missing") is None
    with __import__('pytest').raises(InvalidPagination): service.list(page_size=501)

def test_result_repositories_return_none_for_unknown_water_point(db_session):
    """A water point id that does not exist has no stored result - `.get()`
    returns None rather than raising or inventing one. (Every real water point
    now has a stored ML result after the Step 8 batch compute - see
    `scripts/batch_compute_all_water_points.py` - so "no result yet" can no
    longer be demonstrated with a real id; this uses one that cannot exist.)"""
    missing_id = 999_999
    assert PredictionService(PredictionRepository(db_session)).get(missing_id) is None
    assert ImpactService(ImpactRepository(db_session)).get(missing_id) is None
    assert ConsequenceService(ConsequenceRepository(db_session)).get(missing_id) is None


def test_result_repositories_list_returns_stored_rows(db_session):
    """`.list()` paginates the real stored results - with the register fully
    assessed, it is never expected to be empty."""
    assert PredictionService(PredictionRepository(db_session)).list(page=1, page_size=1) != []
    assert ImpactService(ImpactRepository(db_session)).list(page=1, page_size=1) != []
    assert ConsequenceService(ConsequenceRepository(db_session)).list(page=1, page_size=1) != []

def test_result_persistence_is_transactional_and_rolled_back(db_session):
    point = WaterPointRepository(db_session).get_by_master_id("MG000001"); assert point is not None
    PredictionService(PredictionRepository(db_session)).save(PredictionResult(water_point_id=point.id, probability_non_functional=.5, probability_functional=.5, predicted_status="test", decision_threshold=.5, prediction_methodology_version="test"))
    ImpactService(ImpactRepository(db_session)).save(ImpactResult(water_point_id=point.id, impact_available=True, impact_score=.1, impact_methodology_version="test"))
    ConsequenceService(ConsequenceRepository(db_session)).save(ConsequenceResult(water_point_id=point.id, risk_available=False, impact_available=False, risk_impact_index_available=False, consequence_priority_methodology_version="test"))
    assert PredictionService(PredictionRepository(db_session)).get_latest(point.id) is not None
    assert ImpactService(ImpactRepository(db_session)).get_latest(point.id) is not None
    assert ConsequenceService(ConsequenceRepository(db_session)).get_latest(point.id) is not None
    db_session.rollback()
