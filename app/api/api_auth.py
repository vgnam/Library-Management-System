# app/api/api_auth.py
from fastapi import APIRouter, HTTPException, Depends, Form, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Dict, Optional
from datetime import date

from app.services.srv_auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Initialize AuthService
auth_service = AuthService()


# ---------- LOGIN ENDPOINTS ----------
@router.post("/reader/login", summary="Reader Login")
def reader_login(form_data: OAuth2PasswordRequestForm = Depends()) -> Dict:
    """Login endpoint for readers"""
    try:
        return auth_service.login(
            username=form_data.username,
            password=form_data.password,
            role="reader"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/librarian/login", summary="Librarian Login")
def librarian_login(form_data: OAuth2PasswordRequestForm = Depends()) -> Dict:
    """Login endpoint for librarians"""
    try:
        return auth_service.login(
            username=form_data.username,
            password=form_data.password,
            role="librarian"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/manager/login", summary="Manager Login")
def manager_login(form_data: OAuth2PasswordRequestForm = Depends()) -> Dict:
    """Login endpoint for managers"""
    try:
        return auth_service.login(
            username=form_data.username,
            password=form_data.password,
            role="manager"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


# ---------- REGISTRATION ----------
@router.post("/reader/register", status_code=status.HTTP_201_CREATED, summary="Register New Reader")
def register_reader(
        username: str = Form(..., description="Username (unique)"),
        email: str = Form(..., description="Email (unique)"),
        password: str = Form(..., min_length=6, description="Password (minimum 6 characters)"),
        full_name: str = Form(..., description="Full name"),
        dob: Optional[date] = Form(None, description="Date of birth (YYYY-MM-DD)"),
        gender: Optional[str] = Form(None, description="Gender: 'male', 'female', or 'other'"),
        phone: Optional[str] = Form(None, description="Phone number"),
        address: Optional[str] = Form(None, description="Address"),
        reader_type: str = Form("standard", description="Reader type: 'standard' or 'vip'")
) -> Dict:
    """Register a new reader account with full user details"""

    # Validate reader_type
    if reader_type.lower() not in ["standard", "vip"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reader_type must be 'standard' or 'vip'"
        )

    # Validate gender if provided
    if gender and gender.lower() not in ["male", "female", "other"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="gender must be 'male', 'female', or 'other'"
        )

    try:
        result = auth_service.register_reader(
            full_name=full_name,
            email=email,
            username=username,
            password=password,
            dob=dob,
            gender=gender,
            phone=phone,
            address=address,
            reader_type=reader_type
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


# ---------- LOGOUT ----------
@router.post("/logout", summary="Logout User")
def logout(username: str = Form(..., description="Username")) -> Dict:
    """Logout endpoint - records logout timestamp"""
    try:
        return auth_service.logout(username=username)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Logout failed: {str(e)}"
        )


# ---------- GET CURRENT USER ----------
@router.get("/me", summary="Get Current User Info")
def get_current_user_info(token: str = Depends(auth_service.reusable_oauth2)) -> Dict:
    """Get information about the currently authenticated user"""
    try:
        user = auth_service.get_current_user(token)
        return {
            "user_id": user.user_id,
            "full_name": user.full_name,
            "email": user.email,
            "gender": user.gender.value if user.gender else None,
            "phone": user.phone,
            "dob": user.dob.isoformat() if user.dob else None,
            "address": user.address,
            "role": user.role.value if user.role else None,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )


# ---------- OPTIONS ENDPOINTS ----------
@router.get("/options/gender", summary="Get Available Gender Options")
def get_gender_options() -> Dict:
    """Returns list of valid gender options"""
    return {
        "options": ["male", "female", "other"],
        "description": "Available gender options for user registration"
    }


@router.get("/options/reader-type", summary="Get Available Reader Type Options")
def get_reader_type_options() -> Dict:
    """Returns list of valid reader type options"""
    return {
        "options": ["standard", "vip"],
        "description": {
            "standard": "Standard reader account with basic privileges",
            "vip": "VIP reader account with premium privileges"
        }
    }


@router.get("/options/all", summary="Get All Registration Options")
def get_all_options() -> Dict:
    """Returns all available options for user registration"""
    return {
        "gender": {
            "options": ["male", "female", "other"],
            "required": False,
            "description": "User's gender"
        },
        "reader_type": {
            "options": ["standard", "vip"],
            "required": True,
            "default": "standard",
            "description": {
                "standard": "Standard reader account with basic privileges",
                "vip": "VIP reader account with premium privileges"
            }
        },
        "dob": {
            "format": "YYYY-MM-DD",
            "required": False,
            "description": "Date of birth in ISO format"
        }
    }