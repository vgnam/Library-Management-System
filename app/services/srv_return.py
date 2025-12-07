"""
Service for handling book returns with condition assessment
"""
from datetime import datetime, timezone, timedelta
from fastapi_sqlalchemy import db
from fastapi import HTTPException

from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum
from app.models.model_book import Book
from app.models.model_reader import Reader
from app.services.srv_penalty import PenaltyService

import pytz

tz_vn = pytz.timezone("Asia/Ho_Chi_Minh")

class ReturnService:
    """Service for handling book returns in two stages: request and processing"""

    @staticmethod
    def request_return(borrow_detail_id: str, user_id: str) -> dict:
        """
        Step 1: User requests to return a book.
        Input: user_id (from JWT token)
        Sets BorrowSlipDetail.status to 'PendingReturn'.
        """
        # Get borrow detail
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()
        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        # Find reader by user_id
        reader = db.session.query(Reader).filter(Reader.user_id == user_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found for this user")

        # Verify the borrow slip belongs to this reader
        slip = db.session.query(BorrowSlip).filter(
            BorrowSlip.bs_id == detail.borrow_slip_id,
            BorrowSlip.reader_id == reader.reader_id
        ).first()
        if not slip:
            raise HTTPException(status_code=404, detail="Borrow slip not found")

        # Check detail status (not slip status)
        if detail.status not in [BorrowStatusEnum.active, BorrowStatusEnum.overdue]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot return book. Current status: {detail.status.value}"
            )

        # Set detail status to PENDING_RETURN
        detail.status = BorrowStatusEnum.pending_return
        db.session.commit()

        return {
            "message": "Return request submitted for this book",
            "borrow_detail_id": borrow_detail_id,
            "user_id": user_id,
            "status": detail.status.value
        }

    @staticmethod
    def cancel_return_request(borrow_detail_id: str, user_id: str) -> dict:
        """
        Cancel a return request (reader can cancel before librarian processes it).
        """
        # Get borrow detail
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()
        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        # Find reader by user_id
        reader = db.session.query(Reader).filter(Reader.user_id == user_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found for this user")

        # Verify the borrow slip belongs to this reader
        slip = db.session.query(BorrowSlip).filter(
            BorrowSlip.bs_id == detail.borrow_slip_id,
            BorrowSlip.reader_id == reader.reader_id
        ).first()
        if not slip:
            raise HTTPException(status_code=403, detail="You can only cancel your own return requests")

        # Check if status is pending_return
        if detail.status != BorrowStatusEnum.pending_return:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel. Current status: {detail.status.value}"
            )

        # Revert status back to active or overdue
        now = datetime.now(tz=tz_vn)
        due_date = detail.return_date
        if due_date.tzinfo is None:
            due_date = tz_vn.localize(due_date)

        if now > due_date:
            detail.status = BorrowStatusEnum.overdue
        else:
            detail.status = BorrowStatusEnum.active

        db.session.commit()

        return {
            "message": "Return request cancelled",
            "borrow_detail_id": borrow_detail_id,
            "status": detail.status.value
        }

    @staticmethod
    def process_return(
        borrow_detail_id: str,
        condition: str = "good",
        damage_description: str = None,
        custom_fine: float = None
    ) -> dict:
        """
        Step 2: Librarian processes the return.
        Expects detail status = 'PendingReturn'.
        """
        # Validate condition
        if condition not in ["good", "damaged", "lost"]:
            raise HTTPException(
                status_code=400,
                detail="Condition must be: 'good', 'damaged', or 'lost'"
            )
        if condition == "damaged" and not damage_description:
            raise HTTPException(
                status_code=400,
                detail="Damage description required when condition is 'damaged'"
            )

        # Fetch borrow detail
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()
        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        # Fetch slip
        slip = db.session.query(BorrowSlip).filter(
            BorrowSlip.bs_id == detail.borrow_slip_id
        ).first()
        if not slip:
            raise HTTPException(status_code=404, detail="Borrow slip not found")

        # Check for PENDING_RETURN status
        if detail.status != BorrowStatusEnum.pending_return:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot process return. Detail status is '{detail.status.value}' (expected 'PendingReturn')"
            )

        # Fetch book
        book = db.session.query(Book).filter(Book.book_id == detail.book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book copy not found")

        # Calculate fees with proper timezone handling
        return_datetime = datetime.now()
        
        due_date = detail.return_date  # This is the due_date
        if not due_date:
                    raise HTTPException(status_code=400, detail="Due to date not found")
        # Ensure due_date is timezone-aware for comparison
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=None)

        is_overdue = return_datetime > due_date
        
        days_overdue = (return_datetime.date() - due_date.date()).days if is_overdue else 0
        
        late_fee = days_overdue * 5000 if is_overdue else 0

        # Set actual return date
        detail.real_return_date = return_datetime

        condition_fee = 0
        if condition == "damaged":
            condition_fee = custom_fine if custom_fine is not None else 50000
        elif condition == "lost":
            book_price = getattr(book, "price", 100000)
            condition_fee = custom_fine if custom_fine is not None else (book_price * 1.5)

        total_fee = late_fee + condition_fee

        # Update book
        book.condition = condition
        book.being_borrowed = False

        # Update detail status
        if condition == "lost":
            detail.status = BorrowStatusEnum.lost
        else:
            detail.status = BorrowStatusEnum.returned

        # Create penalties
        penalty_ids = []
        try:
            if late_fee > 0:
                penalty = PenaltyService.create_late_penalty(
                    borrow_detail_id=borrow_detail_id,
                    days_overdue=days_overdue
                )
                penalty_ids.append(penalty["penalty_id"])

            if condition == "damaged":
                penalty = PenaltyService.create_damage_penalty(
                    borrow_detail_id=borrow_detail_id,
                    damage_description=damage_description,
                    fine_amount=condition_fee
                )
                penalty_ids.append(penalty["penalty_id"])
            elif condition == "lost":
                penalty = PenaltyService.create_lost_penalty(
                    borrow_detail_id=borrow_detail_id,
                    fine_amount=condition_fee  # Pass the custom fine amount
                )
                penalty_ids.append(penalty["penalty_id"])
        except Exception as e:
            print(f"Warning: Failed to create penalty: {e}")

        # Check if all details are returned and update slip status
        all_details = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.borrow_slip_id == slip.bs_id
        ).all()

        all_returned = all(
            d.status in [BorrowStatusEnum.returned, BorrowStatusEnum.lost]
            for d in all_details
        )

        if all_returned:
            slip.status = BorrowStatusEnum.returned

        db.session.commit()

        # Get user_id from reader
        reader = db.session.query(Reader).filter(Reader.reader_id == slip.reader_id).first()
        user_id = reader.user_id if reader else "unknown"

        response = {
            "message": "Book return processed successfully",
            "borrow_detail_id": borrow_detail_id,
            "book_id": detail.book_id,
            "user_id": user_id,
            "return_date": return_datetime.isoformat(),
            "due_date": due_date.isoformat() if due_date else None,
            "condition": condition,
            "is_overdue": is_overdue,
            "days_overdue": days_overdue,
            "late_fee": late_fee,
            "condition_fee": condition_fee,
            "total_fee": total_fee,
            "status": detail.status.value,
            "borrow_slip_status": slip.status.value
        }

        if condition == "damaged":
            response["damage_description"] = damage_description
        if penalty_ids:
            response["penalty_ids"] = penalty_ids

        return response

    @staticmethod
    def get_reader_return_requests(user_id: str) -> list:
        """
        Get all pending return requests for a specific reader.
        """
        # Find reader by user_id
        reader = db.session.query(Reader).filter(Reader.user_id == user_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found for this user")

        # Get all pending return details for this reader
        details = db.session.query(BorrowSlipDetail).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlip.reader_id == reader.reader_id,
            BorrowSlipDetail.status == BorrowStatusEnum.pending_return
        ).all()

        results = []
        for d in details:
            book = db.session.query(Book).filter(Book.book_id == d.book_id).first()

            results.append({
                "borrow_detail_id": d.id,
                "book_title": book.book_title.name if book and book.book_title else "Unknown",
                "book_id": d.book_id,
                "due_date": d.return_date.isoformat() if d.return_date else None,
                "status": d.status.value
            })

        return results

    @staticmethod
    def get_pending_return_requests() -> list:
        """Get all borrow details with status = pending_return (for librarians)"""
        details = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.status == BorrowStatusEnum.pending_return
        ).all()

        results = []
        for d in details:
            # Get slip, reader, book info for display
            slip = db.session.query(BorrowSlip).filter(BorrowSlip.bs_id == d.borrow_slip_id).first()
            reader = db.session.query(Reader).filter(Reader.reader_id == slip.reader_id).first() if slip else None
            book = db.session.query(Book).filter(Book.book_id == d.book_id).first()

            results.append({
                "borrow_detail_id": d.id,
                "book_title": book.book_title.name if book and book.book_title else "Unknown",
                "book_id": d.book_id,
                "reader_name": reader.user.full_name if reader and reader.user else "Unknown",
                "reader_id": slip.reader_id if slip else None,
                "borrow_date": slip.borrow_date.isoformat() if slip and slip.borrow_date else None,
                "due_date": d.return_date.isoformat() if d.return_date else None
            })
        return results

    @staticmethod
    def get_return_statistics() -> dict:
        """Get statistics about returns"""
        # Count by status
        total_returned = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.status == BorrowStatusEnum.returned
        ).count()

        total_lost = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.status == BorrowStatusEnum.lost
        ).count()

        pending_returns = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.status == BorrowStatusEnum.pending_return
        ).count()

        active_borrows = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.status == BorrowStatusEnum.active
        ).count()

        overdue_borrows = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.status == BorrowStatusEnum.overdue
        ).count()

        return {
            "total_returned": total_returned,
            "total_lost": total_lost,
            "pending_returns": pending_returns,
            "active_borrows": active_borrows,
            "overdue_borrows": overdue_borrows,
            "total_active": active_borrows + overdue_borrows + pending_returns
        }