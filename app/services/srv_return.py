"""
Service for handling book returns and loan tracking
"""
from datetime import datetime, timedelta
from fastapi_sqlalchemy import db
from fastapi import HTTPException

from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum
from app.models.model_book import Book
from app.models.model_reader import Reader
from app.models.model_reading_card import ReadingCard, CardTypeEnum

# Loan period configuration based on card type
LOAN_PERIODS = {
    CardTypeEnum.standard: 45,  # 45 days for standard readers
    CardTypeEnum.vip: 60,       # 60 days for VIP readers
}

# Borrow limits based on card type
BORROW_LIMITS = {
    CardTypeEnum.standard: 5,   # Up to 5 books
    CardTypeEnum.vip: 8,        # Up to 8 books
}


class ReturnService:
    """Handle return logic and loan tracking"""

    @staticmethod
    def return_borrowed_book(reader_id: str, borrow_detail_id: str) -> dict:
        """
        Return a borrowed book

        Args:
            reader_id: ID of the reader returning the book
            borrow_detail_id: ID of the borrow detail

        Returns:
            Dictionary with return information including overdue status
        """
        # Find borrow detail
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()

        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        # Verify ownership and get slip
        slip = db.session.query(BorrowSlip).filter(
            BorrowSlip.bs_id == detail.borrow_slip_id
        ).first()

        if not slip or slip.reader_id != reader_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot return book not belonging to you"
            )

        # Validate slip status
        if slip.status != BorrowStatusEnum.active:
            raise HTTPException(
                status_code=400,
                detail=f"Borrow slip is not active (current status: {slip.status.value})"
            )

        # Check if already returned
        if detail.return_date is not None:
            raise HTTPException(
                status_code=400,
                detail="Book already returned"
            )

        # Get reader and reading card to determine loan period
        reader = db.session.query(Reader).filter(
            Reader.reader_id == reader_id
        ).first()

        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        reading_card = db.session.query(ReadingCard).filter(
            ReadingCard.reader_id == reader_id
        ).first()

        if not reading_card:
            raise HTTPException(status_code=404, detail="Reading card not found")

        # Set return date (actual return time)
        return_datetime = datetime.utcnow()
        detail.return_date = return_datetime

        # Calculate due_date based on card type
        card_type = reading_card.card_type
        loan_days = LOAN_PERIODS.get(card_type, LOAN_PERIODS[CardTypeEnum.standard])

        borrow_datetime = slip.borrow_date
        calculated_due_date = borrow_datetime + timedelta(days=loan_days)

        # Calculate overdue status - compare return_date with due_date
        is_overdue = False
        days_overdue = 0

        if return_datetime > calculated_due_date:
            is_overdue = True
            # Calculate days overdue (date only, ignore time)
            days_overdue = (return_datetime.date() - calculated_due_date.date()).days

        # Mark book physical copy as available
        book = db.session.query(Book).filter(
            Book.book_id == detail.book_id
        ).first()

        if book:
            book.being_borrowed = False
        else:
            print(f"Warning: Book {detail.book_id} not found when returning")

        # Check if all items in slip are returned
        remaining = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.borrow_slip_id == slip.bs_id,
            BorrowSlipDetail.return_date.is_(None)
        ).count()

        # Update slip status if all items returned
        if remaining == 0:
            slip.status = BorrowStatusEnum.returned
            slip.return_date = return_datetime

        # Calculate fine if overdue and create penalty
        fine_amount = 0
        penalty_info = None
        if is_overdue:
            fine_amount = ReturnService._calculate_fine(days_overdue)
            # Create late penalty using PenaltyService
            try:
                from app.services.srv_penalty import PenaltyService
                penalty_info = PenaltyService.create_late_penalty(
                    detail.id,
                    days_overdue,
                    fine_amount
                )
            except Exception as e:
                print(f"Warning: Could not create penalty: {e}")

        # Commit all changes
        db.session.commit()

        # Prepare response
        response = {
            "message": "Book returned successfully",
            "borrow_detail_id": borrow_detail_id,
            "book_id": detail.book_id,
            "reader_id": reader_id,
            "card_type": card_type.value,
            "loan_period_days": loan_days,
            "borrow_date": borrow_datetime.isoformat(),
            "calculated_due_date": calculated_due_date.isoformat(),
            "return_date": return_datetime.isoformat(),
            "is_overdue": is_overdue,
        }

        # Add overdue information if applicable
        if is_overdue:
            response["days_overdue"] = days_overdue
            response["fine_amount"] = fine_amount
            response["warning"] = f"Book is {days_overdue} day(s) overdue. Fine: {fine_amount:,.0f} VND"
            if penalty_info:
                response["penalty_id"] = penalty_info["penalty_id"]
                response["penalty_status"] = penalty_info["status"]

        return response

    @staticmethod
    def _calculate_fine(days_overdue: int, rate_per_day: float = 5000) -> float:
        """
        Calculate fine for overdue books with progressive rates

        Args:
            days_overdue: Number of days the book is overdue
            rate_per_day: Base fine rate per day (default: 5000 VND)

        Returns:
            Total fine amount in VND
        """
        if days_overdue <= 0:
            return 0.0

        # Progressive fine structure
        if days_overdue <= 7:
            # 1-7 days: standard rate (5,000 VND/day)
            return days_overdue * rate_per_day
        elif days_overdue <= 30:
            # 8-30 days: first 7 days + 50% increase (7,500 VND/day)
            base = 7 * rate_per_day
            additional = (days_overdue - 7) * rate_per_day * 1.5
            return base + additional
        else:
            # >30 days: accumulated + 100% increase (10,000 VND/day)
            base = (7 * rate_per_day) + (23 * rate_per_day * 1.5)
            additional = (days_overdue - 30) * rate_per_day * 2
            return base + additional

    @staticmethod
    def report_book_damage(reader_id: str, borrow_detail_id: str,
                          damage_description: str, fine_amount: float = None) -> dict:
        """
        Report a damaged book when returning

        Args:
            reader_id: Reader ID
            borrow_detail_id: Borrow detail ID
            damage_description: Description of damage
            fine_amount: Optional custom fine amount

        Returns:
            Dictionary with damage report confirmation
        """
        from app.services.srv_penalty import PenaltyService

        # Verify the borrow detail belongs to the reader
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()

        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        slip = db.session.query(BorrowSlip).filter(
            BorrowSlip.bs_id == detail.borrow_slip_id
        ).first()

        if not slip or slip.reader_id != reader_id:
            raise HTTPException(
                status_code=403,
                detail="This borrow detail does not belong to you"
            )

        # Create damage penalty
        penalty_info = PenaltyService.create_damage_penalty(
            borrow_detail_id,
            damage_description,
            fine_amount
        )

        return {
            "message": "Damage reported successfully",
            "borrow_detail_id": borrow_detail_id,
            "book_id": detail.book_id,
            "penalty_id": penalty_info["penalty_id"],
            "fine_amount": penalty_info["fine_amount"],
            "status": "Pending"
        }

    @staticmethod
    def report_book_lost(reader_id: str, borrow_detail_id: str) -> dict:
        """
        Report a lost book

        Args:
            reader_id: Reader ID
            borrow_detail_id: Borrow detail ID

        Returns:
            Dictionary with lost report confirmation
        """
        from app.services.srv_penalty import PenaltyService

        # Verify the borrow detail belongs to the reader
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()

        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        slip = db.session.query(BorrowSlip).filter(
            BorrowSlip.bs_id == detail.borrow_slip_id
        ).first()

        if not slip or slip.reader_id != reader_id:
            raise HTTPException(
                status_code=403,
                detail="This borrow detail does not belong to you"
            )

        # Create lost penalty
        penalty_info = PenaltyService.create_lost_penalty(borrow_detail_id)

        return {
            "message": "Lost book reported successfully",
            "borrow_detail_id": borrow_detail_id,
            "book_id": detail.book_id,
            "penalty_id": penalty_info["penalty_id"],
            "book_price": penalty_info["book_price"],
            "fine_amount": penalty_info["fine_amount"],
            "status": "Pending",
            "note": "Please pay the compensation to the library"
        }

    @staticmethod
    def get_overdue_books(reader_id: str = None) -> list:
        """
        Get list of overdue books

        Args:
            reader_id: Optional filter by reader

        Returns:
            List of overdue borrow details with fine calculations
        """
        query = db.session.query(
            BorrowSlipDetail,
            BorrowSlip,
            Reader,
            ReadingCard
        ).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).join(
            Reader, BorrowSlip.reader_id == Reader.reader_id
        ).join(
            ReadingCard, Reader.reader_id == ReadingCard.reader_id
        ).filter(
            BorrowSlip.status == BorrowStatusEnum.active,
            BorrowSlipDetail.return_date.is_(None)
        )

        if reader_id:
            query = query.filter(BorrowSlip.reader_id == reader_id)

        results = query.all()
        overdue_list = []

        for detail, slip, reader, card in results:
            # Determine loan period based on card type
            card_type = card.card_type
            loan_days = LOAN_PERIODS.get(card_type, LOAN_PERIODS[CardTypeEnum.standard])

            borrow_date = slip.borrow_date
            due_date = borrow_date + timedelta(days=loan_days)

            # Check if overdue
            if datetime.utcnow() > due_date:
                days_overdue = (datetime.utcnow().date() - due_date.date()).days
                overdue_list.append({
                    "borrow_detail_id": detail.id,
                    "borrow_slip_id": slip.bs_id,
                    "book_id": detail.book_id,
                    "reader_id": slip.reader_id,
                    "card_type": card_type.value,
                    "loan_period_days": loan_days,
                    "borrow_date": borrow_date.isoformat(),
                    "due_date": due_date.isoformat(),
                    "days_overdue": days_overdue,
                    "fine_amount": ReturnService._calculate_fine(days_overdue)
                })

        return overdue_list

    @staticmethod
    def check_reader_status(reader_id: str) -> dict:
        """
        Check reader's borrowing status and limits

        Args:
            reader_id: Reader ID to check

        Returns:
            Dictionary with reader's borrowing information
        """
        # Get reader and reading card
        reader = db.session.query(Reader).filter(
            Reader.reader_id == reader_id
        ).first()

        if not reader:
            raise HTTPException(status_code=404, detail="Reader not found")

        reading_card = db.session.query(ReadingCard).filter(
            ReadingCard.reader_id == reader_id
        ).first()

        if not reading_card:
            raise HTTPException(status_code=404, detail="Reading card not found")

        card_type = reading_card.card_type

        # Determine limits based on card type
        max_books = BORROW_LIMITS.get(card_type, BORROW_LIMITS[CardTypeEnum.standard])
        loan_days = LOAN_PERIODS.get(card_type, LOAN_PERIODS[CardTypeEnum.standard])

        # Count currently borrowed books
        active_borrows = db.session.query(BorrowSlipDetail).join(BorrowSlip).filter(
            BorrowSlip.reader_id == reader_id,
            BorrowSlip.status == BorrowStatusEnum.active,
            BorrowSlipDetail.return_date.is_(None)
        ).count()

        # Check for overdue books
        overdue_books = ReturnService.get_overdue_books(reader_id)
        total_fines = sum(book['fine_amount'] for book in overdue_books)

        # Check card status
        can_borrow = (
            reading_card.status == "Active" and
            active_borrows < max_books and
            total_fines == 0  # Cannot borrow if has unpaid fines
        )

        return {
            "reader_id": reader_id,
            "card_id": reading_card.card_id,
            "card_type": card_type.value,
            "card_status": reading_card.status.value,
            "max_books_allowed": max_books,
            "loan_period_days": loan_days,
            "currently_borrowed": active_borrows,
            "available_slots": max(0, max_books - active_borrows),
            "can_borrow_more": can_borrow,
            "overdue_count": len(overdue_books),
            "total_fines": total_fines,
            "has_penalties": total_fines > 0,
            "total_borrowed_history": reader.total_borrowed
        }

    @staticmethod
    def get_reader_borrow_history(reader_id: str, limit: int = 10) -> list:
        """
        Get reader's borrow history

        Args:
            reader_id: Reader ID
            limit: Maximum number of records to return

        Returns:
            List of borrow records
        """
        results = db.session.query(
            BorrowSlipDetail,
            BorrowSlip,
            Book
        ).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).join(
            Book, BorrowSlipDetail.book_id == Book.book_id
        ).filter(
            BorrowSlip.reader_id == reader_id
        ).order_by(
            BorrowSlip.borrow_date.desc()
        ).limit(limit).all()

        history = []
        for detail, slip, book in results:
            history.append({
                "borrow_detail_id": detail.id,
                "borrow_slip_id": slip.bs_id,
                "book_id": book.book_id,
                "book_title": getattr(book, 'title', 'Unknown'),
                "borrow_date": slip.borrow_date.isoformat(),
                "return_date": detail.return_date.isoformat() if detail.return_date else None,
                "status": slip.status.value,
                "is_returned": detail.return_date is not None
            })

        return history