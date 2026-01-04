# app/api/api_manager.py
from fastapi import APIRouter, HTTPException, Depends, Body, status
from typing import Dict, List
from pydantic import BaseModel, Field

from app.services.srv_manager import ManagerService
from app.services.srv_penalty import PenaltyService
from app.services.srv_auth import AuthService
from app.core.dependencies import check_all_readers_infractions

router = APIRouter(prefix="/manager", tags=["Manager"])

# Initialize services
manager_service = ManagerService()
auth_service = AuthService()


def verify_manager(token: str = Depends(auth_service.manager_oauth2)):
    """Helper function to verify user is a manager"""
    user, manager = auth_service.get_current_manager(token)
    return user, manager


# Pydantic models for request validation
class CreateLibrarianRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    phone_number: str = Field(None, max_length=15)
    years_of_experience: int = Field(default=0, ge=0)


@router.get("/statistics", summary="Get System Statistics")
def get_system_statistics(
    token: str = Depends(auth_service.manager_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> Dict:
    """
    Get comprehensive system statistics for managers.
    
    **Manager Only**
    
    Returns:
    - Number of cards issued (total, active, suspended, blocked)
    - User counts (readers, librarians)
    - Borrowing statistics (total, active, overdue, returned)
    - Infraction statistics
    - Penalty statistics
    - Reading trends (30-day borrowing data)
    """
    verify_manager(token)
    return manager_service.get_system_statistics()


@router.post("/librarians/create", summary="Create Librarian Account")
def create_librarian(
    data: CreateLibrarianRequest = Body(...),
    token: str = Depends(auth_service.manager_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> Dict:
    """
    Create a new librarian account.
    
    **Manager Only**
    
    Args:
    - username: Unique username (3-50 characters)
    - password: Password (minimum 6 characters)
    - full_name: Full name
    - email: Valid email address
    - phone_number: Optional phone number
    - years_of_experience: Years of experience (default: 0)
    
    Returns:
    - Success message
    - Created librarian information
    """
    verify_manager(token)
    
    return manager_service.create_librarian(
        username=data.username,
        password=data.password,
        full_name=data.full_name,
        email=data.email,
        phone_number=data.phone_number,
        years_of_experience=data.years_of_experience
    )


@router.delete("/librarians/{lib_id}", summary="Delete Librarian Account")
def delete_librarian(
    lib_id: str,
    token: str = Depends(auth_service.manager_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> Dict:
    """
    Delete a librarian account.
    
    **Manager Only**
    
    Args:
    - lib_id: Librarian ID to delete
    
    Returns:
    - Success message
    - Deleted librarian information
    
    Note: Deletes both the librarian profile and associated user account.
    Historical records (borrow slips, etc.) will be preserved.
    """
    verify_manager(token)
    return manager_service.delete_librarian(lib_id)


@router.get("/librarians", summary="List All Librarians")
def list_librarians(
    token: str = Depends(auth_service.manager_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> List[Dict]:
    """
    Get a list of all librarians in the system.
    
    **Manager Only**
    
    Returns:
    - List of librarians with their information
    - Username, email, phone, years of experience
    - Total borrow slips handled
    """
    verify_manager(token)
    return manager_service.list_librarians()


@router.post("/penalties/auto-create", summary="Auto-Create Overdue Penalties")
def auto_create_overdue_penalties(
    token: str = Depends(auth_service.manager_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> Dict:
    """
    Automatically create penalty records for all overdue books that don't have penalties yet.
    This updates existing penalties with current overdue days and creates new ones as needed.
    
    **Manager Only**
    
    This endpoint should be called:
    - Manually by manager when needed
    - Periodically via scheduled job (e.g., daily at midnight)
    
    Returns:
    - Number of penalties created
    - Number of penalties updated
    - Number skipped (not overdue)
    - Any errors encountered
    """
    verify_manager(token)
    return PenaltyService.auto_create_overdue_penalties()
