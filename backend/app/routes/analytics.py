from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
import uuid

from app.models.database import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.session import Session as SessionModel
from app.models.service import Service, AssessmentType
from app.models.expense import Expense, ExpenseSubcategory
from app.models.staff import Staff, StaffWageHistory
from app.models.device import Device, DeviceMaintenance
from app.models.patient import Patient
from app.models.user import User
from app.services.dependencies import require_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# ── P&L PER SERVICE ───────────────────────────────────────────
@router.get("/services/pnl")
def service_pnl(
    clinic_id: str = Query(...),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    services = db.query(Service).filter(
        Service.clinic_id == uuid.UUID(clinic_id),
        Service.is_active == True
    ).all()

    result = []
    for service in services:
        # Sessions for this service
        session_query = db.query(SessionModel).filter(
            SessionModel.service_id == service.id
        )
        if date_from:
            session_query = session_query.filter(SessionModel.session_date >= date_from)
        if date_to:
            session_query = session_query.filter(SessionModel.session_date <= date_to)

        sessions = session_query.all()
        total_sessions = len(sessions)

        # Revenue from invoices matched by patient + date
        revenue = 0
        collected = 0
        for s in sessions:
            inv = db.query(Invoice).filter(
                Invoice.patient_id == s.patient_id,
                func.date(Invoice.purchase_date) == s.session_date
            ).first()
            if inv:
                revenue += float(inv.total or 0)
                collected += float(inv.collected or 0)

        result.append({
            "service_id": str(service.id),
            "service_name": service.name,
            "assessment_type": service.assessment_type.value if service.assessment_type else "none",
            "total_sessions": total_sessions,
            "total_billed": round(revenue, 2),
            "total_collected": round(collected, 2),
            "avg_per_session": round(revenue / total_sessions, 2) if total_sessions > 0 else 0,
        })

    return sorted(result, key=lambda x: x["total_billed"], reverse=True)


# ── DEVICE ROI ────────────────────────────────────────────────
@router.get("/devices/roi")
def device_roi(
    branch_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    devices = db.query(Device).filter(
        Device.branch_id == uuid.UUID(branch_id),
        Device.is_active == True
    ).all()

    result = []
    for device in devices:
        # Total maintenance cost
        total_maintenance = db.query(
            func.sum(DeviceMaintenance.cost)
        ).filter(
            DeviceMaintenance.device_id == device.id
        ).scalar() or 0

        purchase_cost = float(device.purchase_cost or 0)
        total_maintenance = float(total_maintenance)
        total_cost = purchase_cost + total_maintenance

        # Monthly revenue (last 6 months average)
        six_months_ago = date.today() - relativedelta(months=6)
        monthly_revenue = db.query(
            func.sum(Invoice.total)
        ).join(
            SessionModel, SessionModel.patient_id == Invoice.patient_id
        ).filter(
            Invoice.purchase_date >= six_months_ago
        ).scalar() or 0
        monthly_revenue = float(monthly_revenue) / 6

        # ROI
        total_revenue = monthly_revenue * 6
        roi = round(((total_revenue - total_cost) / total_cost * 100), 1) if total_cost > 0 else 0
        recovered_pct = round((total_revenue / purchase_cost * 100), 1) if purchase_cost > 0 else 0

        # Break-even months remaining
        net_monthly = monthly_revenue - (total_maintenance / 12)
        remaining_cost = purchase_cost - total_revenue
        breakeven_months = round(remaining_cost / net_monthly) if net_monthly > 0 and remaining_cost > 0 else 0

        status = "profitable" if recovered_pct >= 100 else "watch" if recovered_pct >= 35 else "loss"

        result.append({
            "device_id": str(device.id),
            "device_name": device.name,
            "purchase_cost": purchase_cost,
            "purchase_date": str(device.purchase_date) if device.purchase_date else None,
            "total_maintenance": total_maintenance,
            "total_cost": total_cost,
            "monthly_revenue_avg": round(monthly_revenue, 2),
            "recovered_pct": recovered_pct,
            "roi_pct": roi,
            "breakeven_months_remaining": max(breakeven_months, 0),
            "status": status,
        })

    return result


# ── REVENUE TREND ─────────────────────────────────────────────
@router.get("/revenue/trend")
def revenue_trend(
    clinic_id: str = Query(...),
    months: int = Query(6),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    result = []
    for i in range(months - 1, -1, -1):
        month_start = date.today().replace(day=1) - relativedelta(months=i)
        month_end = month_start + relativedelta(months=1) - relativedelta(days=1)

        totals = db.query(
            func.sum(Invoice.total),
            func.sum(Invoice.collected),
        ).filter(
            Invoice.clinic_id == uuid.UUID(clinic_id),
            Invoice.purchase_date >= month_start,
            Invoice.purchase_date <= month_end,
        ).first()

        expenses = db.query(
            func.sum(Expense.amount)
        ).filter(
            Expense.clinic_id == uuid.UUID(clinic_id),
            Expense.expense_date >= month_start,
            Expense.expense_date <= month_end,
        ).scalar() or 0

        billed = float(totals[0] or 0)
        collected = float(totals[1] or 0)
        exp = float(expenses)
        profit = collected - exp

        result.append({
            "month": month_start.strftime("%b %Y"),
            "billed": round(billed, 2),
            "collected": round(collected, 2),
            "expenses": round(exp, 2),
            "profit": round(profit, 2),
        })

    return result


# ── FINANCIAL FORECAST ────────────────────────────────────────
@router.get("/forecast")
def financial_forecast(
    clinic_id: str = Query(...),
    months_ahead: int = Query(6),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Use last 3 months as baseline
    three_months_ago = date.today() - relativedelta(months=3)

    avg_revenue = db.query(
        func.sum(Invoice.collected)
    ).filter(
        Invoice.clinic_id == uuid.UUID(clinic_id),
        Invoice.purchase_date >= three_months_ago
    ).scalar() or 0
    avg_monthly_revenue = float(avg_revenue) / 3

    avg_expenses = db.query(
        func.sum(Expense.amount)
    ).filter(
        Expense.clinic_id == uuid.UUID(clinic_id),
        Expense.expense_date >= three_months_ago
    ).scalar() or 0
    avg_monthly_expenses = float(avg_expenses) / 3

    result = []
    for i in range(1, months_ahead + 1):
        future_month = date.today().replace(day=1) + relativedelta(months=i)
        projected_profit = avg_monthly_revenue - avg_monthly_expenses

        result.append({
            "month": future_month.strftime("%b %Y"),
            "projected_revenue": round(avg_monthly_revenue, 2),
            "projected_expenses": round(avg_monthly_expenses, 2),
            "projected_profit": round(projected_profit, 2),
            "is_positive": projected_profit > 0,
        })

    return {
        "baseline_monthly_revenue": round(avg_monthly_revenue, 2),
        "baseline_monthly_expenses": round(avg_monthly_expenses, 2),
        "forecast": result,
    }


# ── CLINIC OVERVIEW KPIs ──────────────────────────────────────
@router.get("/overview")
def clinic_overview(
    clinic_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # This month
    today = date.today()
    month_start = today.replace(day=1)

    # Revenue
    revenue = db.query(
        func.sum(Invoice.total),
        func.sum(Invoice.collected),
        func.sum(Invoice.balance),
    ).filter(
        Invoice.clinic_id == uuid.UUID(clinic_id),
        Invoice.purchase_date >= month_start,
    ).first()

    # Sessions
    total_sessions = db.query(func.count(SessionModel.id)).filter(
        SessionModel.clinic_id == uuid.UUID(clinic_id),
        SessionModel.session_date >= month_start,
    ).scalar() or 0

    # Expenses
    total_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.clinic_id == uuid.UUID(clinic_id),
        Expense.expense_date >= month_start,
    ).scalar() or 0

    # Patients
    total_patients = db.query(func.count(Patient.id)).filter(
        Patient.clinic_id == uuid.UUID(clinic_id),
        Patient.is_active == True,
    ).scalar() or 0

    billed = float(revenue[0] or 0)
    collected = float(revenue[1] or 0)
    outstanding = float(revenue[2] or 0)
    expenses = float(total_expenses or 0)
    profit = collected - expenses

    return {
        "period": month_start.strftime("%B %Y"),
        "total_billed": billed,
        "total_collected": collected,
        "total_outstanding": outstanding,
        "total_expenses": expenses,
        "net_profit": profit,
        "total_sessions": total_sessions,
        "total_active_patients": total_patients,
        "collection_rate": round(collected / billed * 100, 1) if billed > 0 else 0,
    }