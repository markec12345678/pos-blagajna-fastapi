from functools import lru_cache
from typing import List
import json
import os
import secrets
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "POS Restaurant"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./pos.db"
    SECRET_KEY: str = secrets.token_urlsafe(48)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    PUTER_TOKEN: str = ""


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
