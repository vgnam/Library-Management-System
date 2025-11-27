from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base


class Book(Base):
    __tablename__ = "books"

    book_id = Column(String(50), primary_key=True)
    book_title_id = Column(String(50), ForeignKey("booktitles.book_title_id"), nullable=False)
    condition = Column(String(50), nullable=True)
    being_borrowed = Column(Boolean, default=False)

    book_title = relationship("BookTitle", back_populates="books")
    borrow_details = relationship("BorrowSlipDetail", back_populates="book")