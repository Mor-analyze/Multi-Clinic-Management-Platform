from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class Clinic(Base):
    __tablename__ = "clinics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    color = Column(String(7), nullable=False, default="#00C896")
    is_active = Column(Boolean, default=True)

    branches = relationship("Branch", back_populates="clinic")
    patients = relationship("Patient", back_populates="clinic")
    services = relationship("Service", back_populates="clinic")
    materials = relationship("Material", back_populates="clinic")
    sessions = relationship("Session", back_populates="clinic")
    invoices = relationship("Invoice", back_populates="clinic")
    payments = relationship("PatientPayment", back_populates="clinic")
    expenses = relationship("Expense", back_populates="clinic")
    expense_subcategories = relationship("ExpenseSubcategory", back_populates="clinic")
    assessments = relationship("Assessment", back_populates="clinic")