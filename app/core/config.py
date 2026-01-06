
# settings.py
import os
from pydantic import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Library Management System"
    API_PREFIX: str = "/api/v1"

    # PostgreSQL default connection (override with env var DATABASE_URL)
    DATABASE_USER: str = os.getenv("DATABASE_USER", "postgres")
    DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD", "chinchin123@")
    DATABASE_HOST: str = os.getenv("DATABASE_HOST", "db")
    DATABASE_PORT: str = os.getenv("DATABASE_PORT", "5432")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "library_db")

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{os.getenv('DATABASE_USER','postgres')}:{os.getenv('DATABASE_PASSWORD','postgres')}@{os.getenv('DATABASE_HOST','db')}:{os.getenv('DATABASE_PORT','5432')}/{os.getenv('DATABASE_NAME','library_db')}"
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 3600

    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    ROOT_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # D:\Library-Management-System\app
    LOGGING_CONFIG_FILE: str = os.path.join(os.path.dirname(ROOT_DIR), "logging.ini")  # D:\Library-Management-System\logging.ini


settings = Settings()
