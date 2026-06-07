from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Numeric, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from .base import Base

class AssessmentType(enum.Enum):
    none = "none"
    brainmap = "brainmap"
    remap = "remap"

class Service(Base):
    __tablename__ = "services"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    base_price = Column(Numeric(10, 2))
    duration_minutes = Column(Integer)
    assessment_type = Column(Enum(AssessmentType), default=AssessmentType.none)
    is_active = Column(Boolean, default=True)

    clinic = relationship("Clinic", back_populates="services")
    sessions = relationship("Session", back_populates="service")

class JaneServiceMapping(Base):
    __tablename__ = "jane_service_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    jane_name = Column(String(255), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False)

    clinic = relationship("Clinic")
    service = relationship("Service")