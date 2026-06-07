from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, DateTime, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from .base import Base

class TransferStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class Material(Base):
    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clinic_id = Column(UUID(as_uuid=True), ForeignKey("clinics.id"), nullable=False)
    name = Column(String(150), nullable=False)
    unit = Column(String(50))
    is_active = Column(Boolean, default=True)

    clinic = relationship("Clinic", back_populates="materials")
    brands = relationship("MaterialBrand", back_populates="material")
    batches = relationship("MaterialBatch", back_populates="material")

class MaterialBrand(Base):
    __tablename__ = "material_brands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    brand_name = Column(String(150), nullable=False)
    cost_per_unit = Column(Numeric(10, 2))

    material = relationship("Material", back_populates="brands")

class MaterialBatch(Base):
    __tablename__ = "material_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    batch_number = Column(String(100))
    quantity = Column(Numeric(10, 2), nullable=False)
    total_cost = Column(Numeric(10, 2), nullable=False)
    cost_per_unit = Column(Numeric(10, 2), nullable=False)
    consumed = Column(Numeric(10, 2), default=0)
    purchased_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

    branch = relationship("Branch", back_populates="batches")
    material = relationship("Material", back_populates="batches")
    consumption_logs = relationship("MaterialConsumptionLog", back_populates="batch")

class MaterialConsumptionLog(Base):
    __tablename__ = "material_consumption_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("material_batches.id"), nullable=False)
    quantity_used = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text)
    logged_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    logged_at = Column(DateTime, server_default=func.now())

    batch = relationship("MaterialBatch", back_populates="consumption_logs")

class MainInventory(Base):
    __tablename__ = "main_inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    quantity = Column(Numeric(10, 2), default=0)
    low_stock_threshold = Column(Numeric(10, 2))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    material = relationship("Material")

class BranchInventory(Base):
    __tablename__ = "branch_inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    quantity = Column(Numeric(10, 2), default=0)
    low_stock_threshold = Column(Numeric(10, 2))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    branch = relationship("Branch", back_populates="inventory")
    material = relationship("Material")

class InventoryTransfer(Base):
    __tablename__ = "inventory_transfers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id"), nullable=False)
    branch_id = Column(UUID(as_uuid=True), ForeignKey("branches.id"), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(TransferStatus), default=TransferStatus.pending)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    requested_at = Column(DateTime, server_default=func.now())
    approved_at = Column(DateTime)

    material = relationship("Material")
    branch = relationship("Branch")