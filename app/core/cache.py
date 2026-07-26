import time
from functools import wraps
from typing import Callable

_cache: dict[str, tuple[float, any]] = {}
DEFAULT_TTL = 30  # seconds

# Cache statistics
_cache_stats = {"hits": 0, "misses": 0, "size": 0}


def cached(ttl: int = DEFAULT_TTL, key_prefix: str = ""):
    """Decorator for caching API response values. Uses function args as cache key."""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from prefix + args (skip db session and user objects)
            key_parts = [key_prefix or func.__name__]
            for a in args:
                if not hasattr(a, "query"):  # skip SQLAlchemy Session
                    key_parts.append(str(a))
            for k, v in sorted(kwargs.items()):
                if k not in ("db", "user") and v is not None:
                    key_parts.append(f"{k}={v}")
            cache_key = ":".join(key_parts)

            now = time.time()
            if cache_key in _cache:
                expires, value = _cache[cache_key]
                if now < expires:
                    _cache_stats["hits"] += 1
                    return value
                del _cache[cache_key]

            _cache_stats["misses"] += 1
            result = func(*args, **kwargs)
            _cache[cache_key] = (now + ttl, result)
            _cache_stats["size"] = len(_cache)
            return result
        return wrapper
    return decorator


def invalidate(prefix: str = ""):
    """Clear cache entries matching a prefix."""
    to_del = [k for k in _cache if not prefix or k.startswith(prefix)]
    for k in to_del:
        del _cache[k]
    _cache_stats["size"] = len(_cache)


def get_cache_stats() -> dict:
    """Get cache hit/miss statistics."""
    total = _cache_stats["hits"] + _cache_stats["misses"]
    hit_rate = _cache_stats["hits"] / total if total > 0 else 0
    return {
        "hits": _cache_stats["hits"],
        "misses": _cache_stats["misses"],
        "size": _cache_stats["size"],
        "hit_rate": round(hit_rate, 3)
    }
