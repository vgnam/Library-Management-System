from fastapi import HTTPException
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


class BorrowService:
    """Service for handling borrow request operations"""

    @staticmethod
    def get_borrow_requests(status: Optional[BorrowStatusEnum] = None):
        """Get all borrow requests, optionally filtered by status"""
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
            details = db.session.query(BorrowSlipDetail).filter(
                BorrowSlipDetail.borrow_slip_id == slip.bs_id
            ).all()

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

        return results

    @staticmethod
    def create_borrow_request(book_title_ids: List[str], reader: Reader):
        """Create a new borrow request for a reader"""
        # Kiểm tra thẻ đọc
        card = db.session.query(ReadingCard).filter(
            ReadingCard.reader_id == reader.reader_id
        ).first()

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
                book_info = db.session.query(BookTitle).filter(
                    BookTitle.book_title_id == title_id
                ).first()
                book_name = book_info.name if book_info else title_id
                raise HTTPException(
                    status_code=404,
                    detail=f"Book '{book_name}' is currently unavailable (no copies left)."
                )

            # Kiểm tra sách hiếm (Rare)
            if card.card_type != CardTypeEnum.vip and book.book_title.category == "Rare":
                raise HTTPException(
                    status_code=403,
                    detail=f"Book '{book.book_title.name}' is Rare and restricted to VIPs."
                )

            # Thêm vào chi tiết phiếu
            borrow_detail = BorrowSlipDetail(
                id=str(uuid.uuid4()),
                borrow_slip_id=borrow_slip.bs_id,
                book_id=book.book_id,
                status=BorrowStatusEnum.pending,
                return_date=None
            )
            db.session.add(borrow_detail)

            # Đánh dấu tạm để vòng lặp sau không chọn lại cuốn này
            selected_physical_ids.append(book.book_id)

        db.session.commit()

        return {
            "message": "Borrow request submitted successfully",
            "borrow_slip_id": borrow_slip_id,
            "assigned_books": selected_physical_ids
        }

    @staticmethod
    def approve_borrow_request(borrow_slip_id: str, librarian: Librarian):
        """Approve a pending borrow request"""
        borrow_slip = db.session.query(BorrowSlip).filter(
            BorrowSlip.bs_id == borrow_slip_id
        ).first()

        if not borrow_slip:
            raise HTTPException(status_code=404, detail="Borrow slip not found")

        if borrow_slip.status != BorrowStatusEnum.pending:
            raise HTTPException(
                status_code=400,
                detail=f"Borrow slip status is {borrow_slip.status}, cannot approve."
            )

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
                    raise HTTPException(
                        status_code=409,
                        detail=f"Book copy {book.book_id} is already borrowed by someone else."
                    )
                book.being_borrowed = True
                detail.return_date = current_time + loan_period

                detail.status = "active"  # ← THÊM DÒNG NÀY

        db.session.commit()

        return {
            "message": "Borrow request approved",
            "borrow_slip_id": borrow_slip_id,
            "return_date": (current_time + loan_period).isoformat()
        }

    @staticmethod
    def reject_borrow_request(borrow_slip_id: str, librarian: Librarian):
        """Reject a pending borrow request"""
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

        return {
            "message": "Borrow request rejected",
            "borrow_slip_id": borrow_slip_id
        }