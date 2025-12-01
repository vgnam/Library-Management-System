from fastapi import APIRouter, Depends, HTTPException
from app.services.srv_auth import AuthService
from app.services.srv_return import ReturnService
from app.schemas.sche_base import DataResponse

router = APIRouter(prefix="/books", tags=["Books"])
auth_service = AuthService()
return_service = ReturnService()


# ===============================================================
# RETURN BORROWED BOOK (Reader)
# ===============================================================
@router.post("/return/{borrow_detail_id}", summary="Return Borrowed Book")
def return_borrowed_book(
        borrow_detail_id: str,
        token: str = Depends(auth_service.reader_oauth2)
) -> DataResponse:
    user = auth_service.get_current_user(token)
    reader_id = user.user_id

    try:
        result = return_service.return_borrowed_book(reader_id, borrow_detail_id)
        return DataResponse().success_response(result)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))