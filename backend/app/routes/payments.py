from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
import uuid

from app.models.database import get_db
from app.models.payment import PatientPayment, PaymentAllocation, PaymentMethodType
from app.models.invoice import Invoice, InvoiceStatus
from app.models.patient import Patient
from app.models.user import User
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/payments", tags=["Payments"])

class PaymentCreate(BaseModel):
    clinic_id: str
    patient_id: str
    amount: float
    method: str
    reference_num: Optional[str] = None
    payment_date: datetime
    notes: Optional[str] = None

class DuplicateOverride(BaseModel):
    override_reason: str

def apply_fifo(payment: PatientPayment, db: Session):
    remaining = float(payment.amount)
    unpaid_invoices = db.query(Invoice).filter(
        Invoice.patient_id == payment.patient_id,
        Invoice.balance > 0
    ).order_by(Invoice.purchase_date.asc()).all()

    for invoice in unpaid_invoices:
        if remaining <= 0:
            break
        invoice_balance = float(invoice.balance)
        apply_amount = min(remaining, invoice_balance)
        invoice.collected = float(invoice.collected) + apply_amount
        invoice.balance = float(invoice.balance) - apply_amount
        if invoice.balance <= 0:
            invoice.balance = 0
            invoice.status = InvoiceStatus.paid
        else:
            invoice.status = InvoiceStatus.partial

        allocation = PaymentAllocation(
            payment_id=payment.id,
            invoice_id=invoice.id,
            amount_applied=apply_amount,
        )
        db.add(allocation)
        remaining -= apply_amount

    db.commit()

@router.post("/")
def record_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check for duplicate reference number
    if data.reference_num:
        existing = db.query(PatientPayment).filter(
            PatientPayment.clinic_id == uuid.UUID(data.clinic_id),
            PatientPayment.reference_num == data.reference_num,
            PatientPayment.duplicate_override == False
        ).first()

        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Duplicate reference number detected",
                    "existing_payment": {
                        "date": str(existing.payment_date),
                        "amount": float(existing.amount),
                        "method": existing.method.value,
                    },
                    "requires_override": True
                }
            )

    payment = PatientPayment(
        clinic_id=uuid.UUID(data.clinic_id),
        patient_id=uuid.UUID(data.patient_id),
        amount=data.amount,
        method=PaymentMethodType(data.method),
        reference_num=data.reference_num,
        payment_date=data.payment_date,
        notes=data.notes,
        recorded_by=current_user.id,
    )
    db.add(payment)
    db.flush()

    apply_fifo(payment, db)

    return {
        "message": "Payment recorded and applied",
        "payment_id": str(payment.id),
        "amount": data.amount,
        "method": data.method,
    }

@router.post("/{payment_id}/override")
def override_duplicate(
    payment_id: str,
    data: DuplicateOverride,
    original_payment: PaymentCreate = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    payment = PatientPayment(
        clinic_id=uuid.UUID(original_payment.clinic_id),
        patient_id=uuid.UUID(original_payment.patient_id),
        amount=original_payment.amount,
        method=PaymentMethodType(original_payment.method),
        reference_num=original_payment.reference_num,
        payment_date=original_payment.payment_date,
        notes=original_payment.notes,
        duplicate_override=True,
        override_reason=data.override_reason,
        override_by=current_user.id,
        override_at=datetime.utcnow(),
        recorded_by=current_user.id,
    )
    db.add(payment)
    db.flush()
    apply_fifo(payment, db)

    return {"message": "Payment recorded with override", "payment_id": str(payment.id)}

@router.get("/patient/{patient_id}")
def get_patient_payments(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payments = db.query(PatientPayment).filter(
        PatientPayment.patient_id == uuid.UUID(patient_id)
    ).order_by(PatientPayment.payment_date.desc()).all()

    return [{
        "id": str(p.id),
        "amount": float(p.amount),
        "method": p.method.value,
        "reference_num": p.reference_num,
        "payment_date": str(p.payment_date),
        "notes": p.notes,
        "duplicate_override": p.duplicate_override,
    } for p in payments]