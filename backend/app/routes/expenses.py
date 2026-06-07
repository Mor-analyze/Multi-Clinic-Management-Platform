from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
import uuid

from app.models.database import get_db
from app.models.expense import Expense, ExpenseSubcategory, ExpenseCategory
from app.models.user import User
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/expenses", tags=["Expenses"])

class SubcategoryCreate(BaseModel):
    clinic_id: str
    category: str
    name: str

class ExpenseCreate(BaseModel):
    clinic_id: str
    branch_id: str
    subcategory_id: str
    amount: float
    description: Optional[str] = None
    expense_date: date
    reference_num: Optional[str] = None

class OverrideData(BaseModel):
    override_reason: str

@router.get("/subcategories")
def list_subcategories(
    clinic_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subs = db.query(ExpenseSubcategory).filter(
        ExpenseSubcategory.clinic_id == uuid.UUID(clinic_id),
        ExpenseSubcategory.is_active == True
    ).order_by(ExpenseSubcategory.category, ExpenseSubcategory.name).all()

    return [{
        "id": str(s.id),
        "category": s.category.value,
        "name": s.name,
    } for s in subs]

@router.post("/subcategories")
def create_subcategory(
    data: SubcategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    sub = ExpenseSubcategory(
        clinic_id=uuid.UUID(data.clinic_id),
        category=ExpenseCategory(data.category),
        name=data.name,
        is_active=True,
    )
    db.add(sub)
    db.commit()
    return {"message": "Subcategory created", "id": str(sub.id)}

@router.post("/")
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Check duplicate reference number
    if data.reference_num:
        existing = db.query(Expense).filter(
            Expense.clinic_id == uuid.UUID(data.clinic_id),
            Expense.reference_num == data.reference_num,
            Expense.duplicate_override == False
        ).first()

        if existing:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Duplicate reference number detected",
                    "existing_expense": {
                        "date": str(existing.expense_date),
                        "amount": float(existing.amount),
                        "description": existing.description,
                    },
                    "requires_override": True
                }
            )

    expense = Expense(
        clinic_id=uuid.UUID(data.clinic_id),
        branch_id=uuid.UUID(data.branch_id),
        subcategory_id=uuid.UUID(data.subcategory_id),
        amount=data.amount,
        description=data.description,
        expense_date=data.expense_date,
        reference_num=data.reference_num,
        recorded_by=current_user.id,
    )
    db.add(expense)
    db.commit()

    return {"message": "Expense recorded", "id": str(expense.id)}

@router.get("/")
def list_expenses(
    clinic_id: str = Query(...),
    category: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(Expense, ExpenseSubcategory).join(
        ExpenseSubcategory,
        ExpenseSubcategory.id == Expense.subcategory_id
    ).filter(Expense.clinic_id == uuid.UUID(clinic_id))

    if category:
        query = query.filter(
            ExpenseSubcategory.category == ExpenseCategory(category)
        )
    if date_from:
        query = query.filter(Expense.expense_date >= date_from)
    if date_to:
        query = query.filter(Expense.expense_date <= date_to)

    results = query.order_by(
        Expense.expense_date.desc()
    ).offset(skip).limit(limit).all()

    return [{
        "id": str(e.id),
        "category": sub.category.value,
        "subcategory": sub.name,
        "amount": float(e.amount),
        "description": e.description,
        "expense_date": str(e.expense_date),
        "reference_num": e.reference_num,
    } for e, sub in results]

@router.get("/summary")
def expense_summary(
    clinic_id: str = Query(...),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(
        ExpenseSubcategory.category,
        func.sum(Expense.amount)
    ).join(
        ExpenseSubcategory,
        ExpenseSubcategory.id == Expense.subcategory_id
    ).filter(Expense.clinic_id == uuid.UUID(clinic_id))

    if date_from:
        query = query.filter(Expense.expense_date >= date_from)
    if date_to:
        query = query.filter(Expense.expense_date <= date_to)

    results = query.group_by(ExpenseSubcategory.category).all()

    summary = {"fixed": 0, "operations": 0, "office": 0, "total": 0}
    for category, total in results:
        summary[category.value] = float(total or 0)
        summary["total"] += float(total or 0)

    return summary