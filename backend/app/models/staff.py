from sqlalchemy import Column, String, Boolean, ForeignKey, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .base import Base

class Staff(Base):
    __tablename__ = "staff"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    full_name = Column(String(150), nullable=False)
    job_title = Column(String(100))
    email = Column(String(150))
    phone = Column(String(20))
    default_hours_per_month = Column(Numeric(5, 2))
    is_active = Column(Boolean, default=True)
    hired_at = Column(Date)

    branch = relationship("Branch", back_populates="staff")
    wage_history = relationship("StaffWageHistory", back_populates="staff")
    sessions = relationship("Session", back_populates="staff", foreign_keys="Session.staff_id")

class StaffWageHistory(Base):
    __tablename__ = "staff_wage_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    hourly_rate = Column(Numeric(8, 2), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    staff = relationship("Staff", back_populates="wage_history")