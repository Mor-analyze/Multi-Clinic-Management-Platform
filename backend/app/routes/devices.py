from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
import uuid

from app.models.database import get_db
from app.models.device import Device, DeviceMaintenance, MaintenanceType
from app.models.user import User
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/devices", tags=["Devices"])

# ── SCHEMAS ───────────────────────────────────────────────────
class DeviceCreate(BaseModel):
    branch_id: str
    name: str
    purchase_cost: float
    purchase_date: Optional[date] = None
    next_maintenance_date: Optional[date] = None
    maintenance_alert_date: Optional[date] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    next_maintenance_date: Optional[date] = None
    maintenance_alert_date: Optional[date] = None
    is_active: Optional[bool] = None

class MaintenanceCreate(BaseModel):
    device_id: str
    date: date
    type: str
    cost: float
    technician: Optional[str] = None
    notes: Optional[str] = None
    downtime_hours: Optional[float] = None
    next_maintenance_date: Optional[date] = None

# ── DEVICES ───────────────────────────────────────────────────
@router.get("/")
def list_devices(
    branch_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    devices = db.query(Device).filter(
        Device.branch_id == uuid.UUID(branch_id),
        Device.is_active == True
    ).all()

    result = []
    for d in devices:
        # Total maintenance cost
        total_maintenance = db.query(
            func.sum(DeviceMaintenance.cost)
        ).filter(
            DeviceMaintenance.device_id == d.id
        ).scalar() or 0
        total_maintenance = float(total_maintenance)

        # Maintenance count
        maintenance_count = db.query(
            func.count(DeviceMaintenance.id)
        ).filter(
            DeviceMaintenance.device_id == d.id
        ).scalar() or 0

        purchase_cost = float(d.purchase_cost or 0)
        total_cost = purchase_cost + total_maintenance

        # Check maintenance alert
        maintenance_due = False
        if d.maintenance_alert_date:
            maintenance_due = d.maintenance_alert_date <= date.today()

        result.append({
            "id": str(d.id),
            "name": d.name,
            "branch_id": str(d.branch_id),
            "purchase_cost": purchase_cost,
            "purchase_date": str(d.purchase_date) if d.purchase_date else None,
            "total_maintenance_cost": total_maintenance,
            "total_cost": total_cost,
            "maintenance_count": maintenance_count,
            "next_maintenance_date": str(d.next_maintenance_date) if d.next_maintenance_date else None,
            "maintenance_alert_date": str(d.maintenance_alert_date) if d.maintenance_alert_date else None,
            "maintenance_due": maintenance_due,
            "is_active": d.is_active,
        })

    return result

@router.post("/")
def create_device(
    data: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    device = Device(
        branch_id=uuid.UUID(data.branch_id),
        name=data.name,
        purchase_cost=data.purchase_cost,
        purchase_date=data.purchase_date,
        next_maintenance_date=data.next_maintenance_date,
        maintenance_alert_date=data.maintenance_alert_date,
        is_active=True,
    )
    db.add(device)
    db.commit()
    return {"message": "Device created", "id": str(device.id)}

@router.patch("/{device_id}")
def update_device(
    device_id: str,
    data: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    device = db.query(Device).filter(
        Device.id == uuid.UUID(device_id)
    ).first()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if data.name is not None:
        device.name = data.name
    if data.next_maintenance_date is not None:
        device.next_maintenance_date = data.next_maintenance_date
    if data.maintenance_alert_date is not None:
        device.maintenance_alert_date = data.maintenance_alert_date
    if data.is_active is not None:
        device.is_active = data.is_active

    db.commit()
    return {"message": "Device updated"}

# ── MAINTENANCE ───────────────────────────────────────────────
@router.get("/{device_id}/maintenance")
def get_maintenance_log(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    logs = db.query(DeviceMaintenance).filter(
        DeviceMaintenance.device_id == uuid.UUID(device_id)
    ).order_by(DeviceMaintenance.date.desc()).all()

    return [{
        "id": str(log.id),
        "date": str(log.date),
        "type": log.type.value,
        "cost": float(log.cost or 0),
        "technician": log.technician,
        "notes": log.notes,
        "downtime_hours": float(log.downtime_hours or 0),
        "next_maintenance_date": str(log.next_maintenance_date) if log.next_maintenance_date else None,
    } for log in logs]

@router.post("/maintenance")
def add_maintenance(
    data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    device = db.query(Device).filter(
        Device.id == uuid.UUID(data.device_id)
    ).first()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    log = DeviceMaintenance(
        device_id=uuid.UUID(data.device_id),
        date=data.date,
        type=MaintenanceType(data.type),
        cost=data.cost,
        technician=data.technician,
        notes=data.notes,
        downtime_hours=data.downtime_hours,
        next_maintenance_date=data.next_maintenance_date,
        created_by=current_user.id,
    )
    db.add(log)

    # Update device next maintenance date
    if data.next_maintenance_date:
        device.next_maintenance_date = data.next_maintenance_date

    db.commit()
    return {"message": "Maintenance logged", "id": str(log.id)}

@router.get("/maintenance/due")
def get_maintenance_due(
    branch_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    today = date.today()
    devices = db.query(Device).filter(
        Device.branch_id == uuid.UUID(branch_id),
        Device.is_active == True,
        Device.maintenance_alert_date <= today
    ).all()

    return [{
        "id": str(d.id),
        "name": d.name,
        "maintenance_alert_date": str(d.maintenance_alert_date),
        "next_maintenance_date": str(d.next_maintenance_date) if d.next_maintenance_date else None,
        "days_overdue": (today - d.maintenance_alert_date).days,
    } for d in devices]