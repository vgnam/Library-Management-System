from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base


class Reader(Base):
    __tablename__ = "readers"

    reader_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.user_id"), nullable=False)
    total_borrowed = Column(Integer, default=0)

    user = relationship("User", back_populates="reader")
    reading_card = relationship("ReadingCard", back_populates="reader", uselist=False)
    borrow_slips = relationship("BorrowSlip", back_populates="reader")