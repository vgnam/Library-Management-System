# test_history.py
from app.db.base import SessionLocal
from app.services.srv_history import HistoryService
from fastapi_sqlalchemy import db

# Pick a test reader
reader_id = "5003dca9-1ba7-438b-935d-c4bb3a631265"

# Create a session manually
db_session = SessionLocal()

# Patch fastapi_sqlalchemy.db.session for HistoryService
db.session = db_session

history_service = HistoryService()

# 1️⃣ Borrow history
history = history_service.get_borrow_history(reader_id)
print("Borrow History:")
print(history)

# 2️⃣ Currently borrowed books
current = history_service.get_currently_borrowed_books(reader_id)
print("\nCurrently Borrowed:")
print(current)

# 3️⃣ Overdue books
overdue = history_service.get_overdue_books(reader_id)
print("\nOverdue Books:")
print(overdue)

# Close session
db_session.close()
