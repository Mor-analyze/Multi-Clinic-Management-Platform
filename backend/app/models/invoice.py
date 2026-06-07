from sqlalchemy import Column, String, ForeignKey, Date, Numeric, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from .base import Base

class InvoiceStatus(enum.Enum):
    paid = "paid"
    unpaid = "unpaid"
    partial = "partial"

class PaymentMethod(enum.Enum):
    card = "card"
    cash = "cash"
    etransfer = "etransfer"
    jane_online = "jane_online"
    insurance = "insurance"

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=True)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=True)
    jane_invoice_num = Column(String(100), nullable=True)
    purchase_date = Column(Date)
    income_category = Column(String(100))
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.unpaid)
    subtotal = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(10, 2), default=0)
    collected = Column(Numeric(10, 2), default=0)
    balance = Column(Numeric(10, 2), default=0)
    payer = Column(String(100))
    imported_at = Column(DateTime, server_default=func.now())

    clinic = relationship("Clinic", back_populates="invoices")
    branch = relationship("Branch", back_populates="invoices")
    patient = relationship("Patient", back_populates="invoices")
    session = relationship("Session", back_populates="invoice")
    allocations = relationship("PaymentAllocation", back_populates="invoice")