# settings.py
import os
from pydantic import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Library Management System"
    API_PREFIX: str = "/api/v1"

    # ⚙️ Database Configuration
    SERVER_NAME: str = "localhost"  
    DATABASE_NAME: str = "library_db"
    USERNAME: str = "sa"
    PASSWORD: str = "chinchin123@"
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"mssql+pyodbc://{USERNAME}:{PASSWORD}@{SERVER_NAME}:1433/{DATABASE_NAME}"
        f"?driver=ODBC+Driver+17+for+SQL+Server"
        f"&TrustServerCertificate=yes"
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 3600

    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    ROOT_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # /path/to/Library-Management-System/app
    LOGGING_CONFIG_FILE: str = os.path.join(os.path.dirname(ROOT_DIR), "logging.ini")  # /path/to/Library-Management-System/logging.ini


settings = Settings()