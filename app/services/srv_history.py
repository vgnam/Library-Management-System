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
        status: str = None,  # Changed to string
        page: int = 1,
        page_size: int = 10
    ) -> dict:
        """Get borrow history with pagination"""

        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        # Use raw SQL to avoid enum conversion
        query = db.session.query(
            BorrowSlip.bs_id,
            BorrowSlip.borrow_date,
            BorrowSlip.return_date,
            sa.cast(BorrowSlip.status, sa.String).label('status_str'),
            BorrowSlipDetail.id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date')
        ).join(
            BorrowSlipDetail, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(BorrowSlip.reader_id == reader_id)

        if status:
            query = query.filter(sa.cast(BorrowSlip.status, sa.String) == status)

        total = query.count()
        raw_results = query.order_by(BorrowSlip.borrow_date.desc()).offset((page - 1) * page_size).limit(page_size).all()

        # Load all books
        book_ids = [result.book_id for result in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}

        history = []
        for result in raw_results:
            book = book_dict.get(result.book_id)

            # Convert status to lowercase for comparison
            status_lower = str(result.status_str).lower()

            # Determine per-book status
            if status_lower == 'pending':
                book_status = "Pending"
                is_overdue = False
                days_overdue = 0
            elif status_lower == 'rejected':
                book_status = "Rejected"
                is_overdue = False
                days_overdue = 0
            elif status_lower == 'overdue':
                book_status = "Overdue"
                is_overdue = True
                days_overdue = 0
                # Check if it's actually overdue based on due date
                if result.detail_due_date and datetime.utcnow() > result.detail_due_date:
                    days_overdue = (datetime.utcnow().date() - result.detail_due_date.date()).days
            elif status_lower == 'active':
                if result.return_date:  # Already returned
                    if result.detail_due_date and result.return_date > result.detail_due_date:
                        book_status = "Overdue"
                        is_overdue = True
                        days_overdue = (result.return_date.date() - result.detail_due_date.date()).days
                    else:
                        book_status = "Returned"
                        is_overdue = False
                        days_overdue = 0
                else:  # Not returned yet
                    if result.detail_due_date and datetime.utcnow() > result.detail_due_date:
                        book_status = "Overdue"
                        is_overdue = True
                        days_overdue = (datetime.utcnow().date() - result.detail_due_date.date()).days
                    else:
                        book_status = "Active"
                        is_overdue = False
                        days_overdue = 0
            elif status_lower == 'returned':
                book_status = "Returned"
                is_overdue = False
                days_overdue = 0
            else:
                book_status = str(result.status_str)
                is_overdue = False
                days_overdue = 0

            history.append({
                "borrow_slip_id": result.bs_id,
                "borrow_detail_id": result.id,
                "borrow_date": result.borrow_date.isoformat(),
                "due_date": result.detail_due_date.isoformat() if result.detail_due_date else None,
                "actual_return_date": result.return_date.isoformat() if result.return_date else None,
                "status": str(result.status_str).capitalize(),
                "book": {
                    "book_id": result.book_id,
                    "title": book.book_title.name if book and book.book_title else "Unknown",
                    "author": book.book_title.author if book and book.book_title else None,
                    "due_date": result.detail_due_date.isoformat() if result.detail_due_date else None,
                    "actual_return_date": result.return_date.isoformat() if result.return_date else None,
                    "is_returned": result.return_date is not None,
                    "is_overdue": is_overdue,
                    "days_overdue": days_overdue,
                    "status": book_status
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
        """Get currently overdue books (not returned and past due date)"""

        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        # Use raw SQL to avoid enum conversion
        raw_results = db.session.query(
            BorrowSlipDetail.id,
            BorrowSlipDetail.borrow_slip_id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date'),
            BorrowSlip.borrow_date,
            BorrowSlip.return_date.label('actual_return_date'),
            sa.cast(BorrowSlip.status, sa.String).label('status_str')
        ).join(
            BorrowSlip, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            sa.or_(
                sa.cast(BorrowSlip.status, sa.String) == 'Active',
                sa.cast(BorrowSlip.status, sa.String) == 'Overdue'
            ),
            BorrowSlip.return_date.is_(None),
            BorrowSlipDetail.return_date.isnot(None),
            BorrowSlipDetail.return_date < datetime.utcnow()
        ).all()

        book_ids = [result.book_id for result in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}

        overdue_books = []
        for result in raw_results:
            book = book_dict.get(result.book_id)
            days_overdue = (datetime.utcnow().date() - result.detail_due_date.date()).days

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
        """Get books currently being borrowed (not returned yet)"""

        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        # Use raw SQL to avoid enum conversion
        raw_results = db.session.query(
            BorrowSlipDetail.id,
            BorrowSlipDetail.borrow_slip_id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date'),
            BorrowSlip.borrow_date,
            BorrowSlip.return_date.label('actual_return_date'),
            sa.cast(BorrowSlip.status, sa.String).label('status_str')
        ).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            sa.or_(
                sa.cast(BorrowSlip.status, sa.String) == 'Active',
                sa.cast(BorrowSlip.status, sa.String) == 'Overdue'
            ),
            BorrowSlip.return_date.is_(None)
        ).all()

        book_ids = [result.book_id for result in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}

        currently_borrowed_books = []
        for result in raw_results:
            book = book_dict.get(result.book_id)

            is_overdue = False
            days_overdue = 0
            if result.detail_due_date and datetime.utcnow() > result.detail_due_date:
                is_overdue = True
                days_overdue = (datetime.utcnow().date() - result.detail_due_date.date()).days

            # Determine status based on overdue status
            book_status = "Overdue" if is_overdue else "Active"

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
                "status": book_status
            })

        return {
            "total_borrowed": len(currently_borrowed_books),
            "currently_borrowed_books": currently_borrowed_books
        }