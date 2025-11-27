from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base


class Librarian(Base):
    __tablename__ = "librarians"

    lib_id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.user_id"), nullable=False)
    years_of_experience = Column(Integer, default=0)

    user = relationship("User", back_populates="librarian")
    borrow_slips = relationship("BorrowSlip", back_populates="librarian")
    acquisition_slips = relationship("AcquisitionSlip", back_populates="librarian")