from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.user import User
from app.services.dependencies import require_admin
from app.imports.jane_import import import_patients, import_sessions, import_invoices
import pandas as pd
import uuid
import io

router = APIRouter(prefix="/import", tags=["Jane Import"])

@router.post("/patients")
async def upload_patients(
    file: UploadFile = File(...),
    clinic_id: str = Form(...),
    branch_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    result = import_patients(df, uuid.UUID(clinic_id), uuid.UUID(branch_id), db)
    return {"message": "Patients imported", "result": result}

@router.post("/sessions")
async def upload_sessions(
    file: UploadFile = File(...),
    clinic_id: str = Form(...),
    branch_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    result = import_sessions(df, uuid.UUID(clinic_id), uuid.UUID(branch_id), db)
    return {"message": "Sessions imported", "result": result}

@router.post("/invoices")
async def upload_invoices(
    file: UploadFile = File(...),
    clinic_id: str = Form(...),
    branch_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    result = import_invoices(df, uuid.UUID(clinic_id), uuid.UUID(branch_id), db)
    return {"message": "Invoices imported", "result": result}