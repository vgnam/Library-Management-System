from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base


class BookTitle(Base):
    __tablename__ = "booktitles"

    book_title_id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    total_quantity = Column(Integer, default=0)
    available = Column(Integer, default=0)
    category_id = Column(String(50), ForeignKey("categories.cat_id"))
    author = Column(String(100), nullable=True)
    publisher_id = Column(String(50), ForeignKey("publishers.pub_id"))
    isbn = Column(String(20), nullable=False)

    publisher = relationship("Publisher", back_populates="book_titles")
    books = relationship("Book", back_populates="book_title")
    category = relationship("Category", back_populates="book_titles")
    acquisition_details = relationship("AcquisitionSlipDetail", back_populates="book_title")

    price = Column(Integer, nullable=False, default=100000)
