from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, DateTime, Enum, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from .base import Base

class ExpenseCategory(enum.Enum):
    fixed = "fixed"
    operations = "operations"
    office = "office"

class ExpenseSubcategory(Base):
    __tablename__ = "expense_subcategories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    category = Column(Enum(ExpenseCategory), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)

    clinic = relationship("Clinic", back_populates="expense_subcategories")
    expenses = relationship("Expense", back_populates="subcategory")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("expense_subcategories.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(Text)
    expense_date = Column(Date, nullable=False)
    reference_num = Column(String(100), nullable=True)
    duplicate_override = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    override_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    override_at = Column(DateTime, nullable=True)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    clinic = relationship("Clinic", back_populates="expenses")
    branch = relationship("Branch", back_populates="expenses")
    subcategory = relationship("ExpenseSubcategory", back_populates="expenses")