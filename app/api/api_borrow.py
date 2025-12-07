from fastapi import APIRouter, Query, Depends, HTTPException, Body
from fastapi_sqlalchemy import db
from typing import List, Optional

from app.models.model_reader import Reader
from app.models.model_librarian import Librarian
from app.models.model_borrow import BorrowStatusEnum
from app.services.srv_auth import AuthService
from app.services.srv_borrow import BorrowService
from app.schemas.sche_base import DataResponse
from app.models.model_book_title import BookTitle
from app.models.model_book import Book
from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum


router = APIRouter(prefix="/books", tags=["Books"])
auth_service = AuthService()
borrow_service = BorrowService()


# ===============================================================
# 1. GET BORROW REQUESTS (Librarian)
# ===============================================================
@router.get("/borrow-requests", summary="Get Borrow Requests List")
def get_borrow_requests(
        status: Optional[BorrowStatusEnum] = Query(None),
        token: str = Depends(auth_service.librarian_oauth2)
) -> DataResponse:
    auth_service.get_current_user(token)

    results = borrow_service.get_borrow_requests(status=status)

    return DataResponse().success_response(results)


# ===============================================================
# 2. CREATE BORROW REQUEST (Reader)
# ===============================================================
@router.post("/borrow-request", summary="Create Borrow Request")
def create_borrow_request(
        # Sử dụng embed=True để nhận JSON: {"book_title_ids": ["id1", "id2"]}
        book_title_ids: List[str] = Body(..., embed=True),
        token: str = Depends(auth_service.reader_oauth2)
) -> DataResponse:
    user = auth_service.get_current_user(token)
    reader = db.session.query(Reader).filter(Reader.user_id == user.user_id).first()

    if not reader:
        raise HTTPException(status_code=404, detail="Reader not found")

    result = borrow_service.create_borrow_request(
        book_title_ids=book_title_ids,
        reader=reader
    )

    return DataResponse().success_response(result)


# ===============================================================
# 3. APPROVE BORROW REQUEST (Librarian)
# ===============================================================
@router.put("/borrow-request/{borrow_slip_id}/approve", summary="Approve Borrow Request")
def approve_borrow_request(
        borrow_slip_id: str,
        token: str = Depends(auth_service.librarian_oauth2)
) -> DataResponse:
    user = auth_service.get_current_user(token)
    librarian = db.session.query(Librarian).filter(Librarian.user_id == user.user_id).first()

    if not librarian:
        raise HTTPException(status_code=403, detail="User is not librarian")

    result = borrow_service.approve_borrow_request(
        borrow_slip_id=borrow_slip_id,
        librarian=librarian
    )

    return DataResponse().success_response(result)


# ===============================================================
# 4. REJECT REQUEST (Librarian)
# ===============================================================
@router.put("/borrow-request/{borrow_slip_id}/reject", summary="Reject Borrow Request")
def reject_borrow_request(
        borrow_slip_id: str,
        token: str = Depends(auth_service.librarian_oauth2)
) -> DataResponse:
    user = auth_service.get_current_user(token)
    librarian = db.session.query(Librarian).filter(Librarian.user_id == user.user_id).first()

    if not librarian:
        raise HTTPException(status_code=403, detail="User is not librarian")

    result = borrow_service.reject_borrow_request(
        borrow_slip_id=borrow_slip_id,
        librarian=librarian
    )

    return DataResponse().success_response(result)

# ===============================================================
# 5. CANCEL BORROW REQUEST (Reader)
# ===============================================================
@router.delete("/borrow-request/{borrow_slip_id}/cancel", summary="Cancel Borrow Request")
def cancel_borrow_request(
        borrow_slip_id: str,
        token: str = Depends(auth_service.reader_oauth2)
) -> DataResponse:
    user = auth_service.get_current_user(token)
    reader = db.session.query(Reader).filter(Reader.user_id == user.user_id).first()

    if not reader:
        raise HTTPException(status_code=404, detail="Reader not found")

    result = borrow_service.cancel_borrow_request(
        borrow_slip_id=borrow_slip_id,
        reader_id=reader.reader_id
    )

    return DataResponse().success_response(result)