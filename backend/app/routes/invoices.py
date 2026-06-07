from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import date
import uuid

from app.models.database import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.patient import Patient
from app.models.user import User
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/invoices", tags=["Invoices"])

@router.get("/summary")
def get_revenue_summary(
    clinic_id: str = Query(...),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(Invoice).filter(
        Invoice.clinic_id == uuid.UUID(clinic_id)
    )

    if date_from:
        query = query.filter(Invoice.purchase_date >= date_from)
    if date_to:
        query = query.filter(Invoice.purchase_date <= date_to)

    totals = query.with_entities(
        func.sum(Invoice.total),
        func.sum(Invoice.collected),
        func.sum(Invoice.balance),
        func.count(Invoice.id)
    ).first()

    total_billed = float(totals[0] or 0)
    total_collected = float(totals[1] or 0)
    total_outstanding = float(totals[2] or 0)
    total_invoices = int(totals[3] or 0)

    collection_rate = round((total_collected / total_billed * 100), 1) if total_billed > 0 else 0

    return {
        "total_billed": total_billed,
        "total_collected": total_collected,
        "total_outstanding": total_outstanding,
        "total_invoices": total_invoices,
        "collection_rate": collection_rate,
    }

@router.get("/outstanding")
def get_outstanding(
    clinic_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    invoices = db.query(Invoice, Patient).join(
        Patient, Patient.id == Invoice.patient_id
    ).filter(
        Invoice.clinic_id == uuid.UUID(clinic_id),
        Invoice.balance > 0
    ).order_by(Invoice.purchase_date.asc()).all()

    result = []
    for inv, patient in invoices:
        days_outstanding = (date.today() - inv.purchase_date).days if inv.purchase_date else 0
        result.append({
            "invoice_id": str(inv.id),
            "jane_invoice_num": inv.jane_invoice_num,
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "patient_id": str(patient.id),
            "purchase_date": str(inv.purchase_date),
            "total": float(inv.total),
            "collected": float(inv.collected),
            "balance": float(inv.balance),
            "days_outstanding": days_outstanding,
            "status": inv.status.value,
        })

    return result

@router.get("/")
def list_invoices(
    clinic_id: str = Query(...),
    patient_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(Invoice, Patient).join(
        Patient, Patient.id == Invoice.patient_id
    ).filter(
        Invoice.clinic_id == uuid.UUID(clinic_id)
    )

    if patient_id:
        query = query.filter(Invoice.patient_id == uuid.UUID(patient_id))
    if status:
        query = query.filter(Invoice.status == InvoiceStatus(status))
    if date_from:
        query = query.filter(Invoice.purchase_date >= date_from)
    if date_to:
        query = query.filter(Invoice.purchase_date <= date_to)

    results = query.order_by(
        Invoice.purchase_date.desc()
    ).offset(skip).limit(limit).all()

    return [{
        "invoice_id": str(inv.id),
        "jane_invoice_num": inv.jane_invoice_num,
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "patient_id": str(patient.id),
        "purchase_date": str(inv.purchase_date),
        "total": float(inv.total),
        "collected": float(inv.collected),
        "balance": float(inv.balance),
        "status": inv.status.value,
        "income_category": inv.income_category,
        "payer": inv.payer,
    } for inv, patient in results]