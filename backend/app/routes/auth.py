from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from app.models.database import get_db
from app.models.user import User, UserRole
from app.services.auth import authenticate_user, create_access_token, hash_password
from app.services.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    full_name: str
    role: str
    branch_id: Optional[str]

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole
    branch_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    branch_id: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "full_name": user.full_name,
        "role": user.role.value,
        "branch_id": str(user.branch_id) if user.branch_id else None,
    }

@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        branch_id=uuid.UUID(user_data.branch_id) if user_data.branch_id else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        branch_id=str(user.branch_id) if user.branch_id else None,
        is_active=user.is_active,
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        full_name=current_user.full_name,
        email=current_user.email,
        role=current_user.role.value,
        branch_id=str(current_user.branch_id) if current_user.branch_id else None,
        is_active=current_user.is_active,
    )