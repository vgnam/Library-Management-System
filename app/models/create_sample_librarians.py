# create_sample_librarians.py
from passlib.context import CryptContext
from datetime import datetime, date
from app.db.base import SessionLocal, Base, engine

# Import trực tiếp để tránh circular import
import sys
sys.path.insert(0, '.')

from sqlalchemy import Column, String, Integer, Text, Enum, Date
import enum

# Define Enums locally
class GenderEnum(str, enum.Enum):
    male = "Male"
    female = "Female"
    other = "Other"

class UserRoleEnum(str, enum.Enum):
    reader = "reader"
    librarian = "librarian"
    manager = "manager"

# Define User model locally without relationships
class User(Base):
    __tablename__ = "users"

    user_id = Column(String(50), primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    first_name = Column(String(50), nullable=True)
    last_name = Column(String(50), nullable=True)
    email = Column(String(100), unique=True, nullable=False)
    phone_number = Column(String(15), nullable=True)
    age = Column(Integer, nullable=True)
    dob = Column(Date, nullable=True)
    address = Column(Text, nullable=True)
    gender = Column(Enum(GenderEnum), nullable=True)
    role = Column(Enum(UserRoleEnum), default=UserRoleEnum.reader, nullable=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_sample_librarians():
    db = SessionLocal()
    
    librarians = [
        {
            "user_id": "LIB001",
            "username": "librarian1",
            "password": hash_password("librarian123"),
            "full_name": "Nguyen Thi Mai",
            "first_name": "Mai",
            "last_name": "Nguyen Thi",
            "email": "librarian1@library.com",
            "phone_number": "0901234567",
            "age": 28,
            "dob": date(1996, 3, 15),
            "address": "123 Le Loi Street, District 1, Ho Chi Minh City",
            "gender": GenderEnum.female,
            "role": UserRoleEnum.librarian
        },
        {
            "user_id": "LIB002",
            "username": "librarian2",
            "password": hash_password("librarian123"),
            "full_name": "Tran Van Hung",
            "first_name": "Hung",
            "last_name": "Tran Van",
            "email": "librarian2@library.com",
            "phone_number": "0912345678",
            "age": 32,
            "dob": date(1992, 7, 20),
            "address": "456 Nguyen Hue Boulevard, District 1, Ho Chi Minh City",
            "gender": GenderEnum.male,
            "role": UserRoleEnum.librarian
        },
        {
            "user_id": "LIB003",
            "username": "librarian3",
            "password": hash_password("librarian123"),
            "full_name": "Le Thi Lan",
            "first_name": "Lan",
            "last_name": "Le Thi",
            "email": "librarian3@library.com",
            "phone_number": "0923456789",
            "age": 26,
            "dob": date(1998, 11, 5),
            "address": "789 Tran Hung Dao Street, District 5, Ho Chi Minh City",
            "gender": GenderEnum.female,
            "role": UserRoleEnum.librarian
        },
        {
            "user_id": "LIB000",
            "username": "head_librarian",
            "password": hash_password("librarian123"),
            "full_name": "Pham Van Minh",
            "first_name": "Minh",
            "last_name": "Pham Van",
            "email": "head.librarian@library.com",
            "phone_number": "0909999999",
            "age": 45,
            "dob": date(1979, 5, 10),
            "address": "101 Vo Van Tan Street, District 3, Ho Chi Minh City",
            "gender": GenderEnum.male,
            "role": UserRoleEnum.librarian
        }
    ]
    
    try:
        for lib_data in librarians:
            # Check if user already exists
            existing = db.query(User).filter(
                (User.user_id == lib_data["user_id"]) |
                (User.username == lib_data["username"]) |
                (User.email == lib_data["email"])
            ).first()
            
            if existing:
                print(f"⚠️  User {lib_data['username']} already exists, skipping...")
                continue
            
            librarian = User(**lib_data)
            db.add(librarian)
        
        db.commit()
        print("✅ Created sample librarians successfully!")
        
        # Verify
        result = db.query(User).filter(User.role == UserRoleEnum.librarian).all()
        print(f"\n📊 Total librarians in database: {len(result)}")
        for lib in result:
            print(f"  - {lib.username}: {lib.full_name} ({lib.email})")
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_librarians()