from sqlalchemy import Column, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.models import Base
import enum


class PenaltyTypeEnum(str, enum.Enum):
    late = "Late"
    damage = "Damage"
    lost = "Lost"


class PenaltyStatusEnum(str, enum.Enum):
    pending = "Pending"
    paid = "Paid"
    cancelled = "Cancelled"


class PenaltySlip(Base):
    __tablename__ = "penaltyslips"

    penalty_id = Column(String(50), primary_key=True)
    borrow_detail_id = Column(String(50), ForeignKey("borrowslipdetails.id"), nullable=False)
    penalty_type = Column(Enum(PenaltyTypeEnum), nullable=False)
    description = Column(String(255), nullable=True)
    status = Column(Enum(PenaltyStatusEnum), default=PenaltyStatusEnum.pending)

    borrow_detail = relationship("BorrowSlipDetail", back_populates="penalty")