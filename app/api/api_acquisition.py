"""
API endpoints for book acquisition (nhập sách)
"""
from fastapi import APIRouter, HTTPException, Depends, Body, Query
from pydantic import BaseModel, Field
from typing import List, Optional

from app.services.srv_acquisition import AcquisitionService
from app.services.srv_auth import AuthService
from app.schemas.sche_base import DataResponse
from app.core.dependencies import check_all_readers_infractions

router = APIRouter(prefix="/acquisition", tags=["Acquisition"])
auth_service = AuthService()
acquisition_service = AcquisitionService()


# ==================== Request Models ====================
class BookItemModel(BaseModel):
    """Model for each book item in acquisition"""
    book_title_id: str = Field(..., description="Book title ID")
    quantity: int = Field(..., ge=1, description="Quantity to acquire")
    price: int = Field(..., ge=0, description="Price per book (VND)")


class CreateAcquisitionModel(BaseModel):
    """Model for creating acquisition slip"""
    books: List[BookItemModel] = Field(..., min_items=1, description="List of books to acquire")


class CreateBookTitleModel(BaseModel):
    """Model for creating new book title"""
    name: str = Field(..., description="Book title name")
    author: str = Field(..., description="Author name")
    category_id: str = Field(..., description="Category ID")
    publisher_id: str = Field(..., description="Publisher ID")


# ==================== Endpoints ====================
@router.post("/create", summary="Create Acquisition Slip")
def create_acquisition_slip(
    data: CreateAcquisitionModel = Body(...),
    token: str = Depends(auth_service.librarian_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> DataResponse:
    """
    Create a new acquisition slip to add books to library.
    Only accessible by librarians.
    """
    # Get current user and verify librarian role
    user = auth_service.get_current_user(token)
    
    # Get librarian ID from user
    from fastapi_sqlalchemy import db
    from app.models.model_librarian import Librarian
    
    librarian = db.session.query(Librarian).filter(
        Librarian.user_id == user.user_id
    ).first()
    
    if not librarian:
        raise HTTPException(status_code=403, detail="Access denied. Librarians only.")
    
    # Convert Pydantic models to dicts
    books_data = [book.dict() for book in data.books]
    
    result = acquisition_service.create_acquisition_slip(
        librarian_id=librarian.lib_id,
        books=books_data
    )
    
    return DataResponse(
        success=True,
        message="Acquisition slip created successfully",
        data=result
    )


@router.get("/history", summary="Get Acquisition History")
def get_acquisition_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    librarian_id: Optional[str] = Query(None, description="Filter by librarian ID"),
    token: str = Depends(auth_service.librarian_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> DataResponse:
    """
    Get acquisition history with pagination.
    Only accessible by librarians.
    """
    auth_service.get_current_user(token)
    
    result = acquisition_service.get_acquisition_history(
        page=page,
        page_size=page_size,
        librarian_id=librarian_id
    )
    
    return DataResponse(
        success=True,
        message="Acquisition history retrieved successfully",
        data=result
    )


@router.get("/detail/{acq_id}", summary="Get Acquisition Detail")
def get_acquisition_detail(
    acq_id: str,
    token: str = Depends(auth_service.librarian_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> DataResponse:
    """
    Get detailed information about a specific acquisition slip.
    Only accessible by librarians.
    """
    auth_service.get_current_user(token)
    
    result = acquisition_service.get_acquisition_detail(acq_id)
    
    return DataResponse(
        success=True,
        message="Acquisition detail retrieved successfully",
        data=result
    )


@router.get("/publishers", summary="Get All Publishers")
def get_publishers(
    token: str = Depends(auth_service.librarian_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> DataResponse:
    """
    Get all publishers for dropdown selection.
    Only accessible by librarians.
    """
    auth_service.get_current_user(token)
    
    result = acquisition_service.get_publishers()
    
    return DataResponse(
        success=True,
        message="Publishers retrieved successfully",
        data=result
    )

@router.get("/categories", summary="Get All Categories")
def get_categories(
    token: str = Depends(auth_service.librarian_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> DataResponse:
    """
    Get all publishers for dropdown selection.
    Only accessible by librarians.
    """
    auth_service.get_current_user(token)
    
    result = acquisition_service.get_categories()
    
    return DataResponse(
        success=True,
        message="Publishers retrieved successfully",
        data=result
    )

@router.post("/book-title/create", summary="Create New Book Title")
def create_book_title(
    data: CreateBookTitleModel = Body(...),
    token: str = Depends(auth_service.librarian_oauth2),
    infraction_check: dict = Depends(check_all_readers_infractions)
) -> DataResponse:
    """
    Create a new book title if it doesn't exist.
    Returns existing book title if found.
    Only accessible by librarians.
    """
    auth_service.get_current_user(token)
    
    result = acquisition_service.create_book_title(
        name=data.name,
        author=data.author,
        category_id=data.category_id,
        publisher_id=data.publisher_id
    )
    
    return DataResponse(
        success=True,
        message="Book title created successfully" if not result.get("exists") else "Book title already exists",
        data=result
    )
