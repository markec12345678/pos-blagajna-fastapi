import re
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import jwt
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.user import User

_ORDER_BY_ID = re.compile(r"^/api/v1/orders/\d+$")
_ORDER_BY_TABLE = re.compile(r"^/api/v1/orders/by-table/\d+$")


def _path_only(request: Request) -> str:
    return request.url.path.rstrip("/") or request.url.path


def _is_public_route(method: str, path: str) -> bool:
    if path.startswith("/api/v1/public"):
        return True

    if method == "POST" and path == "/api/v1/auth/login":
        return True
    if method == "POST" and path == "/api/v1/auth/pin":
        return True
    if method == "GET" and path == "/api/v1/system/ping":
        return True

    if method == "POST" and path.startswith("/api/v1/delivery/webhook"):
        return True
    if method == "POST" and path == "/api/v1/shifts/clock-in-pin":
        return True
    if method == "GET" and path.startswith("/api/v1/shifts/status-pin"):
        return True
    if method == "POST" and path == "/api/v1/ratings/public":
        return True
    if method == "GET" and path == "/api/v1/ratings":
        return True

    # Customer-facing display screens (no staff login)
    if method == "GET" and _ORDER_BY_ID.match(path):
        return True
    if method == "GET" and _ORDER_BY_TABLE.match(path):
        return True
    if method == "POST" and path == "/api/v1/customers":
        return True

    return False


def _authenticate(token: str) -> User | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        if not user or not user.is_active:
            return None
        return user
    finally:
        db.close()


class AuthMiddleware(BaseHTTPMiddleware):
    """Require a valid JWT for all /api/v1 routes except an explicit public allowlist."""

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = _path_only(request)
        if not path.startswith("/api/v1"):
            return await call_next(request)

        if _is_public_route(request.method, path):
            return await call_next(request)

        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        if not token:
            return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

        user = _authenticate(token)
        if not user:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        request.state.user = user
        return await call_next(request)
