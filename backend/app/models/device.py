from sqlalchemy import Column, String, Boolean, ForeignKey, Date, Numeric, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from .base import Base

class MaintenanceType(enum.Enum):
    routine = "routine"
    repair = "repair"
    part_replacement = "part_replacement"

class Device(Base):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    name = Column(String(150), nullable=False)
    purchase_cost = Column(Numeric(12, 2))
    purchase_date = Column(Date)
    next_maintenance_date = Column(Date)
    maintenance_alert_date = Column(Date)
    is_active = Column(Boolean, default=True)

    branch = relationship("Branch", back_populates="devices")
    maintenance_logs = relationship("DeviceMaintenance", back_populates="device")

class DeviceMaintenance(Base):
    __tablename__ = "device_maintenance"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(Enum(MaintenanceType), nullable=False)
    cost = Column(Numeric(10, 2))
    technician = Column(String(150))
    notes = Column(Text)
    downtime_hours = Column(Numeric(5, 2))
    next_maintenance_date = Column(Date)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    device = relationship("Device", back_populates="maintenance_logs")