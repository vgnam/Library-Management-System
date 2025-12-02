from app.db.base import engine, Base, DATABASE_URL
from sqlalchemy import inspect

print(f"📂 Database URL: {DATABASE_URL}")

try:
    # Test connection
    with engine.connect() as conn:
        print("✅ Kết nối SQLite thành công!")
    
    # Create tables
    print("\n🔨 Đang tạo tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tạo tables thành công!")
    
    # List all tables
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    if tables:
        print(f"\n📊 Các tables đã tạo:")
        for table in tables:
            columns = inspector.get_columns(table)
            print(f"  - {table} ({len(columns)} columns)")
            for col in columns:
                print(f"      • {col['name']}: {col['type']}")
    else:
        print("\n⚠️ Chưa có tables nào")
    
except Exception as e:
    print(f"❌ Lỗi: {e}")
    import traceback
    traceback.print_exc()