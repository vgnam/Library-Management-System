from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi_sqlalchemy import db

from app.services.srv_auth import AuthService
from app.services.srv_history import HistoryService
from app.schemas.sche_base import DataResponse
from app.models.model_reader import Reader

# Create router for history endpoints
router = APIRouter(prefix="/history", tags=["History"])

# Initialize services
auth_service = AuthService()
history_service = HistoryService()


def get_current_reader(token: str) -> Reader:
    """
    Get the current reader based on JWT token.
    Raises 404 if reader profile not found.
    """
    user = auth_service.get_current_user(token)  # Extract user info from token
    reader = db.session.query(Reader).filter(Reader.user_id == user.user_id).first()

    if not reader:
        raise HTTPException(status_code=404, detail="Reader profile not found")

    return reader


@router.get("/", summary="Get Borrow History")
def get_borrow_history(
        status: str = Query(None, description="Filter by status (Pending/Active/Returned/Overdue/Rejected)"),
        page: int = Query(1, ge=1, description="Page number"),
        page_size: int = Query(10, ge=1, le=100, description="Items per page"),
        token: str = Depends(auth_service.reader_oauth2)  # Automatically extracts token
) -> DataResponse:
    """
    Returns a paginated list of all borrow history for the current reader.
    Optional: filter by status.
    """
    reader = get_current_reader(token)

    # Validate status if provided (using capitalized values to match database)
    valid_statuses = ['Pending', 'Active', 'Returned', 'Overdue', 'Rejected']
    status_filtered = None
    if status:
        status_capitalized = status.capitalize()
        if status_capitalized not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Valid values: {', '.join(valid_statuses)}"
            )
        status_filtered = status_capitalized

    # Call service to get borrow history - status is passed as string
    result = history_service.get_borrow_history(
        reader_id=reader.reader_id,
        status=status_filtered,
        page=page,
        page_size=page_size
    )

    return DataResponse().success_response(result)


@router.get("/current", summary="Get Currently Borrowed Books")
def get_currently_borrowed_books(
        token: str = Depends(auth_service.reader_oauth2)
) -> DataResponse:
    """
    Get all books that are currently being borrowed by the reader (not yet returned).
    Includes overdue info per book.
    """
    reader = get_current_reader(token)

    # Call service to get currently borrowed books
    result = history_service.get_currently_borrowed_books(reader.reader_id)

    return DataResponse().success_response(result)


@router.get("/overdue", summary="Get Overdue Books")
def get_overdue_books(
        token: str = Depends(auth_service.reader_oauth2)
) -> DataResponse:
    """
    Get all books that are currently overdue (past due date and not returned yet).
    """
    reader = get_current_reader(token)

    # Call service to get overdue books
    result = history_service.get_overdue_books(reader.reader_id)

    return DataResponse().success_response(result)