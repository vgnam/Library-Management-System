"""
Service for borrowing history queries using optimized views
"""
from datetime import datetime
from typing import Optional
from fastapi_sqlalchemy import db
from fastapi import HTTPException
from sqlalchemy import text
import pytz

from app.models.model_reader import Reader


class HistoryService:

    @staticmethod
    def get_borrow_history(
            reader_id: str,
            status: str = None,
            page: int = 1,
            page_size: int = 10
    ) -> dict:
        """Get borrow history using optimized view (NO N+1 problem!)"""

        # Verify reader exists
        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        # Build query with optional status filter
        where_clause = "WHERE reader_id = :reader_id"
        params = {
            "reader_id": reader_id,
            "offset": (page - 1) * page_size,
            "limit": page_size
        }

        if status and status.lower() != 'all':
            where_clause += " AND detail_status = :status"
            params["status"] = status.capitalize()

        # Count total
        count_query = text(f"""
            SELECT COUNT(*) as total
            FROM vw_borrow_history
            {where_clause}
        """)
        count_result = db.session.execute(count_query, params)
        total = count_result.fetchone()[0]

        # Get data
        data_query = text(f"""
            SELECT *
            FROM vw_borrow_history
            {where_clause}
            ORDER BY borrow_date DESC
            OFFSET :offset ROWS
            FETCH NEXT :limit ROWS ONLY
        """)

        result = db.session.execute(data_query, params)
        rows = result.fetchall()

        # Build response (all data already in view!)
        tz = pytz.timezone("Asia/Ho_Chi_Minh")
        history = []

        for row in rows:
            r = dict(row._mapping)

            # Calculate fine if overdue
            penalty_info = None
            if r['penalty_id']:
                # Penalty exists in database
                penalty_info = {
                    "penalty_id": r['penalty_id'],
                    "penalty_type": r['penalty_type'],
                    "description": r['penalty_description'],
                    "status": r['penalty_status'],
                    "days_overdue": r['days_overdue'],
                    "real_time_calculated": False
                }
            elif r['is_overdue'] and r['days_overdue'] > 0:
                # No penalty record yet, calculate estimated fine
                from app.services.srv_penalty import FINE_RATES

                days_overdue = r['days_overdue']
                book_price = float(r['book_price']) if r['book_price'] else None

                base_fine = days_overdue * FINE_RATES["late_per_day"]
                if days_overdue > FINE_RATES["late_threshold_days"] and book_price:
                    estimated_fine = base_fine + book_price
                else:
                    estimated_fine = base_fine

                penalty_info = {
                    "penalty_id": None,
                    "penalty_type": "Late",
                    "description": f"Overdue: {days_overdue} days. Estimated fine: {int(estimated_fine):,} VND",
                    "fine_amount": int(estimated_fine),
                    "days_overdue": days_overdue,
                    "status": "Pending",
                    "real_time_calculated": True,
                    "auto_calculated": True
                }

            history.append({
                "borrow_slip_id": r['bs_id'],
                "borrow_detail_id": r['borrow_detail_id'],
                "borrow_date": r['borrow_date'].isoformat(),
                "due_date": r['due_date'].isoformat() if r['due_date'] else None,
                "actual_return_date": r['actual_return_date'].isoformat() if r['actual_return_date'] else None,
                "status": r['display_status'],
                "penalty": penalty_info,
                "book": {
                    "book_id": r['book_id'],
                    "title": r['book_title'] or "Unknown",
                    "author": r['author'],
                    "category": r['category'],
                    "publisher": r['publisher_name'],
                    "due_date": r['due_date'].isoformat() if r['due_date'] else None,
                    "actual_return_date": r['actual_return_date'].isoformat() if r['actual_return_date'] else None,
                    "is_returned": r['detail_status'] == 'Returned',
                    "is_overdue": bool(r['is_overdue']),
                    "days_overdue": r['days_overdue'],
                    "status": r['display_status']
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
        """Get currently overdue books using view"""

        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        query = text("""
            SELECT 
                borrow_detail_id,
                borrow_slip_id,
                book_id,
                book_title,
                author,
                borrow_date,
                due_date,
                days_overdue,
                display_status
            FROM vw_currently_borrowed
            WHERE reader_id = :reader_id
              AND is_overdue = 1
            ORDER BY days_overdue DESC
        """)

        result = db.session.execute(query, {"reader_id": reader_id})
        rows = result.fetchall()

        overdue_books = []
        for row in rows:
            r = dict(row._mapping)
            overdue_books.append({
                "borrow_detail_id": r['borrow_detail_id'],
                "borrow_slip_id": r['borrow_slip_id'],
                "book_id": r['book_id'],
                "title": r['book_title'],
                "author": r['author'],
                "borrow_date": r['borrow_date'].isoformat(),
                "due_date": r['due_date'].isoformat(),
                "days_overdue": r['days_overdue'],
                "status": r['display_status']
            })

        return {
            "total_overdue": len(overdue_books),
            "overdue_books": overdue_books
        }

    @staticmethod
    def get_currently_borrowed_books(reader_id: str) -> dict:
        """Get books currently being borrowed using view"""

        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        query = text("""
            SELECT 
                borrow_detail_id,
                borrow_slip_id,
                book_id,
                book_title,
                author,
                category,
                borrow_date,
                due_date,
                display_status,
                is_overdue,
                days_overdue,
                estimated_fine,
                card_type,
                card_status,
                book_price
            FROM vw_currently_borrowed
            WHERE reader_id = :reader_id
            ORDER BY borrow_date DESC
        """)

        result = db.session.execute(query, {"reader_id": reader_id})
        rows = result.fetchall()

        currently_borrowed_books = []
        has_overdue = False

        for row in rows:
            r = dict(row._mapping)

            is_overdue = bool(r['is_overdue'])
            if is_overdue:
                has_overdue = True

            book_item = {
                "borrow_detail_id": r['borrow_detail_id'],
                "borrow_slip_id": r['borrow_slip_id'],
                "book_id": r['book_id'],
                "title": r['book_title'],
                "author": r['author'],
                "category": r['category'],
                "borrow_date": r['borrow_date'].isoformat(),
                "due_date": r['due_date'].isoformat() if r['due_date'] else None,
                "status": r['display_status'],
                "is_overdue": is_overdue,
                "days_overdue": r['days_overdue']
            }

            # Add penalty info if overdue
            if is_overdue and r['days_overdue'] > 0:
                book_item["penalty"] = {
                    "is_overdue": True,
                    "days_overdue": r['days_overdue'],
                    "fine_amount": int(r['estimated_fine']),
                    "book_price": float(r['book_price']) if r['book_price'] else None
                }

            currently_borrowed_books.append(book_item)

        total_borrowed = len(currently_borrowed_books)
        card_type = rows[0]['card_type'] if rows else "Standard"
        card_status = rows[0]['card_status'] if rows else "Active"
        max_books = 8 if card_type == "VIP" else 5
        remaining_slots = max_books - total_borrowed

        return {
            "total_borrowed": total_borrowed,
            "currently_borrowed_books": currently_borrowed_books,
            "card_type": card_type,
            "card_status": card_status,
            "max_books": max_books,
            "remaining_slots": remaining_slots,
            "has_overdue": has_overdue
        }

    @staticmethod
    def get_returned_books(reader_id: str) -> dict:
        """Get books that have been returned using view"""

        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        query = text("""
            SELECT 
                borrow_detail_id,
                borrow_slip_id,
                book_id,
                book_title,
                author,
                borrow_date,
                due_date,
                actual_return_date,
                display_status
            FROM vw_borrow_history
            WHERE reader_id = :reader_id
              AND detail_status = 'Returned'
            ORDER BY actual_return_date DESC
        """)

        result = db.session.execute(query, {"reader_id": reader_id})
        rows = result.fetchall()

        returned_books = []
        for row in rows:
            r = dict(row._mapping)
            returned_books.append({
                "borrow_detail_id": r['borrow_detail_id'],
                "borrow_slip_id": r['borrow_slip_id'],
                "book_id": r['book_id'],
                "title": r['book_title'],
                "author": r['author'],
                "borrow_date": r['borrow_date'].isoformat(),
                "due_date": r['due_date'].isoformat() if r['due_date'] else None,
                "actual_return_date": r['actual_return_date'].isoformat() if r['actual_return_date'] else None,
                "status": r['display_status']
            })

        return {
            "total_returned": len(returned_books),
            "returned_books": returned_books
        }
