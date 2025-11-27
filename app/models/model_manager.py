from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base


class Manager(Base):
    __tablename__ = "managers"

    manager_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.user_id"), nullable=False)
    access_level = Column(Integer, default=1)

    user = relationship("User", back_populates="manager")