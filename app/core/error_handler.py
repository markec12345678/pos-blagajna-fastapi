from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
import traceback

logger = logging.getLogger(__name__)


def register_error_handlers(app: FastAPI):
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc):
        return JSONResponse(
            status_code=404,
            content={"detail": "Resource not found"},
        )

    @app.exception_handler(400)
    async def bad_request_handler(request: Request, exc):
        detail = getattr(exc, "detail", "Bad request")
        return JSONResponse(
            status_code=400,
            content={"detail": detail},
        )

    @app.exception_handler(422)
    async def validation_handler(request: Request, exc):
        return JSONResponse(
            status_code=422,
            content={"detail": "Validation error"},
        )
