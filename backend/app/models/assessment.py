from sqlalchemy import Column, String, ForeignKey, DateTime, Enum, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from .base import Base

class AssessmentType(enum.Enum):
    brainmap = "brainmap"
    remap = "remap"

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    type = Column(Enum(AssessmentType), nullable=False)
    date = Column(Date, nullable=False)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="assessments")
    clinic = relationship("Clinic", back_populates="assessments")