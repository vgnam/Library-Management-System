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

from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum
from app.models.model_book import Book
from app.models.model_reader import Reader
from app.models.model_penalty import PenaltySlip, PenaltyStatusEnum


class HistoryService:

    
    @staticmethod
    def get_borrow_history(
            reader_id: str,
            status: str = None,
            page: int = 1,
            page_size: int = 10
    ) -> dict:

        reader = db.session.query(Reader).filter(
            Reader.reader_id == reader_id
        ).first()

        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        # ===========================================================
        # 🔥 STEP 1 — AUTO UPDATE OVERDUE STATUS IN DATABASE
        # ===========================================================
        now = datetime.utcnow()

        active_details = db.session.query(BorrowSlipDetail).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            BorrowSlipDetail.status == "active"
        ).all()

        updated = False
        for detail in active_details:
            due_date = detail.return_date  # this is actually "detail_due_date"
            if due_date and now > due_date:
                detail.status = "overdue"
                updated = True

        if updated:
            db.session.commit()

        # ===========================================================
        # 🔥 STEP 2 — QUERY HISTORY (AFTER STATUS HAS BEEN UPDATED)
        # ===========================================================
        query = db.session.query(
            BorrowSlip.bs_id,
            BorrowSlip.borrow_date,
            BorrowSlipDetail.real_return_date.label('actual_return_date'),  # ← TỪ DETAIL
            BorrowSlipDetail.id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date'),
            sa.cast(BorrowSlipDetail.status, sa.String).label('detail_status_str')
        ).select_from(BorrowSlip).join(
            BorrowSlipDetail, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(BorrowSlip.reader_id == reader_id)

        # Optional status filter (user wants)
        if status:
            query = query.filter(BorrowSlipDetail.status == status.lower())

        total = query.count()
        raw_results = query.order_by(
            BorrowSlip.borrow_date.desc()
        ).offset(
            (page - 1) * page_size
        ).limit(
            page_size
        ).all()

        # Load book metadata only once
        book_ids = [r.book_id for r in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}

        # Load penalties for all borrow details
        detail_ids = [r.id for r in raw_results]
        penalties = db.session.query(PenaltySlip).filter(
            PenaltySlip.borrow_detail_id.in_(detail_ids)
        ).all()
        penalty_dict = {p.borrow_detail_id: p for p in penalties}

        # ===========================================================
        # 🔥 STEP 3 — BUILD RESPONSE
        # ===========================================================
        history = []
        for r in raw_results:
            book = book_dict.get(r.book_id)
            detail_status = r.detail_status_str.lower()
            due_date = r.detail_due_date
            actual_return = r.actual_return_date  # ← LẤY TỪ DETAIL

            display_status = detail_status.capitalize()
            is_overdue = False
            days_overdue = 0

            if detail_status == "active":
                if due_date and now > due_date:
                    display_status = "Overdue"
                    is_overdue = True
                    days_overdue = (now.date() - due_date.date()).days
                else:
                    display_status = "Active"

            elif detail_status == "returned":
                display_status = "Returned"
                # Check if it was returned late (for penalty calculation, but status is still Returned)
                if actual_return and due_date and actual_return > due_date:
                    is_overdue = True
                    days_overdue = (actual_return.date() - due_date.date()).days

            elif detail_status == "pendingreturn" or detail_status == "pending_return":
                display_status = "Pending Return"
                # Check if it's overdue even while pending return
                if due_date and now > due_date:
                    is_overdue = True
                    days_overdue = (now.date() - due_date.date()).days

            elif detail_status == "pending":
                display_status = "Pending"

            elif detail_status == "lost":
                display_status = "Lost"

            elif detail_status == "rejected":
                display_status = "Rejected"

            elif detail_status == "overdue":
                display_status = "Overdue"
                is_overdue = True
                if due_date:
                    days_overdue = (now.date() - due_date.date()).days

            # Get penalty info with REAL-TIME calculation
            penalty = penalty_dict.get(r.id)
            penalty_info = None
            if penalty:
                # Import PenaltyService for real-time calculation
                from app.services.srv_penalty import PenaltyService, PenaltyTypeEnum
                import re
                
                # For LATE penalties, calculate real-time fine amount
                if penalty.penalty_type == PenaltyTypeEnum.late and due_date:
                    fine_calc = PenaltyService.calculate_current_late_fine(
                        due_date=due_date,
                        return_date=actual_return
                    )
                    fine_amount = fine_calc["fine_amount"]
                    days_overdue_from_penalty = fine_calc["days_overdue"]
                else:
                    # For damage/lost, extract from description
                    fine_match = re.search(r'(?:Fine|Compensation):\s*([\d,]+)\s*VND', penalty.description or '')
                    fine_amount = int(fine_match.group(1).replace(',', '')) if fine_match else 0
                    days_overdue_from_penalty = days_overdue
                
                penalty_info = {
                    "penalty_id": penalty.penalty_id,
                    "penalty_type": penalty.penalty_type.value,
                    "description": penalty.description,
                    "fine_amount": fine_amount,
                    "days_overdue": days_overdue_from_penalty,
                    "status": penalty.status.value,
                    "real_time_calculated": penalty.penalty_type == PenaltyTypeEnum.late
                }
            elif is_overdue and days_overdue > 0:
                # No penalty record exists yet, but book is overdue - show potential penalty
                from app.services.srv_penalty import FINE_RATES
                potential_fine = days_overdue * FINE_RATES["late_per_day"]
                penalty_info = {
                    "penalty_id": None,
                    "penalty_type": "Late",
                    "description": f"Overdue: {days_overdue} days. Estimated fine: {int(potential_fine):,} VND",
                    "fine_amount": int(potential_fine),
                    "days_overdue": days_overdue,
                    "status": "Pending",
                    "real_time_calculated": True,
                    "auto_calculated": True
                }

            history.append({
                "borrow_slip_id": r.bs_id,
                "borrow_detail_id": r.id,
                "borrow_date": r.borrow_date.isoformat(),
                "due_date": due_date.isoformat() if due_date else None,
                "actual_return_date": actual_return.isoformat() if actual_return else None,
                "status": display_status,
                "penalty": penalty_info,
                "book": {
                    "book_id": r.book_id,
                    "title": book.book_title.name if book and book.book_title else "Unknown",
                    "author": book.book_title.author if book and book.book_title else None,
                    "due_date": due_date.isoformat() if due_date else None,
                    "actual_return_date": actual_return.isoformat() if actual_return else None,
                    "is_returned": detail_status == "returned",
                    "is_overdue": is_overdue,
                    "days_overdue": days_overdue,
                    "status": display_status
                }
            })

        # ===========================================================
        # 🔥 STEP 4 — RETURN JSON
        # ===========================================================
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "history": history
        }

    @staticmethod
    def get_overdue_books(reader_id: str) -> dict:
        """Get currently overdue books by reusing get_currently_borrowed_books logic."""
        # Gọi phương thức hiện có để lấy tất cả sách đang mượn
        result = HistoryService.get_currently_borrowed_books(reader_id)

        # Lọc chỉ giữ lại sách có is_overdue = True
        overdue_books = [
            book for book in result["currently_borrowed_books"]
            if book["is_overdue"]
        ]

        return {
            "total_overdue": len(overdue_books),
            "overdue_books": overdue_books
        }

    @staticmethod
    def get_currently_borrowed_books(reader_id: str) -> dict:
        """Get books currently being borrowed (status = Active, Overdue, or PendingReturn)
        
        AUTO-UPDATE LOGIC:
        1. Updates BorrowSlipDetail.status from Active -> Overdue if past due date
        2. Auto-suspends reading card if any overdue books exist
        """
        reader = db.session.query(Reader).filter(Reader.reader_id == reader_id).first()
        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        # Get card type from reading card
        from app.models.model_reading_card import ReadingCard, CardStatusEnum
        reading_card = db.session.query(ReadingCard).filter(
            ReadingCard.reader_id == reader_id
        ).first()
        
        card_type = reading_card.card_type.value if reading_card and reading_card.card_type else "Standard"
        max_books = 8 if card_type == "VIP" else 5

        now = datetime.utcnow()
        
        # ========================================
        # AUTO-UPDATE: Mark overdue books
        # ========================================
        # Find all Active books that are past due date
        overdue_details = db.session.query(BorrowSlipDetail).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            BorrowSlipDetail.status == BorrowStatusEnum.active,
            BorrowSlipDetail.return_date < now
        ).all()
        
        # Update them to Overdue status
        for detail in overdue_details:
            detail.status = BorrowStatusEnum.overdue
        
        if overdue_details:
            db.session.commit()
        
        # ========================================
        # Get current borrowed books (including newly marked overdue)
        # ========================================
        raw_results = db.session.query(
            BorrowSlipDetail.id,
            BorrowSlipDetail.borrow_slip_id,
            BorrowSlipDetail.book_id,
            BorrowSlipDetail.return_date.label('detail_due_date'),
            BorrowSlip.borrow_date,
            BorrowSlipDetail.real_return_date.label('actual_return_date'),
            sa.cast(BorrowSlipDetail.status, sa.String).label('detail_status_str')
        ).join(
            BorrowSlip, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            sa.cast(BorrowSlipDetail.status, sa.String).in_(['Active', 'Overdue', 'PendingReturn'])
        ).all()

        book_ids = [result.book_id for result in raw_results]
        books = db.session.query(Book).filter(Book.book_id.in_(book_ids)).all()
        book_dict = {b.book_id: b for b in books}
        has_overdue = any(result.detail_status_str.lower() == 'overdue' for result in raw_results)
        
        # ========================================
        # AUTO-BLOCK: Check for severe violations
        # ========================================
        should_block = False
        block_reason = None
        
        # Check Rule 1: Any book overdue ≥30 days -> Immediate block
        for result in raw_results:
            if result.detail_due_date and now > result.detail_due_date:
                days_overdue = (now.date() - result.detail_due_date.date()).days
                if days_overdue >= 30:
                    should_block = True
                    block_reason = f"Book overdue for {days_overdue} days (≥30 days)"
                    break
        
        # Check Rule 2: 3+ infractions -> Block
        if not should_block and reader.infraction_count >= 3:
            should_block = True
            block_reason = f"Accumulated {reader.infraction_count} infractions"
        
        # Apply block if needed
        if should_block and reading_card and reading_card.status != CardStatusEnum.blocked:
            reading_card.status = CardStatusEnum.blocked
            db.session.commit()
        
        # ========================================
        # AUTO-SUSPEND/UNSUSPEND CARD (only if not blocked)
        # ========================================
        if reading_card and reading_card.status != CardStatusEnum.blocked:
            if has_overdue:
                # Has overdue books -> Suspend if not already suspended
                if reading_card.status != CardStatusEnum.suspended:
                    reading_card.status = CardStatusEnum.suspended
                    db.session.commit()
            else:
                # No overdue books -> Unsuspend if currently suspended
                if reading_card.status == CardStatusEnum.suspended:
                    reading_card.status = CardStatusEnum.active
                    db.session.commit()
        
        currently_borrowed_books = []
        for result in raw_results:
            book = book_dict.get(result.book_id)
            detail_status = result.detail_status_str.lower()

            is_overdue = False
            days_overdue = 0
            if result.detail_due_date and now > result.detail_due_date:
                is_overdue = True
                days_overdue = (now.date() - result.detail_due_date.date()).days

            # Determine display status
            if detail_status == "pendingreturn":
                display_status = "Pending Return"
            elif is_overdue:
                display_status = "Overdue"
            else:
                display_status = "Active"

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

        total_borrowed = len(currently_borrowed_books)
        remaining_slots = max_books - total_borrowed
        
        # Get card status
        card_status = reading_card.status.value if reading_card and reading_card.status else "Active"

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
            BorrowSlipDetail.real_return_date.label('actual_return_date'),  # ← TỪ DETAIL
            sa.cast(BorrowSlipDetail.status, sa.String).label('detail_status_str')
        ).join(
            BorrowSlip, BorrowSlip.bs_id == BorrowSlipDetail.borrow_slip_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            sa.cast(BorrowSlipDetail.status, sa.String) == 'Returned'
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
            actual_return_date = result.actual_return_date

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