from sqlalchemy import Column, String, Integer, Text, Enum, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models import Base
import enum


class GenderEnum(str, enum.Enum):
    male = "Male"
    female = "Female"
    other = "Other"


class UserRoleEnum(str, enum.Enum):
    reader = "reader"
    librarian = "librarian"
    manager = "manager"


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

    # Relationships
    reader = relationship("Reader", back_populates="user", uselist=False)
    librarian = relationship("Librarian", back_populates="user", uselist=False)
    manager = relationship("Manager", back_populates="user", uselist=False)