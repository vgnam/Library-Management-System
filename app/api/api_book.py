from fastapi import APIRouter, Query, Depends, HTTPException, status, Body
from fastapi_sqlalchemy import db
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
from sqlalchemy import desc

from app.models.model_book_title import BookTitle
from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum
from app.models.model_reader import Reader
from app.models.model_reading_card import ReadingCard, CardTypeEnum, CardStatusEnum
from app.models.model_book import Book
from app.models.model_librarian import Librarian
from app.services.srv_auth import AuthService
from app.schemas.sche_base import DataResponse

router = APIRouter(prefix="/books", tags=["Books"])
auth_service = AuthService()


# ===============================================================
# 1. SEARCH BOOK (Reader)
# ===============================================================
@router.get("/search", summary="Search Books")
def search_books(
        title: Optional[str] = Query(None),
        author: Optional[str] = Query(None),
        publisher: Optional[str] = Query(None),
        page: int = Query(1, ge=1),
        page_size: int = Query(10, ge=1, le=100),
        token: str = Depends(auth_service.reader_oauth2)
) -> DataResponse:
    auth_service.get_current_user(token)

    query = db.session.query(BookTitle)

    if title:
        query = query.filter(BookTitle.name.ilike(f"%{title}%"))
    if author:
        query = query.filter(BookTitle.author.ilike(f"%{author}%"))
    if publisher:
        query = query.filter(BookTitle.publisher.has(name=publisher))

    total = query.count()
    books = query.offset((page - 1) * page_size).limit(page_size).all()

    return DataResponse().success_response({
        "total": total,
        "page": page,
        "page_size": page_size,
        "books": [
            {
                "id": b.book_title_id,
                "name": b.name,
                "author": b.author,
                "publisher": b.publisher.name,
                "category": b.category
            }
            for b in books
        ]
    })


# ===============================================================
# 2. GET BORROW REQUESTS (Librarian)
# ===============================================================
@router.get("/borrow-requests", summary="Get Borrow Requests List")
def get_borrow_requests(
        status: Optional[BorrowStatusEnum] = Query(None),
        token: str = Depends(auth_service.librarian_oauth2)
) -> DataResponse:
    auth_service.get_current_user(token)

    query = db.session.query(BorrowSlip)
    if status:
        query = query.filter(BorrowSlip.status == status)

    # Sắp xếp mới nhất lên đầu
    borrow_slips = query.order_by(desc(BorrowSlip.borrow_date)).all()

    results = []
    for slip in borrow_slips:
        # Lấy thông tin độc giả
        reader = db.session.query(Reader).filter(Reader.reader_id == slip.reader_id).first()
        reader_name = "Unknown"
        if reader and reader.user:
            reader_name = reader.user.full_name

        # Lấy danh sách tên sách trong phiếu
        details = db.session.query(BorrowSlipDetail).filter(BorrowSlipDetail.borrow_slip_id == slip.bs_id).all()
        book_list = []
        for d in details:
            book = db.session.query(Book).filter(Book.book_id == d.book_id).first()
            if book and book.book_title:
                book_list.append({"book_id": book.book_id, "name": book.book_title.name})
            else:
                book_list.append({"book_id": d.book_id, "name": "Unknown Book"})

        results.append({
            "borrow_slip_id": slip.bs_id,
            "reader_name": reader_name,
            "request_date": slip.borrow_date,
            "status": slip.status,
            "books_count": len(book_list),
            "books": book_list
        })

    return DataResponse().success_response(results)


# ===============================================================
# 3. CREATE BORROW REQUEST (Reader)
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

    # Kiểm tra thẻ đọc
    card = db.session.query(ReadingCard).filter(ReadingCard.reader_id == reader.reader_id).first()
    if not card or card.status != CardStatusEnum.active:
        raise HTTPException(status_code=403, detail="Reading card is not active")

    # Tạo phiếu mượn (Pending)
    borrow_slip_id = str(uuid.uuid4())
    borrow_slip = BorrowSlip(
        bs_id=borrow_slip_id,
        reader_id=reader.reader_id,
        librarian_id=None,
        borrow_date=datetime.utcnow(),
        status=BorrowStatusEnum.pending
    )
    db.session.add(borrow_slip)

    # Danh sách các ID sách vật lý đã chọn trong request này để tránh chọn trùng
    selected_physical_ids = []

    for title_id in book_title_ids:
        # Tìm sách vật lý:
        # 1. Có cùng book_title_id
        # 2. Chưa bị mượn (being_borrowed = False)
        # 3. Chưa bị chọn bởi chính request này (trường hợp mượn 2 cuốn giống nhau)
        book_query = db.session.query(Book).filter(
            Book.book_title_id == title_id,
            Book.being_borrowed == False
        )

        if selected_physical_ids:
            book_query = book_query.filter(Book.book_id.notin_(selected_physical_ids))

        book = book_query.first()

        if not book:
            # Nếu không tìm thấy quyển nào rảnh
            # Lưu ý: Cần rollback hoặc để Exception tự rollback
            book_info = db.session.query(BookTitle).filter(BookTitle.book_title_id == title_id).first()
            book_name = book_info.name if book_info else title_id
            raise HTTPException(
                status_code=404,
                detail=f"Book '{book_name}' is currently unavailable (no copies left)."
            )

        # Kiểm tra sách hiếm (Rare)
        if card.card_type != CardTypeEnum.vip and book.book_title.category == "Rare":
            raise HTTPException(status_code=403,
                                detail=f"Book '{book.book_title.name}' is Rare and restricted to VIPs.")

        # Thêm vào chi tiết phiếu
        borrow_detail = BorrowSlipDetail(
            id=str(uuid.uuid4()),
            borrow_slip_id=borrow_slip.bs_id,
            book_id=book.book_id,
            return_date=None
        )
        db.session.add(borrow_detail)

        # Đánh dấu tạm để vòng lặp sau không chọn lại cuốn này
        selected_physical_ids.append(book.book_id)

    db.session.commit()

    return DataResponse().success_response({
        "message": "Borrow request submitted successfully",
        "borrow_slip_id": borrow_slip_id,
        "assigned_books": selected_physical_ids
    })


# ===============================================================
# 4. APPROVE BORROW REQUEST (Librarian)
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

    borrow_slip = db.session.query(BorrowSlip).filter(
        BorrowSlip.bs_id == borrow_slip_id
    ).first()

    if not borrow_slip:
        raise HTTPException(status_code=404, detail="Borrow slip not found")

    if borrow_slip.status != BorrowStatusEnum.pending:
        raise HTTPException(status_code=400, detail=f"Borrow slip status is {borrow_slip.status}, cannot approve.")

    # Tính hạn trả
    card = db.session.query(ReadingCard).filter(
        ReadingCard.reader_id == borrow_slip.reader_id
    ).first()

    loan_days = 60 if card.card_type == CardTypeEnum.vip else 45
    loan_period = timedelta(days=loan_days)

    current_time = datetime.utcnow()

    # Cập nhật phiếu
    borrow_slip.status = BorrowStatusEnum.active
    borrow_slip.librarian_id = librarian.lib_id
    # borrow_date có thể cập nhật lại thành thời điểm duyệt nếu muốn, ở đây giữ nguyên ngày request

    # Cập nhật chi tiết sách và đánh dấu sách đang được mượn
    details = db.session.query(BorrowSlipDetail).filter(
        BorrowSlipDetail.borrow_slip_id == borrow_slip.bs_id
    ).all()

    for detail in details:
        book = db.session.query(Book).filter(Book.book_id == detail.book_id).first()
        if book:
            if book.being_borrowed:
                # Trường hợp hy hữu: Sách đã bị người khác mượn mất trong lúc chờ duyệt
                # Cần xử lý rollback hoặc báo lỗi. Ở đây báo lỗi đơn giản.
                raise HTTPException(status_code=409,
                                    detail=f"Book copy {book.book_id} is already borrowed by someone else.")

            book.being_borrowed = True
            detail.return_date = current_time + loan_period

    db.session.commit()

    return DataResponse().success_response({
        "message": "Borrow request approved",
        "borrow_slip_id": borrow_slip_id,
        "due_date": (current_time + loan_period).isoformat()
    })


# ===============================================================
# 5. REJECT REQUEST (Librarian)
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

    borrow_slip = db.session.query(BorrowSlip).filter(
        BorrowSlip.bs_id == borrow_slip_id
    ).first()

    if not borrow_slip:
        raise HTTPException(status_code=404, detail="Borrow slip not found")

    if borrow_slip.status != BorrowStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Borrow slip is not pending")

    borrow_slip.status = BorrowStatusEnum.rejected
    # Không cần set being_borrowed = False vì lúc tạo request chưa set True

    db.session.commit()

    return DataResponse().success_response({
        "message": "Borrow request rejected",
        "borrow_slip_id": borrow_slip_id
    })