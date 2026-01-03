# app/api/api_librarian_management.py
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Dict, Optional

from app.services.srv_librarian_management import LibrarianManagementService
from app.services.srv_auth import AuthService
from app.models.model_librarian import Librarian
from fastapi_sqlalchemy import db

router = APIRouter(prefix="/librarian", tags=["Librarian Management"])

# Initialize services
librarian_service = LibrarianManagementService()
auth_service = AuthService()


def verify_librarian(token: str = Depends(auth_service.librarian_oauth2)):
    """Helper function to verify user is a librarian"""
    user = auth_service.get_current_user(token)
    librarian = db.session.query(Librarian).filter(Librarian.user_id == user.user_id).first()
    
    if not librarian:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a librarian"
        )
    
    return user


@router.get("/users/{user_id}", summary="Get User Information")
def get_user_info(
    user_id: str,
    token: str = Depends(auth_service.librarian_oauth2)
) -> Dict:
    """
    Get detailed information about a user including reader info and card status.
    
    **Librarian Only**
    
    Returns:
    - User details (username, email, phone, etc.)
    - Reader information (if applicable)
    - Reading card information and status
    - Infraction count
    """
    verify_librarian(token)
    return librarian_service.get_user_info(user_id)


@router.get("/users/{user_id}/current-borrows", summary="Get User's Current Borrowed Books")
def get_user_current_borrows(
    user_id: str,
    token: str = Depends(auth_service.librarian_oauth2)
) -> List[Dict]:
    """
    Get all currently borrowed books for a specific user.
    
    **Librarian Only**
    
    Returns list of borrowed books with:
    - Book details (title, author, ISBN, publisher)
    - Borrow dates and due dates
    - Overdue status
    - Penalty information (if any)
    """
    verify_librarian(token)
    return librarian_service.get_user_current_borrows(user_id)


@router.post("/users/{user_id}/remove-ban", summary="Remove Ban from User")
def remove_ban(
    user_id: str,
    reason: Optional[str] = Query(None, description="Reason for removing the ban"),
    token: str = Depends(auth_service.librarian_oauth2)
) -> Dict:
    """
    Remove ban or suspension from a user's reading card.
    
    **Librarian Only**
    
    This endpoint:
    - Changes card status from Suspended/Blocked to Active
    - Allows user to borrow books again
    - Records the reason for ban removal
    
    Args:
    - user_id: The ID of the user to unban
    - reason: Optional reason for removing the ban
    
    Returns:
    - Success message
    - Old and new card status
    - User information
    """
    verify_librarian(token)
    return librarian_service.remove_ban(user_id, reason)


@router.get("/users/{user_id}/borrow-history", summary="Get User's Complete Borrow History")
def get_user_borrow_history(
    user_id: str,
    status: Optional[str] = Query(None, description="Filter by status: pending, active, returned, overdue, rejected, lost"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    token: str = Depends(auth_service.librarian_oauth2)
) -> Dict:
    """
    Get complete borrow history for a specific user.
    
    **Librarian Only**
    
    This endpoint returns:
    - All borrow records for the user
    - Book details for each borrow
    - Penalty information if any
    - Status and dates
    - Pagination support
    
    Args:
    - user_id: The ID of the user
    - status: Optional status filter
    - page: Page number for pagination
    - page_size: Number of records per page
    
    Returns:
    - User information
    - List of borrow history records
    - Pagination metadata
    """
    verify_librarian(token)
    return librarian_service.get_user_borrow_history(user_id, status, page, page_size)


@router.get("/readers", summary="List All Readers")
def list_readers(
    status_filter: Optional[str] = Query(
        None,
        description="Filter by card status: active, suspended, blocked, expired"
    ),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    token: str = Depends(auth_service.librarian_oauth2)
) -> Dict:
    """
    Get list of all readers with their card status and basic information.
    
    **Librarian Only**
    
    Query Parameters:
    - status_filter: Filter by card status (optional)
    - limit: Maximum number of results (default: 100, max: 500)
    - offset: Number of results to skip for pagination
    
    Returns:
    - Total count of readers
    - List of readers with their information
    - Card status and type
    - Infraction count
    """
    verify_librarian(token)
    return librarian_service.list_all_readers(status_filter, limit, offset)


@router.get("/users/{user_id}/borrow-history", summary="Get User's Borrow History")
def get_user_borrow_history(
    user_id: str,
    status: Optional[str] = Query(
        None,
        description="Filter by status: pending, active, returned, overdue, rejected"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    token: str = Depends(auth_service.librarian_oauth2)
) -> Dict:
    """
    Get complete borrow history for a specific user.
    
    **Librarian Only**
    
    Query Parameters:
    - status: Filter by borrow status (optional)
    - page: Page number for pagination
    - page_size: Number of items per page
    
    Returns:
    - User information
    - Paginated borrow history
    - Book details for each borrow
    - Penalty information (if any)
    - Overdue status and days
    """
    verify_librarian(token)
    return librarian_service.get_user_borrow_history(user_id, status, page, page_size)


@router.get("/users/search/{username}", summary="Search User by Username")
def search_user_by_username(
    username: str,
    token: str = Depends(auth_service.librarian_oauth2)
) -> List[Dict]:
    """
    Search for users by username (supports partial matching).
    
    **Librarian Only**
    
    Returns list of matching users with basic information.
    """
    verify_librarian(token)
    
    from app.models.model_user import User
    from app.models.model_reader import Reader
    from app.models.model_reading_card import ReadingCard
    from sqlalchemy.orm import joinedload
    
    try:
        users = (
            db.session.query(User)
            .outerjoin(Reader)
            .outerjoin(ReadingCard)
            .options(
                joinedload(User.reader).joinedload(Reader.reading_card)
            )
            .filter(User.username.ilike(f"%{username}%"))
            .limit(50)
            .all()
        )
        
        results = []
        for user in users:
            user_data = {
                "user_id": user.user_id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role.value,
            }
            
            if user.reader:
                user_data["reader_id"] = user.reader.reader_id
                user_data["total_borrowed"] = user.reader.total_borrowed
                user_data["infraction_count"] = user.reader.infraction_count
                
                if user.reader.reading_card:
                    user_data["card_status"] = user.reader.reading_card.status.value
            
            results.append(user_data)
        
        return results
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )
