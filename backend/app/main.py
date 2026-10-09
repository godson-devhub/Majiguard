from fastapi import FastAPI

from app.core.config import settings
from app.api.routes import auth_router, priority_router, results_router, water_points_router
from app.core.exception_handlers import install_exception_handlers


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Foundation API for MajiGuard AI.",
    debug=settings.debug,
)

install_exception_handlers(app)

app.include_router(water_points_router, prefix=settings.api_prefix)
app.include_router(results_router, prefix=settings.api_prefix)
app.include_router(priority_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)


@app.get(f"{settings.api_prefix}/health", tags=["health"])
def health() -> dict[str, str]:
    """Return a deterministic liveness response."""
    return {"status": "ok"}


@app.get("/health", tags=["health"], include_in_schema=False)
def root_health() -> dict[str, str]:
    """Backward-compatible short health URL."""
    return {"status": "ok"}





