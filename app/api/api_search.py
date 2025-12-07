from fastapi import APIRouter, Query, Depends
from typing import Optional

from app.services.srv_auth import AuthService
from app.services.srv_search import BookSearchService
from app.schemas.sche_base import DataResponse

router = APIRouter(prefix="/books", tags=["Books"])
auth_service = AuthService()
book_search_service = BookSearchService()


# ===============================================================
# SEARCH BOOK (Reader) with one fuzzy keyword
# ===============================================================
@router.get("/search", summary="Search Books")
def search_books(
        keyword: Optional[str] = Query(None, description="Fuzzy search on title, author, publisher"),
        publisher: Optional[str] = Query(None, description="Exact match publisher filter"),
        page: int = Query(1, ge=1),
        page_size: int = Query(12, ge=1, le=100),
        token: str = Depends(auth_service.reader_oauth2)
) -> DataResponse:
    auth_service.get_current_user(token)

    result = book_search_service.search_books(
        keyword=keyword,
        publisher=publisher,
        page=page,
        page_size=page_size
    )

    return DataResponse().success_response(result)
