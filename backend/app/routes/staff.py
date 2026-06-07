from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import date
from decimal import Decimal
import uuid

from app.models.database import get_db
from app.models.staff import Staff, StaffWageHistory
from app.models.session import Session as SessionModel
from app.models.invoice import Invoice
from app.models.user import User
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/staff", tags=["Staff"])

class StaffCreate(BaseModel):
    branch_id: str
    full_name: str
    job_title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    hourly_rate: float
    hired_at: Optional[date] = None

class StaffResponse(BaseModel):
    id: str
    branch_id: str
    full_name: str
    job_title: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    is_active: bool
    hired_at: Optional[date]
    current_hourly_rate: Optional[float]
    total_sessions: Optional[int] = 0
    total_revenue: Optional[float] = 0
    net_contribution: Optional[float] = 0
    signal: Optional[str] = "watch"

@router.get("/", response_model=List[StaffResponse])
def list_staff(
    branch_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    staff_list = db.query(Staff).filter(
        Staff.branch_id == uuid.UUID(branch_id),
        Staff.is_active == True
    ).all()

    result = []
    for s in staff_list:
        # Get current wage
        current_wage = db.query(StaffWageHistory).filter(
            StaffWageHistory.staff_id == s.id,
            StaffWageHistory.effective_to == None
        ).order_by(StaffWageHistory.effective_from.desc()).first()

        hourly_rate = float(current_wage.hourly_rate) if current_wage else 0

        # Total sessions
        total_sessions = db.query(func.count(SessionModel.id)).filter(
            SessionModel.staff_id == s.id
        ).scalar() or 0

        # Revenue generated — sum invoices for sessions this staff performed
        total_revenue = db.query(func.sum(Invoice.total)).join(
            SessionModel, SessionModel.patient_id == Invoice.patient_id
        ).filter(
            SessionModel.staff_id == s.id
        ).scalar() or 0
        total_revenue = float(total_revenue)

        # Monthly wage estimate
        hours = float(s.default_hours_per_month or 0)
        monthly_wage = hours * hourly_rate

        # Net contribution
        net_contribution = total_revenue - monthly_wage

        # Signal — revenue must be at least 3x wage
        if monthly_wage == 0:
            signal = "watch"
        elif total_revenue >= monthly_wage * 3:
            signal = "keep"
        elif total_revenue >= monthly_wage * 1.5:
            signal = "watch"
        else:
            signal = "review"

        result.append(StaffResponse(
            id=str(s.id),
            branch_id=str(s.branch_id),
            full_name=s.full_name,
            job_title=s.job_title,
            email=s.email,
            phone=s.phone,
            is_active=s.is_active,
            hired_at=s.hired_at,
            current_hourly_rate=hourly_rate,
            total_sessions=total_sessions,
            total_revenue=total_revenue,
            net_contribution=net_contribution,
            signal=signal,
        ))

    return result

@router.post("/")
def create_staff(
    data: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    staff = Staff(
        branch_id=uuid.UUID(data.branch_id),
        full_name=data.full_name,
        job_title=data.job_title,
        email=data.email,
        phone=data.phone,
        hired_at=data.hired_at,
        is_active=True,
    )
    db.add(staff)
    db.flush()

    # Create initial wage history record
    wage = StaffWageHistory(
        staff_id=staff.id,
        hourly_rate=data.hourly_rate,
        effective_from=data.hired_at or date.today(),
        effective_to=None,
        changed_by=current_user.id,
    )
    db.add(wage)
    db.commit()

    return {"message": "Staff created", "id": str(staff.id)}

@router.patch("/{staff_id}/wage")
def update_wage(
    staff_id: str,
    new_rate: float,
    effective_from: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Close current wage record
    current = db.query(StaffWageHistory).filter(
        StaffWageHistory.staff_id == uuid.UUID(staff_id),
        StaffWageHistory.effective_to == None
    ).first()

    if current:
        current.effective_to = effective_from

    # Create new wage record
    new_wage = StaffWageHistory(
        staff_id=uuid.UUID(staff_id),
        hourly_rate=new_rate,
        effective_from=effective_from,
        effective_to=None,
        changed_by=current_user.id,
    )
    db.add(new_wage)
    db.commit()

    return {"message": "Wage updated", "new_rate": new_rate}