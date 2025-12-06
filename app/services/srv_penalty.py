"""
Service for handling penalties (late, damage, lost)
"""
from datetime import datetime
from fastapi_sqlalchemy import db
from fastapi import HTTPException
import uuid
import re
import pytz

from app.models.model_penalty import PenaltySlip, PenaltyTypeEnum, PenaltyStatusEnum
from app.models.model_borrow import BorrowSlipDetail, BorrowSlip
from app.models.model_book import Book

tz_vn = pytz.timezone("Asia/Ho_Chi_Minh")

# Fine configuration
FINE_RATES = {
    "late_per_day": 5000,  # 5,000 VND per day for late returns
    "damage_min": 50000,  # Minimum 50,000 VND for damage
    "damage_max": 500000,  # Maximum 500,000 VND for damage
    "lost_multiplier": 1.5,  # 150% of book price for lost books (aligned with srv_return.py)
}


class PenaltyService:
    """Handle penalty creation and management"""

    @staticmethod
    def _extract_fine_from_description(description: str) -> float:
        """Extract fine amount from description string"""
        if not description:
            return 0.0
        # Look for pattern like "Fine: 50,000 VND" or "Compensation: 150,000 VND"
        match = re.search(r'(?:Fine|Compensation):\s*([\d,]+)\s*VND', description)
        if match:
            return float(match.group(1).replace(',', ''))
        return 0.0

    @staticmethod
    def calculate_current_late_fine(due_date: datetime, return_date: datetime = None) -> dict:
        """
        Calculate real-time late fine based on current date or return date.
        This provides dynamic penalty calculation without needing to update the database.

        Args:
            due_date: When the book should have been returned
            return_date: When book was actually returned (None if still borrowed)

        Returns:
            Dictionary with days_overdue and fine_amount
        """
        now = datetime.now(tz=tz_vn)
        
        # Make due_date timezone-aware if needed
        if due_date.tzinfo is None:
            due_date = tz_vn.localize(due_date)
        
        # Use return date if provided, otherwise use current time
        comparison_date = return_date if return_date else now
        if comparison_date.tzinfo is None:
            comparison_date = tz_vn.localize(comparison_date)
        
        # Calculate days overdue
        if comparison_date > due_date:
            days_overdue = (comparison_date.date() - due_date.date()).days
            fine_amount = days_overdue * FINE_RATES["late_per_day"]
            return {
                "days_overdue": days_overdue,
                "fine_amount": int(fine_amount),
                "is_overdue": True
            }
        else:
            return {
                "days_overdue": 0,
                "fine_amount": 0,
                "is_overdue": False
            }

    @staticmethod
    def get_real_time_penalty_info(borrow_detail_id: str) -> dict:
        """
        Get real-time penalty information for a borrow detail.
        Calculates current fine amount dynamically.

        Args:
            borrow_detail_id: ID of the borrow detail

        Returns:
            Dictionary with penalty information including real-time fine amount
        """
        # Get borrow detail
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()
        
        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")
        
        # Check for existing penalties
        penalties = db.session.query(PenaltySlip).filter(
            PenaltySlip.borrow_detail_id == borrow_detail_id
        ).all()
        
        result = {
            "borrow_detail_id": borrow_detail_id,
            "penalties": []
        }
        
        for penalty in penalties:
            penalty_info = {
                "penalty_id": penalty.penalty_id,
                "penalty_type": penalty.penalty_type.value,
                "status": penalty.status.value,
                "description": penalty.description
            }
            
            # For late penalties, calculate real-time fine
            if penalty.penalty_type == PenaltyTypeEnum.late and detail.due_date:
                fine_calc = PenaltyService.calculate_current_late_fine(
                    due_date=detail.due_date,
                    return_date=detail.return_date
                )
                penalty_info["fine_amount"] = fine_calc["fine_amount"]
                penalty_info["days_overdue"] = fine_calc["days_overdue"]
                penalty_info["real_time_calculated"] = True
            else:
                # For damage/lost penalties, extract from description
                penalty_info["fine_amount"] = int(PenaltyService._extract_fine_from_description(penalty.description))
                penalty_info["real_time_calculated"] = False
            
            result["penalties"].append(penalty_info)
        
        # If no penalty exists but book is overdue, calculate potential penalty
        if not penalties and detail.due_date and detail.return_date is None:
            fine_calc = PenaltyService.calculate_current_late_fine(
                due_date=detail.due_date
            )
            if fine_calc["is_overdue"]:
                result["potential_penalty"] = {
                    "penalty_type": "Late",
                    "fine_amount": fine_calc["fine_amount"],
                    "days_overdue": fine_calc["days_overdue"],
                    "status": "Not Created Yet",
                    "real_time_calculated": True
                }
        
        return result

    @staticmethod
    def create_late_penalty(borrow_detail_id: str, days_overdue: int) -> dict:
        """
        Create penalty for late return

        Args:
            borrow_detail_id: ID of the borrow detail
            days_overdue: Number of days overdue

        Returns:
            Dictionary with penalty information
        """
        # Calculate fine amount
        fine_amount = days_overdue * FINE_RATES["late_per_day"]

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
    def create_lost_penalty(borrow_detail_id: str, fine_amount: float = None) -> dict:
        """
        Create penalty for lost book

        Args:
            borrow_detail_id: ID of the borrow detail
            fine_amount: Optional custom fine amount (if not provided, calculate from book price)

        Returns:
            Dictionary with penalty information
        """
        # Validate borrow detail exists
        detail = db.session.query(BorrowSlipDetail).filter(
            BorrowSlipDetail.id == borrow_detail_id
        ).first()

        if not detail:
            raise HTTPException(status_code=404, detail="Borrow detail not found")

        # Get book to calculate price if fine_amount not provided
        book = db.session.query(Book).filter(
            Book.book_id == detail.book_id
        ).first()

        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        book_price = getattr(book, 'price', 100000)  # Default 100,000 VND

        # Calculate fine if not provided
        if fine_amount is None:
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
            description=f"Book lost. Book price: {int(book_price):,} VND. Compensation: {int(fine_amount):,} VND",
            status=PenaltyStatusEnum.pending
        )

        db.session.add(penalty)

        # Mark book as lost (update inventory if needed)
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

        # Extract fine amount before updating
        fine_amount = PenaltyService._extract_fine_from_description(penalty.description)

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
            "fine_amount": int(fine_amount) if fine_amount else 0,
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
            fine_amount = PenaltyService._extract_fine_from_description(penalty.description)
            penalties.append({
                "penalty_id": penalty.penalty_id,
                "penalty_type": penalty.penalty_type.value,
                "borrow_detail_id": detail.id,
                "book_id": detail.book_id,
                "borrow_date": slip.borrow_date.isoformat(),
                "return_date": detail.return_date.isoformat() if detail.return_date else None,
                "description": penalty.description,
                "fine_amount": int(fine_amount) if fine_amount else 0,
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

        # Calculate total amounts by parsing descriptions
        total_amount = 0
        pending_amount = 0
        paid_amount = 0

        for p in all_penalties:
            fine = PenaltyService._extract_fine_from_description(p.description)
            total_amount += fine
            if p.status == PenaltyStatusEnum.pending:
                pending_amount += fine
            elif p.status == PenaltyStatusEnum.paid:
                paid_amount += fine

        stats = {
            "total_penalties": len(all_penalties),
            "pending": sum(1 for p in all_penalties if p.status == PenaltyStatusEnum.pending),
            "paid": sum(1 for p in all_penalties if p.status == PenaltyStatusEnum.paid),
            "cancelled": sum(1 for p in all_penalties if p.status == PenaltyStatusEnum.cancelled),
            "by_type": {
                "late": sum(1 for p in all_penalties if p.penalty_type == PenaltyTypeEnum.late),
                "damage": sum(1 for p in all_penalties if p.penalty_type == PenaltyTypeEnum.damage),
                "lost": sum(1 for p in all_penalties if p.penalty_type == PenaltyTypeEnum.lost),
            },
            "amounts": {
                "total": int(total_amount),
                "pending": int(pending_amount),
                "paid": int(paid_amount)
            }
        }

        return stats