# app/services/srv_manager.py
from fastapi import HTTPException, status
from fastapi_sqlalchemy import db
from sqlalchemy import func
from typing import Dict, List
from datetime import datetime, timedelta
import uuid

from app.models.model_user import User, UserRoleEnum
from app.models.model_librarian import Librarian
from app.models.model_reader import Reader
from app.models.model_reading_card import ReadingCard, CardStatusEnum
from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum
from app.models.model_penalty import PenaltySlip, PenaltyStatusEnum
from app.core.security import get_password_hash


class ManagerService:
    """Service for manager operations including statistics and librarian management"""

    def get_system_statistics(self) -> Dict:
        """
        Get comprehensive system statistics for managers
        
        Returns:
            Dictionary with system statistics including:
            - Number of cards issued
            - Borrowing frequency and trends
            - Infraction statistics
            - Reading trends
        """
        try:
            # Auto-create/update penalties for overdue books before calculating statistics
            from app.services.srv_penalty import PenaltyService
            try:
                PenaltyService.auto_create_overdue_penalties()
            except Exception as e:
                # Log but don't fail statistics if penalty creation fails
                print(f"Warning: Failed to auto-create penalties: {e}")
            # Total number of cards issued
            total_cards = db.session.query(ReadingCard).count()
            
            # Active cards
            active_cards = db.session.query(ReadingCard).filter(
                ReadingCard.status == CardStatusEnum.active
            ).count()
            
            # Suspended cards
            suspended_cards = db.session.query(ReadingCard).filter(
                ReadingCard.status == CardStatusEnum.suspended
            ).count()
            
            # Blocked cards
            blocked_cards = db.session.query(ReadingCard).filter(
                ReadingCard.status == CardStatusEnum.blocked
            ).count()
            
            # Total readers
            total_readers = db.session.query(Reader).count()
            
            # Total librarians
            total_librarians = db.session.query(Librarian).count()
            
            # Borrowing statistics
            total_borrows = db.session.query(BorrowSlipDetail).count()
            
            active_borrows = db.session.query(BorrowSlipDetail).filter(
                BorrowSlipDetail.status.in_([
                    BorrowStatusEnum.active,
                    BorrowStatusEnum.overdue,
                    BorrowStatusEnum.pending_return
                ])
            ).count()
            
            overdue_borrows = db.session.query(BorrowSlipDetail).filter(
                BorrowSlipDetail.status == BorrowStatusEnum.overdue
            ).count()
            
            returned_borrows = db.session.query(BorrowSlipDetail).filter(
                BorrowSlipDetail.status == BorrowStatusEnum.returned
            ).count()
            
            # Infraction statistics
            total_infractions = db.session.query(
                func.sum(ReadingCard.infraction_count)
            ).scalar() or 0
            
            readers_with_infractions = db.session.query(ReadingCard).filter(
                ReadingCard.infraction_count > 0
            ).count()
            
            # Penalty statistics - Calculate actual amounts from late fees
            LATE_FEE_PER_DAY = 5000  # 5,000 VND per day
            now = datetime.now()
            
            # Get all penalties with their borrow details
            penalties_query = db.session.query(PenaltySlip).join(
                BorrowSlipDetail, 
                PenaltySlip.borrow_detail_id == BorrowSlipDetail.id
            ).all()
            
            total_penalties = len(penalties_query)
            total_penalty_amount = 0
            unpaid_penalty_amount = 0
            unpaid_penalties = 0
            processed_detail_ids = set()  # Track which details have penalty records
            
            for penalty in penalties_query:
                penalty_amount = 0
                
                # Get the borrow detail
                detail = db.session.query(BorrowSlipDetail).filter(
                    BorrowSlipDetail.id == penalty.borrow_detail_id
                ).first()
                
                if detail:
                    processed_detail_ids.add(detail.id)
                    
                    if detail.return_date:
                        # Get book price
                        from app.models.model_book import Book
                        book = db.session.query(Book).filter(Book.book_id == detail.book_id).first()
                        book_price = None
                        if book and book.book_title and book.book_title.price:
                            book_price = float(book.book_title.price)
                        
                        # Calculate days overdue
                        if detail.real_return_date:
                            # Book was returned
                            if detail.real_return_date > detail.return_date:
                                days_overdue = (detail.real_return_date.date() - detail.return_date.date()).days
                                # Áp dụng công thức mới
                                base_fine = days_overdue * LATE_FEE_PER_DAY
                                if days_overdue > 30 and book_price:
                                    penalty_amount = base_fine + book_price
                                else:
                                    penalty_amount = base_fine
                        else:
                            # Book is still out and overdue
                            if now > detail.return_date:
                                days_overdue = (now.date() - detail.return_date.date()).days
                                # Áp dụng công thức mới
                                base_fine = days_overdue * LATE_FEE_PER_DAY
                                if days_overdue > 30 and book_price:
                                    penalty_amount = base_fine + book_price
                                else:
                                    penalty_amount = base_fine
                    
                    total_penalty_amount += penalty_amount
                    
                    # Books that are late but have been returned are considered paid
                    if detail.real_return_date:
                        # Returned = Paid
                        pass
                    else:
                        # Still out = Unpaid
                        if penalty.status == PenaltyStatusEnum.pending:
                            unpaid_penalties += 1
                            unpaid_penalty_amount += penalty_amount
            
            # IMPORTANT: Calculate penalties for overdue books WITHOUT penalty records yet
            # These are books that are late but reader hasn't returned them yet
            overdue_without_penalty = db.session.query(BorrowSlipDetail).filter(
                BorrowSlipDetail.status.in_([
                    BorrowStatusEnum.active,
                    BorrowStatusEnum.overdue,
                    BorrowStatusEnum.pending_return
                ]),
                BorrowSlipDetail.real_return_date.is_(None),  # Not returned yet
                BorrowSlipDetail.return_date < now,  # Past due date
                ~BorrowSlipDetail.id.in_(processed_detail_ids)  # No penalty record yet
            ).all()
            
            for detail in overdue_without_penalty:
                days_overdue = (now.date() - detail.return_date.date()).days
                
                # Get book price
                from app.models.model_book import Book
                book = db.session.query(Book).filter(Book.book_id == detail.book_id).first()
                book_price = None
                if book and book.book_title and book.book_title.price:
                    book_price = float(book.book_title.price)
                
                # Áp dụng công thức mới
                base_fine = days_overdue * LATE_FEE_PER_DAY
                if days_overdue > 30 and book_price:
                    penalty_amount = base_fine + book_price
                else:
                    penalty_amount = base_fine
                
                # These are implicit unpaid penalties
                unpaid_penalty_amount += penalty_amount
                unpaid_penalties += 1
                # Note: Not adding to total_penalty_amount because no official record exists yet
            
            # Recent borrowing trends (last 30 days)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            recent_borrows = db.session.query(BorrowSlip).filter(
                BorrowSlip.borrow_date >= thirty_days_ago
            ).count()
            
            # Calculate average borrows per day
            avg_borrows_per_day = recent_borrows / 30 if recent_borrows > 0 else 0
            
            return {
                "cards": {
                    "total_issued": total_cards,
                    "active": active_cards,
                    "suspended": suspended_cards,
                    "blocked": blocked_cards
                },
                "users": {
                    "total_readers": total_readers,
                    "total_librarians": total_librarians
                },
                "borrowing": {
                    "total_borrows": total_borrows,
                    "active_borrows": active_borrows,
                    "overdue_borrows": overdue_borrows,
                    "returned_borrows": returned_borrows,
                    "return_rate": round((returned_borrows / total_borrows * 100), 2) if total_borrows > 0 else 0
                },
                "infractions": {
                    "total_infractions": int(total_infractions),
                    "readers_with_infractions": readers_with_infractions,
                    "average_per_reader": round(total_infractions / total_readers, 2) if total_readers > 0 else 0
                },
                "penalties": {
                    "total_penalties": total_penalties,
                    "unpaid_penalties": unpaid_penalties,
                    "total_amount": float(total_penalty_amount),
                    "unpaid_amount": float(unpaid_penalty_amount)
                },
                "trends": {
                    "recent_borrows_30_days": recent_borrows,
                    "avg_borrows_per_day": round(avg_borrows_per_day, 2)
                }
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get system statistics: {str(e)}"
            )
    
    def create_librarian(self, username: str, password: str, full_name: str, 
                        email: str, phone_number: str = None, 
                        years_of_experience: int = 0) -> Dict:
        """
        Create a new librarian account
        
        Args:
            username: Unique username
            password: Password (will be hashed)
            full_name: Full name
            email: Email address
            phone_number: Optional phone number
            years_of_experience: Years of experience
            
        Returns:
            Dictionary with created librarian info
        """
        try:
            # Check if username already exists
            existing_user = db.session.query(User).filter(
                User.username == username
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Username '{username}' already exists"
                )
            
            # Check if email already exists
            existing_email = db.session.query(User).filter(
                User.email == email
            ).first()
            
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{email}' already exists"
                )
            
            # Generate IDs
            user_id = str(uuid.uuid4())
            lib_id = f"LIB{str(uuid.uuid4())[:8].upper()}"
            
            # Create user
            new_user = User(
                user_id=user_id,
                username=username,
                password=get_password_hash(password),
                full_name=full_name,
                email=email,
                phone_number=phone_number,
                role=UserRoleEnum.librarian
            )
            
            # Create librarian profile
            new_librarian = Librarian(
                lib_id=lib_id,
                user_id=user_id,
                years_of_experience=years_of_experience
            )
            
            db.session.add(new_user)
            db.session.add(new_librarian)
            db.session.commit()
            
            return {
                "success": True,
                "message": f"Librarian account created successfully",
                "librarian": {
                    "lib_id": lib_id,
                    "user_id": user_id,
                    "username": username,
                    "full_name": full_name,
                    "email": email,
                    "phone_number": phone_number,
                    "years_of_experience": years_of_experience
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            db.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create librarian: {str(e)}"
            )
    
    def delete_librarian(self, lib_id: str) -> Dict:
        """
        Delete a librarian account
        
        Args:
            lib_id: Librarian ID to delete
            
        Returns:
            Dictionary with deletion confirmation
        """
        try:
            # Find librarian
            librarian = db.session.query(Librarian).filter(
                Librarian.lib_id == lib_id
            ).first()
            
            if not librarian:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Librarian with ID '{lib_id}' not found"
                )
            
            # Get user info before deletion
            user = db.session.query(User).filter(
                User.user_id == librarian.user_id
            ).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User profile for librarian not found"
                )
            
            username = user.username
            full_name = user.full_name
            
            # Check if librarian has active borrow slips or acquisition slips
            active_borrows = db.session.query(BorrowSlip).filter(
                BorrowSlip.librarian_id == lib_id
            ).count()
            
            if active_borrows > 0:
                # We'll allow deletion but note that records exist
                pass
            
            # Delete librarian and user
            db.session.delete(librarian)
            db.session.delete(user)
            db.session.commit()
            
            return {
                "success": True,
                "message": f"Librarian '{username}' ({full_name}) has been deleted",
                "deleted_librarian": {
                    "lib_id": lib_id,
                    "username": username,
                    "full_name": full_name,
                    "had_records": active_borrows > 0
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            db.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete librarian: {str(e)}"
            )
    
    def list_librarians(self) -> List[Dict]:
        """
        Get list of all librarians in the system
        
        Returns:
            List of librarian information
        """
        try:
            librarians = db.session.query(Librarian).join(User).all()
            
            librarian_list = []
            for lib in librarians:
                # Count active borrow slips for this librarian
                active_slips = db.session.query(BorrowSlip).filter(
                    BorrowSlip.librarian_id == lib.lib_id
                ).count()
                
                librarian_list.append({
                    "lib_id": lib.lib_id,
                    "user_id": lib.user_id,
                    "username": lib.user.username,
                    "full_name": lib.user.full_name,
                    "email": lib.user.email,
                    "phone_number": lib.user.phone_number,
                    "years_of_experience": lib.years_of_experience,
                    "total_borrow_slips": active_slips
                })
            
            return librarian_list
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list librarians: {str(e)}"
            )
