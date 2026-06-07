from sqlalchemy import Column, String, Boolean, ForeignKey, Date, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .base import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    jane_id = Column(String(100), nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    preferred_name = Column(String(100))
    email = Column(String(150))
    phone = Column(String(20))
    date_of_birth = Column(Date)
    street_address = Column(String(255))
    city = Column(String(100))
    province = Column(String(50))
    postal_code = Column(String(20))
    referral_source = Column(String(150))
    first_visit = Column(Date)
    last_visit = Column(Date)
    is_active = Column(Boolean, default=True)
    imported_at = Column(DateTime, server_default=func.now())

    clinic = relationship("Clinic", back_populates="patients")
    branch = relationship("Branch", back_populates="patients")
    sessions = relationship("Session", back_populates="patient")
    invoices = relationship("Invoice", back_populates="patient")
    payments = relationship("PatientPayment", back_populates="patient")
    assessments = relationship("Assessment", back_populates="patient")