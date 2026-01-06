# settings.py
import os
from pydantic import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "Library Management System"
    API_PREFIX: str = "/api/v1"

    # PostgreSQL connection variables
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "chinchin123@"
    DATABASE_HOST: str = "db"
    DATABASE_PORT: str = "5432"
    DATABASE_NAME: str = "library_db"
    
    # DATABASE_URL takes priority if set
    DATABASE_URL: Optional[str] = None

    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 3600

    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    ROOT_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    LOGGING_CONFIG_FILE: str = os.path.join(os.path.dirname(ROOT_DIR), "logging.ini")

    class Config:
        env_file = ".env"
        case_sensitive = True

    def get_database_url(self) -> str:
        """Return DATABASE_URL if set, otherwise build from components"""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"


settings = Settings()