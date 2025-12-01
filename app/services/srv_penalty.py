"""
Service for handling penalties (late, damage, lost)
"""
from datetime import datetime
from fastapi_sqlalchemy import db
from fastapi import HTTPException
import uuid

from app.models.model_penalty import PenaltySlip, PenaltyTypeEnum, PenaltyStatusEnum
from app.models.model_borrow import BorrowSlipDetail, BorrowSlip
from app.models.model_book import Book

# Fine configuration
FINE_RATES = {
    "late_per_day": 5000,  # 5,000 VND per day for late returns
    "damage_min": 50000,  # Minimum 50,000 VND for damage
    "damage_max": 500000,  # Maximum 500,000 VND for damage
    "lost_multiplier": 2.0,  # 200% of book price for lost books
}


class PenaltyService:
    """Handle penalty creation and management"""

    @staticmethod
    def create_late_penalty(borrow_detail_id: str, days_overdue: int, fine_amount: float) -> dict:
        """
        Create penalty for late return

        Args:
            borrow_detail_id: ID of the borrow detail
            days_overdue: Number of days overdue
            fine_amount: Calculated fine amount

        Returns:
            Dictionary with penalty information
        """
        # Check if penalty already exists
        existing_penalty = db.session.query(PenaltySlip).filter(
            PenaltySlip.borrow_detail_id == borrow_detail_id,
            PenaltySlip.penalty_type == PenaltyTypeEnum.late
        ).first()

        if existing_penalty:
            # Update existing penalty
            existing_penalty.description = f"Late return: {days_overdue} days overdue. Fine: {int(fine_amount):,} VND"
            existing_penalty.status = PenaltyStatusEnum.pending

            db.session.commit()

            return {
                "penalty_id": existing_penalty.penalty_id,
                "message": "Penalty updated",
                "penalty_type": "Late",
                "days_overdue": days_overdue,
                "fine_amount": int(fine_amount),
                "status": existing_penalty.status.value
            }
        else:
            # Create new penalty
            penalty = PenaltySlip(
                penalty_id=f"PEN-{uuid.uuid4().hex[:8].upper()}",
                borrow_detail_id=borrow_detail_id,
                penalty_type=PenaltyTypeEnum.late,
                description=f"Late return: {days_overdue} days overdue. Fine: {int(fine_amount):,} VND",
                status=PenaltyStatusEnum.pending
            )

            db.session.add(penalty)
            db.session.commit()

            return {
                "penalty_id": penalty.penalty_id,
                "message": "Late penalty created",
                "penalty_type": "Late",
                "days_overdue": days_overdue,
                "fine_amount": int(fine_amount),
                "status": penalty.status.value
            }

    @staticmethod
    def create_damage_penalty(borrow_detail_id: str, damage_description: str,
                              fine_amount: float = None) -> dict:
        """
        Create penalty for damaged book

        Args:
            borrow_detail_id: ID of the borrow detail
            damage_description: Description of the damage
            fine_amount: Optional custom fine amount (otherwise use default)

        Returns:
            Dictionary with penalty information
        """
        # Validate borrow detail exists
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()

        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        # Calculate fine if not provided
        if fine_amount is None:
            fine_amount = FINE_RATES["damage_min"]
        else:
            # Ensure fine is within acceptable range
            fine_amount = max(
                FINE_RATES["damage_min"],
                min(fine_amount, FINE_RATES["damage_max"])
            )

        # Check if damage penalty already exists
        existing_penalty = db.session.query(PenaltySlip).filter(
            PenaltySlip.borrow_detail_id == borrow_detail_id,
            PenaltySlip.penalty_type == PenaltyTypeEnum.damage
        ).first()

        if existing_penalty:
            raise HTTPException(
                status_code=400,
                detail="Damage penalty already exists for this borrow detail"
            )

        # Create penalty
        penalty = PenaltySlip(
            penalty_id=f"PEN-{uuid.uuid4().hex[:8].upper()}",
            borrow_detail_id=borrow_detail_id,
            penalty_type=PenaltyTypeEnum.damage,
            description=f"Book damage: {damage_description}. Fine: {int(fine_amount):,} VND",
            status=PenaltyStatusEnum.pending
        )

        db.session.add(penalty)
        db.session.commit()

        return {
            "penalty_id": penalty.penalty_id,
            "message": "Damage penalty created",
            "penalty_type": "Damage",
            "description": damage_description,
            "fine_amount": int(fine_amount),
            "status": penalty.status.value
        }

    @staticmethod
    def create_lost_penalty(borrow_detail_id: str, book_price: float = None) -> dict:
        """
        Create penalty for lost book

        Args:
            borrow_detail_id: ID of the borrow detail
            book_price: Optional book price (if not provided, fetch from Book)

        Returns:
            Dictionary with penalty information
        """
        # Validate borrow detail exists
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()

        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        # Get book price if not provided
        if book_price is None:
            book = db.session.query(Book).filter(
                Book.book_id == detail.book_id
            ).first()

            if not book:
                raise HTTPException(status_code=404, detail="Book not found")

            # Assume Book model has a 'price' field
            book_price = getattr(book, 'price', 100000)  # Default 100,000 VND

        # Calculate fine: 200% of book price
        fine_amount = book_price * FINE_RATES["lost_multiplier"]

        # Check if lost penalty already exists
        existing_penalty = db.session.query(PenaltySlip).filter(
            PenaltySlip.borrow_detail_id == borrow_detail_id,
            PenaltySlip.penalty_type == PenaltyTypeEnum.lost
        ).first()

        if existing_penalty:
            raise HTTPException(
                status_code=400,
                detail="Lost penalty already exists for this borrow detail"
            )

        # Create penalty
        penalty = PenaltySlip(
            penalty_id=f"PEN-{uuid.uuid4().hex[:8].upper()}",
            borrow_detail_id=borrow_detail_id,
            penalty_type=PenaltyTypeEnum.lost,
            description=f"Book lost. Compensation: {int(fine_amount):,} VND (Book price: {int(book_price):,} VND × 2)",
            status=PenaltyStatusEnum.pending
        )

        db.session.add(penalty)

        # Mark book as lost (update inventory if needed)
        book = db.session.query(Book).filter(Book.book_id == detail.book_id).first()
        if book:
            book.being_borrowed = False  # Book is no longer borrowed
            # You might want to decrease total_quantity or mark as lost

        db.session.commit()

        return {
            "penalty_id": penalty.penalty_id,
            "message": "Lost penalty created",
            "penalty_type": "Lost",
            "book_price": int(book_price),
            "fine_amount": int(fine_amount),
            "status": penalty.status.value
        }

    @staticmethod
    def pay_penalty(penalty_id: str, paid_by: str = None) -> dict:
        """
        Mark penalty as paid

        Args:
            penalty_id: ID of the penalty
            paid_by: Optional ID of who paid (reader_id or librarian_id)

        Returns:
            Dictionary with payment confirmation
        """
        penalty = db.session.query(PenaltySlip).filter(
            PenaltySlip.penalty_id == penalty_id
        ).first()

        if not penalty:
            raise HTTPException(status_code=404, detail="Penalty not found")

        if penalty.status == PenaltyStatusEnum.paid:
            raise HTTPException(status_code=400, detail="Penalty already paid")

        if penalty.status == PenaltyStatusEnum.cancelled:
            raise HTTPException(status_code=400, detail="Penalty is cancelled")

        # Update status
        penalty.status = PenaltyStatusEnum.paid

        # Update description to include payment info
        payment_note = f" | Paid on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        if paid_by:
            payment_note += f" by {paid_by}"

        penalty.description = (penalty.description or "") + payment_note

        db.session.commit()

        return {
            "penalty_id": penalty.penalty_id,
            "message": "Penalty marked as paid",
            "penalty_type": penalty.penalty_type.value,
            "status": penalty.status.value,
            "paid_at": datetime.utcnow().isoformat()
        }

    @staticmethod
    def cancel_penalty(penalty_id: str, reason: str = None) -> dict:
        """
        Cancel a penalty (e.g., wrongly issued)

        Args:
            penalty_id: ID of the penalty
            reason: Optional reason for cancellation

        Returns:
            Dictionary with cancellation confirmation
        """
        penalty = db.session.query(PenaltySlip).filter(
            PenaltySlip.penalty_id == penalty_id
        ).first()

        if not penalty:
            raise HTTPException(status_code=404, detail="Penalty not found")

        if penalty.status == PenaltyStatusEnum.paid:
            raise HTTPException(
                status_code=400,
                detail="Cannot cancel paid penalty. Please process refund separately."
            )

        # Update status
        penalty.status = PenaltyStatusEnum.cancelled

        # Update description to include cancellation reason
        cancellation_note = f" | Cancelled on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        if reason:
            cancellation_note += f". Reason: {reason}"

        penalty.description = (penalty.description or "") + cancellation_note

        db.session.commit()

        return {
            "penalty_id": penalty.penalty_id,
            "message": "Penalty cancelled",
            "penalty_type": penalty.penalty_type.value,
            "status": penalty.status.value,
            "cancelled_at": datetime.utcnow().isoformat()
        }

    @staticmethod
    def get_reader_penalties(reader_id: str, status: str = None) -> list:
        """
        Get all penalties for a reader

        Args:
            reader_id: Reader ID
            status: Optional filter by status (Pending/Paid/Cancelled)

        Returns:
            List of penalties
        """
        query = db.session.query(PenaltySlip, BorrowSlipDetail, BorrowSlip).join(
            BorrowSlipDetail, PenaltySlip.borrow_detail_id == BorrowSlipDetail.id
        ).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlip.reader_id == reader_id
        )

        if status:
            try:
                status_enum = PenaltyStatusEnum[status.lower()]
                query = query.filter(PenaltySlip.status == status_enum)
            except KeyError:
                raise HTTPException(status_code=400, detail="Invalid status")

        results = query.all()
        penalties = []

        for penalty, detail, slip in results:
            penalties.append({
                "penalty_id": penalty.penalty_id,
                "penalty_type": penalty.penalty_type.value,
                "borrow_detail_id": detail.id,
                "book_id": detail.book_id,
                "borrow_date": slip.borrow_date.isoformat(),
                "return_date": detail.return_date.isoformat() if detail.return_date else None,
                "description": penalty.description,
                "status": penalty.status.value
            })

        return penalties

    @staticmethod
    def get_penalty_statistics(reader_id: str = None) -> dict:
        """
        Get penalty statistics

        Args:
            reader_id: Optional reader ID to filter

        Returns:
            Dictionary with statistics
        """
        query = db.session.query(PenaltySlip)

        if reader_id:
            query = query.join(
                BorrowSlipDetail, PenaltySlip.borrow_detail_id == BorrowSlipDetail.id
            ).join(
                BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
            ).filter(
                BorrowSlip.reader_id == reader_id
            )

        all_penalties = query.all()

        stats = {
            "total_penalties": len(all_penalties),
            "pending": sum(1 for p in all_penalties if p.status == PenaltyStatusEnum.pending),
            "paid": sum(1 for p in all_penalties if p.status == PenaltyStatusEnum.paid),
            "cancelled": sum(1 for p in all_penalties if p.status == PenaltyStatusEnum.cancelled),
            "by_type": {
                "late": sum(1 for p in all_penalties if p.penalty_type == PenaltyTypeEnum.late),
                "damage": sum(1 for p in all_penalties if p.penalty_type == PenaltyTypeEnum.damage),
                "lost": sum(1 for p in all_penalties if p.penalty_type == PenaltyTypeEnum.lost),
            }
        }

        return stats