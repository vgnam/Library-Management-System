from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from typing import Optional

from app.services.srv_return import ReturnService
from app.services.srv_auth import AuthService
from app.schemas.sche_base import DataResponse

router = APIRouter(prefix="/returns", tags=["Returns"])
auth_service = AuthService()


class ProcessReturnModel(BaseModel):
    borrow_detail_id: str = Field(..., description="ID of the borrow detail to process return")
    condition: str = Field(..., description="Condition of the book (good, damaged, lost)")
    damage_description: Optional[str] = Field(None, description="Description of the damage (if damaged)")
    custom_fine: Optional[float] = Field(None, description="Custom fine amount (if applicable)")


# Endpoints
# LOẠI BỎ user_id khỏi RequestReturnModel
class RequestReturnModel(BaseModel):
    borrow_detail_id: str = Field(..., description="ID of the borrow detail to request return")

@router.post("/request-return")
def request_return(
    request: RequestReturnModel,
    token: str = Depends(auth_service.reader_oauth2)
):
    user = auth_service.get_current_user(token)
    # Gọi service với user_id từ token
    result = ReturnService.request_return(
        borrow_detail_id=request.borrow_detail_id,
        user_id=user.user_id  # ← KHÔNG PHẢI request.user_id
    )
    return DataResponse().success_response(result)




@router.post("/process-return", summary="Process the return of a borrowed book")
def process_return(
        request: ProcessReturnModel,
        token: str = Depends(auth_service.librarian_oauth2)
) -> DataResponse:
    auth_service.get_current_user(token)  # Đảm bảo librarian

    result = ReturnService.process_return(
        borrow_detail_id=request.borrow_detail_id,
        condition=request.condition,
        damage_description=request.damage_description,
        custom_fine=request.custom_fine
    )
    return DataResponse().success_response(result)


# Trong returns router
@router.get("/pending-returns", summary="Get all pending return requests")
def get_pending_returns(
    token: str = Depends(auth_service.librarian_oauth2)
) -> DataResponse:
    # Lấy danh sách chi tiết đang chờ trả
    pending_details = ReturnService.get_pending_return_requests()
    return DataResponse().success_response(pending_details)