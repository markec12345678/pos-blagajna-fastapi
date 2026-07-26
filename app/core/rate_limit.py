import time
from collections import defaultdict
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory sliding window rate limiter."""
    
    def __init__(self, app, requests_per_minute: int = 30):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.windows: dict[str, list[float]] = defaultdict(list)
        self._cleanup_interval = 60
        self._last_cleanup = time.time()
    
    def _client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    async def dispatch(self, request: Request, call_next):
        now = time.time()
        
        # Periodic cleanup
        if now - self._last_cleanup > self._cleanup_interval:
            cutoff = now - 60
            for key in list(self.windows):
                self.windows[key] = [t for t in self.windows[key] if t > cutoff]
                if not self.windows[key]:
                    del self.windows[key]
            self._last_cleanup = now
        
        client = self._client_ip(request)
        path = request.url.path
        
        # Stricter limits for auth endpoints
        if "/auth/" in path or "/pin" in path:
            limit = 10  # 10 attempts per minute for auth
        elif "/delivery/webhook" in path:
            limit = 120  # webhooks get higher limit
        else:
            limit = self.rpm
        
        key = f"{client}:{path.split('/')[1] if len(path.split('/')) > 1 else 'root'}"
        window = self.windows[key]
        
        # Remove entries older than 60 seconds
        cutoff = now - 60
        window[:] = [t for t in window if t > cutoff]
        
        if len(window) >= limit:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": "60"}
            )
        
        window.append(now)
        response = await call_next(request)
        remaining = max(0, limit - len(window))
        reset_at = int(now + 60)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_at)
        return response
