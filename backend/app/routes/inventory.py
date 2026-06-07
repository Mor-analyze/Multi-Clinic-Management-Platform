from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date
import uuid

from app.models.database import get_db
from app.models.inventory import (
    Material, MaterialBrand, MaterialBatch,
    MaterialConsumptionLog, MainInventory,
    BranchInventory, InventoryTransfer, TransferStatus
)
from app.models.user import User
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/inventory", tags=["Inventory"])

# ── SCHEMAS ───────────────────────────────────────────────────
class MaterialCreate(BaseModel):
    clinic_id: str
    name: str
    unit: str

class BrandCreate(BaseModel):
    material_id: str
    brand_name: str
    cost_per_unit: float

class BatchCreate(BaseModel):
    branch_id: str
    material_id: str
    batch_number: Optional[str] = None
    quantity: float
    total_cost: float
    purchased_at: Optional[datetime] = None

class ConsumptionCreate(BaseModel):
    batch_id: str
    quantity_used: float
    notes: Optional[str] = None

class TransferCreate(BaseModel):
    material_id: str
    branch_id: str
    quantity: float

# ── MATERIALS ─────────────────────────────────────────────────
@router.get("/materials")
def list_materials(
    clinic_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    materials = db.query(Material).filter(
        Material.clinic_id == uuid.UUID(clinic_id),
        Material.is_active == True
    ).all()

    result = []
    for m in materials:
        brands = db.query(MaterialBrand).filter(
            MaterialBrand.material_id == m.id
        ).all()

        batches = db.query(MaterialBatch).filter(
            MaterialBatch.material_id == m.id
        ).all()

        total_qty = sum(float(b.quantity) for b in batches)
        total_consumed = sum(float(b.consumed) for b in batches)
        total_remaining = total_qty - total_consumed
        total_value = sum(
            (float(b.quantity) - float(b.consumed)) * float(b.cost_per_unit)
            for b in batches
        )

        result.append({
            "id": str(m.id),
            "name": m.name,
            "unit": m.unit,
            "total_remaining": round(total_remaining, 2),
            "total_value": round(total_value, 2),
            "brands": [{"id": str(b.id), "name": b.brand_name, "cost_per_unit": float(b.cost_per_unit)} for b in brands],
            "active_batches": len([b for b in batches if float(b.quantity) - float(b.consumed) > 0]),
        })

    return result

@router.post("/materials")
def create_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    material = Material(
        clinic_id=uuid.UUID(data.clinic_id),
        name=data.name,
        unit=data.unit,
        is_active=True,
    )
    db.add(material)
    db.commit()
    return {"message": "Material created", "id": str(material.id)}

@router.post("/materials/brands")
def add_brand(
    data: BrandCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    brand = MaterialBrand(
        material_id=uuid.UUID(data.material_id),
        brand_name=data.brand_name,
        cost_per_unit=data.cost_per_unit,
    )
    db.add(brand)
    db.commit()
    return {"message": "Brand added", "id": str(brand.id)}

# ── BATCHES ───────────────────────────────────────────────────
@router.get("/batches")
def list_batches(
    branch_id: str = Query(...),
    material_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MaterialBatch, Material).join(
        Material, Material.id == MaterialBatch.material_id
    ).filter(MaterialBatch.branch_id == uuid.UUID(branch_id))

    if material_id:
        query = query.filter(MaterialBatch.material_id == uuid.UUID(material_id))

    batches = query.order_by(MaterialBatch.created_at.desc()).all()

    return [{
        "id": str(b.id),
        "material_name": m.name,
        "material_unit": m.unit,
        "batch_number": b.batch_number,
        "quantity": float(b.quantity),
        "consumed": float(b.consumed),
        "remaining": round(float(b.quantity) - float(b.consumed), 2),
        "cost_per_unit": float(b.cost_per_unit),
        "total_cost": float(b.total_cost),
        "consumed_value": round(float(b.consumed) * float(b.cost_per_unit), 2),
        "remaining_value": round((float(b.quantity) - float(b.consumed)) * float(b.cost_per_unit), 2),
        "pct_used": round(float(b.consumed) / float(b.quantity) * 100, 1) if float(b.quantity) > 0 else 0,
        "purchased_at": str(b.purchased_at) if b.purchased_at else None,
    } for b, m in batches]

@router.post("/batches")
def create_batch(
    data: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    cost_per_unit = data.total_cost / data.quantity if data.quantity > 0 else 0

    batch = MaterialBatch(
        branch_id=uuid.UUID(data.branch_id),
        material_id=uuid.UUID(data.material_id),
        batch_number=data.batch_number,
        quantity=data.quantity,
        total_cost=data.total_cost,
        cost_per_unit=cost_per_unit,
        consumed=0,
        purchased_at=data.purchased_at or datetime.utcnow(),
    )
    db.add(batch)
    db.commit()
    return {"message": "Batch created", "id": str(batch.id), "cost_per_unit": round(cost_per_unit, 2)}

# ── CONSUMPTION ───────────────────────────────────────────────
@router.post("/batches/consume")
def log_consumption(
    data: ConsumptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    batch = db.query(MaterialBatch).filter(
        MaterialBatch.id == uuid.UUID(data.batch_id)
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    remaining = float(batch.quantity) - float(batch.consumed)
    if data.quantity_used > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough stock. Remaining: {remaining} {batch.material.unit}"
        )

    batch.consumed = float(batch.consumed) + data.quantity_used

    log = MaterialConsumptionLog(
        batch_id=batch.id,
        quantity_used=data.quantity_used,
        notes=data.notes,
        logged_by=current_user.id,
    )
    db.add(log)
    db.commit()

    return {
        "message": "Consumption logged",
        "consumed": data.quantity_used,
        "remaining": round(float(batch.quantity) - float(batch.consumed), 2),
        "cost": round(data.quantity_used * float(batch.cost_per_unit), 2),
    }

# ── TRANSFERS ─────────────────────────────────────────────────
@router.get("/transfers")
def list_transfers(
    branch_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    transfers = db.query(InventoryTransfer, Material).join(
        Material, Material.id == InventoryTransfer.material_id
    ).filter(
        InventoryTransfer.branch_id == uuid.UUID(branch_id)
    ).order_by(InventoryTransfer.requested_at.desc()).all()

    return [{
        "id": str(t.id),
        "material_name": m.name,
        "unit": m.unit,
        "quantity": float(t.quantity),
        "status": t.status.value,
        "requested_at": str(t.requested_at),
        "approved_at": str(t.approved_at) if t.approved_at else None,
    } for t, m in transfers]

@router.post("/transfers")
def request_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transfer = InventoryTransfer(
        material_id=uuid.UUID(data.material_id),
        branch_id=uuid.UUID(data.branch_id),
        quantity=data.quantity,
        status=TransferStatus.pending,
        requested_by=current_user.id,
    )
    db.add(transfer)
    db.commit()
    return {"message": "Transfer requested", "id": str(transfer.id)}

@router.patch("/transfers/{transfer_id}/approve")
def approve_transfer(
    transfer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    transfer = db.query(InventoryTransfer).filter(
        InventoryTransfer.id == uuid.UUID(transfer_id)
    ).first()

    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    if transfer.status != TransferStatus.pending:
        raise HTTPException(status_code=400, detail="Transfer already processed")

    transfer.status = TransferStatus.approved
    transfer.approved_by = current_user.id
    transfer.approved_at = datetime.utcnow()
    db.commit()

    return {"message": "Transfer approved"}

@router.patch("/transfers/{transfer_id}/reject")
def reject_transfer(
    transfer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    transfer = db.query(InventoryTransfer).filter(
        InventoryTransfer.id == uuid.UUID(transfer_id)
    ).first()

    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    transfer.status = TransferStatus.rejected
    transfer.approved_by = current_user.id
    transfer.approved_at = datetime.utcnow()
    db.commit()

    return {"message": "Transfer rejected"}