from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import logging

log = logging.getLogger(__name__)

def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(status_code=422, content={"detail": "Request validation failed", "errors": exc.errors()})
    @app.exception_handler(SQLAlchemyError)
    async def database_handler(request: Request, exc: SQLAlchemyError):
        log.exception("Database operation failed")
        return JSONResponse(status_code=503, content={"detail": "Database operation failed"})
    @app.exception_handler(Exception)
    async def unexpected_handler(request: Request, exc: Exception):
        log.exception("Unexpected application error")
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
