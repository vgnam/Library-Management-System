from sqlalchemy import Column, String, Enum, Date, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.models import Base
import enum


class CardTypeEnum(str, enum.Enum):
    standard = "Standard"
    vip = "VIP"


class CardStatusEnum(str, enum.Enum):
    active = "Active"
    expired = "Expired"
    suspended = "Suspended"


class ReadingCard(Base):
    __tablename__ = "reading_cards"

    card_id = Column(String(50), primary_key=True)
    reader_id = Column(String(50), ForeignKey("readers.reader_id"), nullable=False)
    card_type = Column(Enum(CardTypeEnum), default=CardTypeEnum.standard)
    fee = Column(Integer, nullable=False)
    register_date = Column(Date, nullable=False)
    register_office = Column(String(100), nullable=False)
    status = Column(Enum(CardStatusEnum), default=CardStatusEnum.active)

    reader = relationship("Reader", back_populates="reading_card")