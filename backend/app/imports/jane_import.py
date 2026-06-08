import pandas as pd
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.models.session import Session as SessionModel, SessionStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.service import Service, JaneServiceMapping

def clean_str(val):
    s = str(val).strip() if val is not None else ""
    return None if s.lower() in ["", "nan", "none", "nat", "n/a"] else s

def parse_date(val):
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    if s.lower() in ["", "nan", "nat", "none", "n/a"]:
        return None
    # Remove UTC timezone
    s = s.replace(" UTC", "").strip()
    for fmt in [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%m-%d-%Y",
        "%Y-%m-%dT%H:%M:%S",
    ]:
        try:
            return datetime.strptime(s, fmt).date()
        except:
            continue
    return None

def parse_datetime(val):
    if pd.isna(val) or val == "":
        return None
    try:
        return pd.to_datetime(val)
    except:
        return None

def import_patients(df, clinic_id, branch_id, db):
    created = 0
    updated = 0
    errors = []

    df = df.dropna(how="all")
    df.columns = df.columns.str.strip()

    for _, row in df.iterrows():
        try:
            jane_id = clean_str(row.get("patient_guid"))
            if not jane_id:
                continue

            first_name = clean_str(row.get("First Name")) or ""
            last_name = clean_str(row.get("Last Name")) or ""

            if not first_name and not last_name:
                continue

            existing = db.query(Patient).filter(
                Patient.jane_id == jane_id,
                Patient.clinic_id == clinic_id
            ).first()

            data = {
                "jane_id": jane_id,
                "clinic_id": clinic_id,
                "branch_id": branch_id,
                "first_name": first_name,
                "last_name": last_name,
                "preferred_name": clean_str(row.get("Preferred Name")),
                "email": clean_str(row.get("Email")),                   
                "phone": clean_str(row.get("Mobile Phone")),
                "date_of_birth": parse_date(row.get("Birth Date")),
                "street_address": clean_str(row.get("Street Address")),
                "city": clean_str(row.get("City")),
                "province": clean_str(row.get("Province/State")),
                "postal_code": clean_str(row.get("Postal")),                
                "first_visit": parse_date(row.get("First Visit")),
                "last_visit": parse_date(row.get("Last Visit")),
                "is_active": str(row.get("Active", "False")).strip().lower() in ["true", "yes", "1"],
                "imported_at": datetime.utcnow(),
            }

            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                db.add(Patient(**data))
                created += 1

        except Exception as e:
            errors.append(str(e))

    db.commit()
    return {"created": created, "updated": updated, "errors": errors}


def import_sessions(df, clinic_id, branch_id, db):
    created = 0
    skipped = 0
    errors = []

    df = df.dropna(how="all")
    df.columns = df.columns.str.strip()

    for _, row in df.iterrows():
        try:
            jane_id = clean_str(row.get("id"))
            if not jane_id:
                continue

            state = clean_str(row.get("state")) or ""
            if state.lower() in ["cancelled", "canceled", "no_show"]:
                skipped += 1
                continue

            existing = db.query(SessionModel).filter(
                SessionModel.jane_booking_id == jane_id
            ).first()
            if existing:
                skipped += 1
                continue

            patient_guid = clean_str(row.get("patient_guid"))
            patient = db.query(Patient).filter(
                Patient.jane_id == patient_guid,
                Patient.clinic_id == clinic_id
            ).first()

            if not patient:
                skipped += 1
                continue

            treatment_name = clean_str(row.get("treatment_name"))
            service = get_or_map_service(treatment_name, clinic_id, db) if treatment_name else None

            start_at = parse_datetime(row.get("start_at"))
            end_at = parse_datetime(row.get("end_at"))
            duration = None
            if start_at and end_at:
                duration = int((end_at - start_at).total_seconds() / 60)

            session = SessionModel(
                jane_booking_id=jane_id,
                clinic_id=clinic_id,
                branch_id=branch_id,
                patient_id=patient.id,
                service_id=service.id if service else None,
                session_date=start_at.date() if start_at else None,
                session_time=start_at.time() if start_at else None,
                duration_minutes=duration,
                status=SessionStatus.imported,
                imported_at=datetime.utcnow(),
            )
            db.add(session)
            created += 1

        except Exception as e:
            errors.append(str(e))

    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors}


def import_invoices(df, clinic_id, branch_id, db):
    created = 0
    updated = 0
    errors = []

    df = df.dropna(how="all")
    df.columns = df.columns.str.strip()

    for _, row in df.iterrows():
        try:
            invoice_num = clean_str(row.get("Invoice #"))
            if not invoice_num:
                continue

            patient_guid = clean_str(row.get("Patient Guid"))
            patient = db.query(Patient).filter(
                Patient.jane_id == patient_guid,
                Patient.clinic_id == clinic_id
            ).first()

            if not patient:
                continue

            existing = db.query(Invoice).filter(
                Invoice.jane_invoice_num == invoice_num,
                Invoice.clinic_id == clinic_id
            ).first()

            def to_decimal(val):
                try:
                    return float(str(val).replace("$", "").replace(",", "").strip())
                except:
                    return 0.0

            total = to_decimal(row.get("Total", 0))
            collected = to_decimal(row.get("Collected", 0))
            balance = to_decimal(row.get("Balance", 0))
            subtotal = to_decimal(row.get("Subtotal", 0))

            if balance <= 0:
                status = InvoiceStatus.paid
            elif collected > 0:
                status = InvoiceStatus.partial
            else:
                status = InvoiceStatus.unpaid

            data = {
                "clinic_id": clinic_id,
                "branch_id": branch_id,
                "patient_id": patient.id,
                "jane_invoice_num": invoice_num,
                "purchase_date": parse_date(row.get("Purchase Date")),
                "income_category": clean_str(row.get("Income Category")),
                "status": status,
                "subtotal": subtotal,
                "total": total,
                "collected": collected,
                "balance": balance,
                "payer": clean_str(row.get("Payer")),
                "imported_at": datetime.utcnow(),
            }

            if existing:
                for k, v in data.items():
                    setattr(existing, k, v)
                updated += 1
            else:
                db.add(Invoice(**data))
                created += 1

        except Exception as e:
            errors.append(str(e))

    db.commit()
    return {"created": created, "updated": updated, "errors": errors}


def get_or_map_service(jane_name, clinic_id, db):
    if not jane_name:
        return None
    mapping = db.query(JaneServiceMapping).filter(
        JaneServiceMapping.jane_name == jane_name,
        JaneServiceMapping.clinic_id == clinic_id
    ).first()
    if mapping:
        return mapping.service
    existing = db.query(Service).filter(
        Service.name == jane_name,
        Service.clinic_id == clinic_id
    ).first()
    if existing:
        return existing
    service = Service(
        clinic_id=clinic_id,
        name=jane_name,
        is_active=True
    )
    db.add(service)
    db.flush()
    return service