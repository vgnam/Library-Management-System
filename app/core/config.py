# settings.py
import os
from pydantic import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Library Management System"
    API_PREFIX: str = "/api/v1"


    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "mssql+pyodbc://DESKTOP-7SLU2A5/library_db?trusted_connection=yes&driver=ODBC+Driver+17+for+SQL+Server"
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_SECONDS: int = 3600

    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    ROOT_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # D:\Library-Management-System\app
    LOGGING_CONFIG_FILE: str = os.path.join(os.path.dirname(ROOT_DIR), "logging.ini")  # D:\Library-Management-System\logging.ini


settings = Settings()