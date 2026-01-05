# app/db/base.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus

# ⚙️ Connection string sử dụng SQL Server Authentication
server_name = "localhost"  # Hoặc "chinchin" đều được
database_name = "library_db"
username = "sa"
password = "chinchin123@"

# 🔹 Cách 1: Dùng URL encoding (An toàn hơn với ký tự đặc biệt)
# connection_string = (
#     f"DRIVER={{ODBC Driver 17 for SQL Server}};"
#     f"SERVER={server_name};"
#     f"DATABASE={database_name};"
#     f"UID={username};"
#     f"PWD={password};"
#     f"TrustServerCertificate=yes;"
# )

# params = quote_plus(connection_string)
# DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

# # 🔹 Hoặc Cách 2: Dùng format đơn giản (nếu password không có ký tự đặc biệt)
DATABASE_URL = (
    f"mssql+pyodbc://{username}:{password}@{server_name}:1433/{database_name}"
    f"?driver=ODBC+Driver+17+for+SQL+Server"
    f"&TrustServerCertificate=yes"
)

# 🔹 Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    echo=True,  # set False in production
    pool_pre_ping=True,  # Kiểm tra connection trước khi dùng
    pool_recycle=3600,  # Recycle connection sau 1 giờ
)

# 🔹 Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# 🔹 Base class for models
Base = declarative_base()

# 🔹 Dependency to get DB session (for FastAPI)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# # app/db/base.py
# from sqlalchemy import create_engine
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker

# # ⚙️ Connection string sử dụng Windows Authentication
# # Sử dụng tên server và database cụ thể
# server_name = "DESKTOP-7SLU2A5"  # Tên server của bạn
# database_name = "library_db"     # Tên database của bạn

# # Cấu trúc connection string theo yêu cầu
# # Sử dụng ODBC Driver 17 như đã đề cập trong liên kết lỗi
# DATABASE_URL = f"mssql+pyodbc://{server_name}/{database_name}?trusted_connection=yes&driver=ODBC+Driver+17+for+SQL+Server"

# # 🔹 Create SQLAlchemy engine
# engine = create_engine(
#     DATABASE_URL,
#     echo=True,  # set False in production
# )

# # 🔹 Create session factory
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# # 🔹 Base class for models
# Base = declarative_base()

# # 🔹 Dependency to get DB session (for FastAPI)
# def get_db():
#     db = SessionLocal()
#     try:
#         yield db
#     finally:
#         db.close()
