from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer, DateTime
from datetime import datetime
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def upgrade():
    # ... tạo bảng ở đây ...
    from alembic import op
    conn = op.get_bind()

    users_table = table(
        "users",
        column("user_id", Integer),
        column("email", String),
        column("full_name", String),
        column("created_at", DateTime),
    )

    accounts_table = table(
        "accounts",
        column("user_id", Integer),
        column("username", String),
        column("password_hash", String),
        column("role", String),
        column("status", String),
        column("created_at", DateTime),
    )

    # Tạo user và account
    conn.execute(
        users_table.insert().values(
            [
                {"email": "manager@library.com", "full_name": "Library Manager", "created_at": datetime.now()},
                {"email": "librarian@library.com", "full_name": "Main Librarian", "created_at": datetime.now()},
            ]
        )
    )

    conn.execute(
        accounts_table.insert().values(
            [
                {
                    "user_id": 1,
                    "username": "manager1",
                    "password_hash": pwd_context.hash("manager123"),
                    "role": "manager",
                    "status": "active",
                    "created_at": datetime.now(),
                },
                {
                    "user_id": 2,
                    "username": "librarian1",
                    "password_hash": pwd_context.hash("librarian123"),
                    "role": "librarian",
                    "status": "active",
                    "created_at": datetime.now(),
                },
            ]
        )
    )
