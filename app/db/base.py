# app/db/base.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ⚙️ Connection string sử dụng Windows Authentication
# Sử dụng tên server và database cụ thể
server_name = "DESKTOP-7SLU2A5"  # Tên server của bạn
database_name = "library_db"     # Tên database của bạn

# Cấu trúc connection string theo yêu cầu
# Sử dụng ODBC Driver 17 như đã đề cập trong liên kết lỗi
DATABASE_URL = f"mssql+pyodbc://{server_name}/{database_name}?trusted_connection=yes&driver=ODBC+Driver+17+for+SQL+Server"

# 🔹 Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    echo=True,  # set False in production
)

# 🔹 Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 🔹 Base class for models
Base = declarative_base()

# 🔹 Dependency to get DB session (for FastAPI)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

