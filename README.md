# ClinicHub — Multi-Clinic Management & BI Platform

A full-stack data platform built for a multi-location healthcare business, featuring an automated **ETL pipeline**, financial analytics engine, and role-based operational dashboards.

Built end-to-end: database design, REST API, data import pipeline, automated tests, and React frontend.

---

## 🔧 Tech Stack

**Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic, JWT Auth
**Frontend:** React, Recharts
**Testing:** pytest
**Data Processing:** pandas, openpyxl

---

## 📊 Overview Dashboard

Real-time KPIs across two clinic locations — revenue, collections, outstanding balances, and service-level P&L, all computed from imported operational data.

![Overview Dashboard](overview.png)

---

## 🔄 ETL Pipeline — Jane App Data Import

The core of this project is a CSV-based ETL pipeline that ingests data exported from a third-party practice management system (Jane App) and transforms it into a normalized relational schema.

**Pipeline handles:**
- Extraction from CSVs with inconsistent column naming, whitespace, and encoding
- Date parsing across multiple formats (`2024-08-27 18:30:00 UTC`, `11/8/1986`, etc.)
- Boolean normalization (`True`/`False` → internal active flags)
- **Duplicate detection** — re-importing the same file updates existing records instead of creating duplicates
- Foreign key resolution — matching patients across separate Clients, Sessions, and Sales exports by unique ID
- Auto-mapping of service line items into a normalized service catalog

Result: **707 patients, 2,080 sessions, 2,081 invoices** imported with zero data-integrity errors.

![Jane Import](jane-import.png)

---

## 🧪 Automated Testing — pytest

API endpoints are covered with a pytest test suite, including authentication flows, permission checks, and edge cases (invalid credentials, missing auth tokens, nonexistent users).

```bash
pytest tests/ -v
```

![pytest results](pytest-results.png)

```
tests/test_auth.py::test_login_success            PASSED
tests/test_auth.py::test_login_wrong_password      PASSED
tests/test_auth.py::test_login_nonexistent_user     PASSED
tests/test_auth.py::test_me_requires_auth           PASSED
tests/test_auth.py::test_me_with_valid_token        PASSED
```

---

## 💰 Financial Analytics & Forecasting

Revenue trend analysis with configurable lookback windows (3/6/12 months), combined with a forward-looking forecast model based on rolling baselines — giving owners visibility into projected profit 3–12 months out.

![Finance Dashboard](finance.png)

---

## 👤 Patient Profiles — Data Aggregation

Each patient profile aggregates session history, billing data, and assessment records from multiple imported sources into a single view, with service-level breakdowns and cumulative visit tracking.

![Patient Profile](patient-profile.png)

---

## 🏗️ Architecture Highlights

- **Role-based access control** — JWT auth with admin/receptionist permission tiers
- **FIFO payment allocation engine** — automatically applies payments to oldest outstanding invoices
- **25-table relational schema** with Alembic migrations
- **Reusable sorting hook** (`useSort`) applied across all data tables
- **Excel import pipeline** for expenses and payments with dynamic header detection

---

## 📁 Project Structure

```
backend/
  app/
    models/        # SQLAlchemy models (25 tables)
    routes/         # FastAPI route handlers
    imports/        # ETL pipeline (Jane CSV import)
    services/       # Auth, business logic
  tests/            # pytest test suite
  alembic/          # Database migrations

frontend/
  src/
    pages/          # React pages (Overview, Finance, Patients, etc.)
    components/     # Shared UI components
    hooks/          # useAuth, useSort
    services/       # API client
```

---

## 🚀 Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm start

# Run tests
cd backend
pytest tests/ -v
```

---

*Note: Screenshots show sample/anonymized data. Patient information has been redacted.*
