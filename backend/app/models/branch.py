from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class Branch(Base):
    __tablename__ = "branches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    name = Column(String(100), nullable=False)
    address = Column(String(255))
    city = Column(String(100))
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)

    clinic = relationship("Clinic", back_populates="branches")
    users = relationship("User", back_populates="branch")
    staff = relationship("Staff", back_populates="branch")
    patients = relationship("Patient", back_populates="branch")
    devices = relationship("Device", back_populates="branch")
    batches = relationship("MaterialBatch", back_populates="branch")
    inventory = relationship("BranchInventory", back_populates="branch")
    devices = relationship("Device", back_populates="branch")
    sessions = relationship("Session", back_populates="branch")
    invoices = relationship("Invoice", back_populates="branch")
    expenses = relationship("Expense", back_populates="branch")
