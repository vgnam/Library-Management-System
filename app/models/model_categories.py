from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.models import Base


class Category(Base):
    __tablename__ = "categories"

    cat_id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)

    book_titles = relationship("BookTitle", back_populates="category")