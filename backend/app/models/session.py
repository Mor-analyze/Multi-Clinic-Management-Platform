from sqlalchemy import Column, String, Boolean, ForeignKey, Date, Numeric, DateTime, Enum, Text, Time, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from .base import Base

class SessionStatus(enum.Enum):
    imported = "imported"
    completed = "completed"
    cancelled = "cancelled"

class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jane_booking_id = Column(String(100), nullable=True)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=True)
    device_id_2 = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=True)
    session_date = Column(Date, nullable=False)
    session_time = Column(Time)
    duration_minutes = Column(Integer)
    notes = Column(Text)
    status = Column(Enum(SessionStatus), default=SessionStatus.imported)
    completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    imported_at = Column(DateTime, server_default=func.now())

    clinic = relationship("Clinic", back_populates="sessions")
    branch = relationship("Branch", back_populates="sessions")
    patient = relationship("Patient", back_populates="sessions")
    service = relationship("Service", back_populates="sessions")
    staff = relationship("Staff", back_populates="sessions", foreign_keys=[staff_id])
    invoice = relationship("Invoice", back_populates="session", uselist=False)