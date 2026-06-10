from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import uuid

from app.models.database import get_db
from app.models.service import Service, AssessmentType
from app.models.user import User
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/services", tags=["Services"])

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    duration_minutes: Optional[int] = None
    assessment_type: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceCreate(BaseModel):
    clinic_id: str
    name: str
    description: Optional[str] = None
    base_price: Optional[float] = None
    duration_minutes: Optional[int] = None
    assessment_type: Optional[str] = 'none'

@router.get("/")
def list_services(
    clinic_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    services = db.query(Service).filter(
        Service.clinic_id == uuid.UUID(clinic_id)
    ).order_by(Service.name).all()

    return [{
        "id": str(s.id),
        "name": s.name,
        "jane_name": s.name,
        "description": s.description,
        "base_price": float(s.base_price) if s.base_price else None,
        "duration_minutes": s.duration_minutes,
        "assessment_type": s.assessment_type.value if s.assessment_type else "none",
        "is_active": s.is_active,
    } for s in services]

@router.post("/")
def create_service(
    data: ServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    service = Service(
        clinic_id=uuid.UUID(data.clinic_id),
        name=data.name,
        description=data.description,
        base_price=data.base_price,
        duration_minutes=data.duration_minutes,
        assessment_type=AssessmentType(data.assessment_type) if data.assessment_type and data.assessment_type != 'none' else None,
        is_active=True,
    )
    db.add(service)
    db.commit()
    return {"message": "Service created", "id": str(service.id)}

@router.patch("/{service_id}")
def update_service(
    service_id: str,
    data: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    service = db.query(Service).filter(
        Service.id == uuid.UUID(service_id)
    ).first()

    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    if data.name is not None: service.name = data.name
    if data.description is not None: service.description = data.description
    if data.base_price is not None: service.base_price = data.base_price
    if data.duration_minutes is not None: service.duration_minutes = data.duration_minutes
    if data.assessment_type is not None:
        service.assessment_type = AssessmentType(data.assessment_type) if data.assessment_type != 'none' else None
    if data.is_active is not None: service.is_active = data.is_active

    db.commit()
    return {"message": "Service updated"}