from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base


class AcquisitionSlip(Base):
    __tablename__ = "acquisitionslips"

    acq_id = Column(String(50), primary_key=True)
    librarian_id = Column(String(50), ForeignKey("librarians.lib_id"), nullable=False)
    acc_date = Column(DateTime, nullable=False)

    librarian = relationship("Librarian", back_populates="acquisition_slips")
    details = relationship("AcquisitionSlipDetail", back_populates="acquisition_slip")


class AcquisitionSlipDetail(Base):
    __tablename__ = "acquisitionslipdetails"

    id = Column(String(50), primary_key=True)
    acquisition_slip_id = Column(String(50), ForeignKey("acquisitionslips.acq_id"), nullable=False)
    book_title_id = Column(String(50), ForeignKey("booktitles.book_title_id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)

    acquisition_slip = relationship("AcquisitionSlip", back_populates="details")
    book_title = relationship("BookTitle", back_populates="acquisition_details")