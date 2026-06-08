from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routes import auth, imports, patients, staff, invoices, payments, expenses, analytics,inventory,devices

load_dotenv()

app = FastAPI(
    title="ClinicHub API",
    description="Multi-clinic management platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(imports.router)
app.include_router(patients.router)
app.include_router(staff.router)
app.include_router(invoices.router)
app.include_router(payments.router)
app.include_router(expenses.router)
app.include_router(analytics.router)
app.include_router(inventory.router)
app.include_router(devices.router)




@app.get("/")
def root():
    return {"message": "ClinicHub API is running"}