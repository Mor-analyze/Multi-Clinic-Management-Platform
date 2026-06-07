from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from .base import Base

class PaymentMethodType(enum.Enum):
    cash = "cash"
    etransfer = "etransfer"
    jane_card = "jane_card"
    jane_online = "jane_online"
    insurance = "insurance"

class PatientPayment(Base):
    __tablename__ = "patient_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(Enum(PaymentMethodType), nullable=False)
    reference_num = Column(String(100), nullable=True)
    payment_date = Column(DateTime, nullable=False)
    notes = Column(Text)
    duplicate_override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    override_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    override_at = Column(DateTime, nullable=True)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    clinic = relationship("Clinic", back_populates="payments")
    patient = relationship("Patient", back_populates="payments")
    allocations = relationship("PaymentAllocation", back_populates="payment")

class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("patient_payments.id"), nullable=False)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    amount_applied = Column(Numeric(10, 2), nullable=False)
    allocated_at = Column(DateTime, server_default=func.now())

    payment = relationship("PatientPayment", back_populates="allocations")
    invoice = relationship("Invoice", back_populates="allocations")