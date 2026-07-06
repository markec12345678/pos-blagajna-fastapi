from functools import lru_cache
from typing import List
import json
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "POS Restaurant"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./pos.db"
    SECRET_KEY: str = "pos-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    s = Settings()
    env_cors = os.environ.get("CORS_ORIGINS")
    if env_cors:
        try:
            s.CORS_ORIGINS = json.loads(env_cors)
        except json.JSONDecodeError:
            s.CORS_ORIGINS = [env_cors]
    env_db = os.environ.get("DATABASE_URL")
    if env_db:
        s.DATABASE_URL = env_db
    return s
