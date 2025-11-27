from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.models import Base


class Publisher(Base):
    __tablename__ = "publishers"

    pub_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255), nullable=True)

    book_titles = relationship("BookTitle", back_populates="publisher")