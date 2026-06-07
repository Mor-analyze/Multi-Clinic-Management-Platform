from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import date
import uuid

from app.models.database import get_db
from app.models.patient import Patient
from app.models.session import Session as SessionModel, SessionStatus
from app.models.invoice import Invoice
from app.models.service import Service, AssessmentType
from app.models.user import User
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/patients", tags=["Patients"])

# ── SCHEMAS ───────────────────────────────────────────────────
class PatientResponse(BaseModel):
    id: str
    jane_id: Optional[str]
    first_name: str
    last_name: str
    preferred_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    date_of_birth: Optional[date]
    street_address: Optional[str]
    city: Optional[str]
    province: Optional[str]
    postal_code: Optional[str]
    first_visit: Optional[date]
    last_visit: Optional[date]
    is_active: bool
    total_sessions: Optional[int] = 0
    total_cost: Optional[float] = 0
    total_discounts: Optional[float] = 0

    class Config:
        from_attributes = True

class SessionResponse(BaseModel):
    id: str
    session_date: Optional[date]
    session_time: Optional[str]
    service_name: Optional[str]
    service_assessment_type: Optional[str]
    staff_name: Optional[str]
    duration_minutes: Optional[int]
    notes: Optional[str]
    status: Optional[str]
    cost: Optional[float] = 0
    collected: Optional[float] = 0
    balance: Optional[float] = 0

# ── ENDPOINTS ─────────────────────────────────────────────────
@router.get("/", response_model=List[PatientResponse])
def list_patients(
    clinic_id: str = Query(...),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient).filter(
        Patient.clinic_id == uuid.UUID(clinic_id)
    )

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Patient.first_name.ilike(search_term)) |
            (Patient.last_name.ilike(search_term)) |
            (Patient.email.ilike(search_term)) |
            (Patient.phone.ilike(search_term))
        )

    if is_active is not None:
        query = query.filter(Patient.is_active == is_active)

    patients = query.order_by(Patient.last_name).offset(skip).limit(limit).all()

    result = []
    for p in patients:
        total_sessions = db.query(func.count(SessionModel.id)).filter(
            SessionModel.patient_id == p.id
        ).scalar() or 0

        invoice_totals = db.query(
            func.sum(Invoice.total),
            func.sum(Invoice.collected)
        ).filter(Invoice.patient_id == p.id).first()

        total_cost = float(invoice_totals[0] or 0)
        total_collected = float(invoice_totals[1] or 0)
        total_discounts = total_cost - total_collected

        result.append(PatientResponse(
            id=str(p.id),
            jane_id=p.jane_id,
            first_name=p.first_name,
            last_name=p.last_name,
            preferred_name=p.preferred_name,
            email=p.email,
            phone=p.phone,
            date_of_birth=p.date_of_birth,
            street_address=p.street_address,
            city=p.city,
            province=p.province,
            postal_code=p.postal_code,
            first_visit=p.first_visit,
            last_visit=p.last_visit,
            is_active=p.is_active,
            total_sessions=total_sessions,
            total_cost=total_cost,
            total_discounts=max(total_discounts, 0),
        ))

    return result


@router.get("/{patient_id}")
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == uuid.UUID(patient_id)
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get all sessions with service info
    sessions = db.query(SessionModel).filter(
        SessionModel.patient_id == patient.id
    ).order_by(SessionModel.session_date.desc()).all()

    regular_sessions = []
    assessments = []

    for s in sessions:
        service = db.query(Service).filter(
            Service.id == s.service_id
        ).first() if s.service_id else None

        invoice = db.query(Invoice).filter(
            Invoice.patient_id == patient.id,
            func.date(Invoice.purchase_date) == s.session_date
        ).first()

        session_data = {
            "id": str(s.id),
            "session_date": str(s.session_date) if s.session_date else None,
            "session_time": str(s.session_time) if s.session_time else None,
            "service_name": service.name if service else None,
            "service_assessment_type": service.assessment_type.value if service and service.assessment_type else "none",            "duration_minutes": s.duration_minutes,
            "notes": s.notes,
            "status": s.status.value if s.status else None,
            "cost": float(invoice.total) if invoice else 0,
            "collected": float(invoice.collected) if invoice else 0,
            "balance": float(invoice.balance) if invoice else 0,
        }

        if service and service.assessment_type != AssessmentType.none:
            assessments.append(session_data)
        else:
            regular_sessions.append(session_data)

    # Invoice totals
    invoice_totals = db.query(
        func.sum(Invoice.total),
        func.sum(Invoice.collected),
        func.sum(Invoice.balance)
    ).filter(Invoice.patient_id == patient.id).first()

    return {
        "patient": {
            "id": str(patient.id),
            "jane_id": patient.jane_id,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "preferred_name": patient.preferred_name,
            "email": patient.email,
            "phone": patient.phone,
            "date_of_birth": str(patient.date_of_birth) if patient.date_of_birth else None,
            "street_address": patient.street_address,
            "city": patient.city,
            "province": patient.province,
            "postal_code": patient.postal_code,
            "first_visit": str(patient.first_visit) if patient.first_visit else None,
            "last_visit": str(patient.last_visit) if patient.last_visit else None,
            "is_active": patient.is_active,
        },
        "regular_sessions": regular_sessions,
        "assessments": assessments,
        "totals": {
            "total_sessions": len(sessions),
            "total_billed": float(invoice_totals[0] or 0),
            "total_collected": float(invoice_totals[1] or 0),
            "total_outstanding": float(invoice_totals[2] or 0),
        }
    }


@router.patch("/{patient_id}")
def update_patient(
    patient_id: str,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == uuid.UUID(patient_id)
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    allowed_fields = [
        "first_name", "last_name", "preferred_name",
        "email", "phone", "street_address", "city",
        "province", "postal_code", "is_active"
    ]

    for key, value in updates.items():
        if key in allowed_fields:
            setattr(patient, key, value)

    db.commit()
    return {"message": "Patient updated"}