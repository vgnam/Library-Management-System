"""
Service for borrowing history queries and overdue checks
NOTE:
- BorrowSlipDetail.return_date = DUE date (when book should be returned)
- BorrowSlip.return_date = ACTUAL return date (when book was returned)
"""
from datetime import datetime
from typing import Optional
from fastapi_sqlalchemy import db
from fastapi import HTTPException
import sqlalchemy as sa

from app.models.model_borrow import BorrowSlip, BorrowSlipDetail
from app.models.model_book import Book
from app.models.model_reader import Reader


class HistoryService:

    @staticmethod
    def get_borrow_history(
            reader_id: str,
            status: str = None,
            page: int = 1,
            page_size: int = 10
    ) -> dict:
        """Get borrow history with pagination — using BorrowSlipDetail.status"""
        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        # Query using BorrowSlipDetail.status (NOT BorrowSlip.status)
        query = db.session.query(
            BorrowSlip.bs_id,
            BorrowSlip.borrow_date,
            BorrowSlip.return_date,  # still kept for backward compatibility (slip-level)
            BorrowSlipDetail.id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date'),
            sa.cast(BorrowSlipDetail.status, sa.String).label('detail_status_str')  # ← FROM DETAIL
        ).select_from(BorrowSlip).join(
            BorrowSlipDetail, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(BorrowSlip.reader_id == reader_id)

        # Filter by BorrowSlipDetail.status if provided
        if status:
            query = query.filter(sa.cast(BorrowSlipDetail.status, sa.String) == status)

        total = query.count()
        raw_results = query.order_by(BorrowSlip.borrow_date.desc()).offset((page - 1) * page_size).limit(
            page_size).all()

        # Load books
        book_ids = [result.book_id for result in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}

        history = []
        for result in raw_results:
            book = book_dict.get(result.book_id)
            detail_status = str(result.detail_status_str).lower()

            # Determine display status and overdue info based on DETAIL status
            is_overdue = False
            days_overdue = 0
            display_status = str(result.detail_status_str).capitalize()

            if detail_status == "pending":
                display_status = "Pending"  # borrowing request
            elif detail_status == "active":
                # Check if overdue (not returned and past due)
                if result.detail_due_date and datetime.utcnow() > result.detail_due_date:
                    display_status = "Overdue"
                    is_overdue = True
                    days_overdue = (datetime.utcnow().date() - result.detail_due_date.date()).days
                else:
                    display_status = "Active"
            elif detail_status == "pendingreturn":
                display_status = "Pending Return"
            elif detail_status == "returned":
                # Check if returned late
                if result.detail_due_date and result.return_date and result.return_date > result.detail_due_date:
                    display_status = "Overdue"
                    is_overdue = True
                    days_overdue = (result.return_date.date() - result.detail_due_date.date()).days
                else:
                    display_status = "Returned"
            elif detail_status == "lost":
                display_status = "Lost"
            elif detail_status == "rejected":
                display_status = "Rejected"
            elif detail_status == "overdue":
                # If status is explicitly "overdue", mark as such
                display_status = "Overdue"
                is_overdue = True
                if result.detail_due_date:
                    days_overdue = (datetime.utcnow().date() - result.detail_due_date.date()).days

            history.append({
                "borrow_slip_id": result.bs_id,
                "borrow_detail_id": result.id,
                "borrow_date": result.borrow_date.isoformat(),
                "due_date": result.detail_due_date.isoformat() if result.detail_due_date else None,
                "actual_return_date": result.return_date.isoformat() if result.return_date else None,
                "status": display_status,  # ← from detail, not slip
                "book": {
                    "book_id": result.book_id,
                    "title": book.book_title.name if book and book.book_title else "Unknown",
                    "author": book.book_title.author if book and book.book_title else None,
                    "due_date": result.detail_due_date.isoformat() if result.detail_due_date else None,
                    "actual_return_date": result.return_date.isoformat() if result.return_date else None,
                    "is_returned": detail_status == "returned",
                    "is_overdue": is_overdue,
                    "days_overdue": days_overdue,
                    "status": display_status  # ← consistent
                }
            })

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "history": history
        }

    @staticmethod
    def get_overdue_books(reader_id: str) -> dict:
        """Get currently overdue books (active books past due date)"""
        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        now = datetime.utcnow()
        raw_results = db.session.query(
            BorrowSlipDetail.id,
            BorrowSlipDetail.borrow_slip_id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date'),
            BorrowSlip.borrow_date,
            sa.cast(BorrowSlipDetail.status, sa.String).label('detail_status_str')
        ).join(
            BorrowSlip, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            BorrowSlipDetail.return_date.isnot(None),
            BorrowSlipDetail.return_date < now,
            sa.cast(BorrowSlipDetail.status, sa.String) == 'Active'  # ← FROM DETAIL
        ).all()

        book_ids = [result.book_id for result in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}

        overdue_books = []
        for result in raw_results:
            book = book_dict.get(result.book_id)
            days_overdue = (now.date() - result.detail_due_date.date()).days

            overdue_books.append({
                "borrow_detail_id": result.id,
                "borrow_slip_id": result.borrow_slip_id,
                "book_id": result.book_id,
                "title": book.book_title.name if book and book.book_title else "Unknown",
                "author": book.book_title.author if book and book.book_title else None,
                "borrow_date": result.borrow_date.isoformat(),
                "due_date": result.detail_due_date.isoformat(),
                "days_overdue": days_overdue,
                "status": "Overdue"
            })

        return {
            "total_overdue": len(overdue_books),
            "overdue_books": overdue_books
        }

    @staticmethod
    def get_currently_borrowed_books(reader_id: str) -> dict:
        """Get books currently being borrowed (status = Active or Overdue)"""
        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        now = datetime.utcnow()
        raw_results = db.session.query(
            BorrowSlipDetail.id,
            BorrowSlipDetail.borrow_slip_id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date'),
            BorrowSlip.borrow_date,
            sa.cast(BorrowSlipDetail.status, sa.String).label('detail_status_str')
        ).join(
            BorrowSlip, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            sa.cast(BorrowSlipDetail.status, sa.String).in_(['Active', 'Overdue'])  # ← FROM DETAIL
        ).all()

        book_ids = [result.book_id for result in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}

        currently_borrowed_books = []
        for result in raw_results:
            book = book_dict.get(result.book_id)

            is_overdue = False
            days_overdue = 0
            if result.detail_due_date and now > result.detail_due_date:
                is_overdue = True
                days_overdue = (now.date() - result.detail_due_date.date()).days

            display_status = "Overdue" if is_overdue else "Active"

            currently_borrowed_books.append({
                "borrow_detail_id": result.id,
                "borrow_slip_id": result.borrow_slip_id,
                "book_id": result.book_id,
                "title": book.book_title.name if book and book.book_title else "Unknown",
                "author": book.book_title.author if book and book.book_title else None,
                "borrow_date": result.borrow_date.isoformat(),
                "due_date": result.detail_due_date.isoformat() if result.detail_due_date else None,
                "is_overdue": is_overdue,
                "days_overdue": days_overdue,
                "status": display_status
            })

        return {
            "total_borrowed": len(currently_borrowed_books),
            "currently_borrowed_books": currently_borrowed_books
        }

    @staticmethod
    def get_returned_books(reader_id: str) -> dict:
        """Get books that have been returned (based on BorrowSlipDetail.status = 'Returned')"""
        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        # Query BorrowSlipDetail with status = 'Returned'
        raw_results = db.session.query(
            BorrowSlipDetail.id,
            BorrowSlipDetail.borrow_slip_id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date'),
            BorrowSlip.borrow_date,
            BorrowSlip.return_date.label('slip_actual_return_date'),  # optional: from slip
            sa.cast(BorrowSlipDetail.status, sa.String).label('detail_status_str')
        ).join(
            BorrowSlip, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            sa.cast(BorrowSlipDetail.status, sa.String) == 'Returned'  # ← KEY CHANGE
        ).all()

        book_ids = [result.book_id for result in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}

        returned_books = []
        for result in raw_results:
            book = book_dict.get(result.book_id)

            # To calculate late return, we need the ACTUAL return date of the BOOK
            # But your model doesn't have it in BorrowSlipDetail yet.
            # So we use BorrowSlip.return_date as an approximation (same for all books in slip)
            actual_return_date = result.slip_actual_return_date

            is_overdue = False
            days_overdue = 0
            if result.detail_due_date and actual_return_date and actual_return_date > result.detail_due_date:
                is_overdue = True
                days_overdue = (actual_return_date.date() - result.detail_due_date.date()).days

            returned_books.append({
                "borrow_detail_id": result.id,
                "borrow_slip_id": result.borrow_slip_id,
                "book_id": result.book_id,
                "title": book.book_title.name if book and book.book_title else "Unknown",
                "author": book.book_title.author if book and book.book_title else None,
                "borrow_date": result.borrow_date.isoformat(),
                "due_date": result.detail_due_date.isoformat() if result.detail_due_date else None,
                "actual_return_date": actual_return_date.isoformat() if actual_return_date else None,
                "is_overdue": is_overdue,
                "days_overdue": days_overdue,
                "status": "Returned"
            })

        return {
            "total_returned": len(returned_books),
            "returned_books": returned_books
        }