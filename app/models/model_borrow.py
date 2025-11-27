from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base
import enum


class BorrowStatusEnum(str, enum.Enum):
    pending = "Pending"
    active = "Active"
    returned = "Returned"
    overdue = "Overdue"
    rejected = "Rejected"

class BorrowSlip(Base):
    __tablename__ = "borrowslips"

    bs_id = Column(String(50), primary_key=True)
    reader_id = Column(String(50), ForeignKey("readers.reader_id"), nullable=False)
    librarian_id = Column(String(50), ForeignKey("librarians.lib_id"), nullable=True)
    borrow_date = Column(DateTime, nullable=False)
    return_date = Column(DateTime, nullable=True)
    status = Column(Enum(BorrowStatusEnum), default=BorrowStatusEnum.active)

    reader = relationship("Reader", back_populates="borrow_slips")
    librarian = relationship("Librarian", back_populates="borrow_slips")
    details = relationship("BorrowSlipDetail", back_populates="borrow_slip")


class BorrowSlipDetail(Base):
    __tablename__ = "borrowslipdetails"

    id = Column(String(50), primary_key=True)
    borrow_slip_id = Column(String(50), ForeignKey("borrowslips.bs_id"), nullable=False)
    book_id = Column(String(50), ForeignKey("books.book_id"), nullable=False)
    return_date = Column(DateTime, nullable=True)

    borrow_slip = relationship("BorrowSlip", back_populates="details")
    book = relationship("Book", back_populates="borrow_details")
    penalty = relationship("PenaltySlip", back_populates="borrow_detail", uselist=False)