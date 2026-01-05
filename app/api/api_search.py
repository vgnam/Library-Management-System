from fastapi import APIRouter, Query, Depends
from typing import Optional

from app.services.srv_auth import AuthService
from app.services.srv_search import BookSearchService
from app.schemas.sche_base import DataResponse


router = APIRouter(prefix="/books", tags=["Books"])
auth_service = AuthService()
book_search_service = BookSearchService()


# ===============================================================
# PUBLIC: Browse Books (No Auth Required)
# ===============================================================
@router.get("/public/browse", summary="Browse Books (Public)")
def browse_books_public(
        keyword: Optional[str] = Query(None, description="Fuzzy search on title, author, publisher"),
        category: Optional[str] = Query(None, description="Filter by category"),
        publisher: Optional[str] = Query(None, description="Exact match publisher filter"),
        page: int = Query(1, ge=1),
        page_size: int = Query(12, ge=1, le=100)
) -> DataResponse:
    """Browse books without authentication - for public viewing"""
    result = book_search_service.search_books(
        keyword=keyword,
        category=category,
        publisher=publisher,
        page=page,
        page_size=page_size
    )
    return DataResponse().success_response(result)


# ===============================================================
# PUBLIC: Get All Categories
# ===============================================================
@router.get("/public/categories", summary="Get All Categories (Public)")
def get_categories_public() -> DataResponse:
    """Get list of all book categories"""
    categories = book_search_service.get_all_categories()
    return DataResponse().success_response(categories)


# ===============================================================
# SEARCH BOOK (Reader) with one fuzzy keyword
# ===============================================================
@router.get("/search", summary="Search Books")
def search_books(
        keyword: Optional[str] = Query(None, description="Fuzzy search on title, author, publisher"),
        category: Optional[str] = Query(None, description="Filter by category"),
        publisher: Optional[str] = Query(None, description="Exact match publisher filter"),
        page: int = Query(1, ge=1),
        page_size: int = Query(12, ge=1, le=10000),
        token: str = Depends(auth_service.reader_oauth2)
) -> DataResponse:
    auth_service.get_current_user(token)

    result = book_search_service.search_books(
        keyword=keyword,
        category=category,
        publisher=publisher,
        page=page,
        page_size=page_size
    )

    return DataResponse().success_response(result)
