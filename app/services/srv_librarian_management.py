# app/services/srv_librarian_management.py
from fastapi import HTTPException, status
from fastapi_sqlalchemy import db
from sqlalchemy.orm import joinedload
from typing import List, Dict, Optional
from datetime import datetime

from app.models.model_user import User
from app.models.model_reader import Reader
from app.models.model_reading_card import ReadingCard, CardStatusEnum
from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum
from app.models.model_book import Book
from app.models.model_book_title import BookTitle
from app.models.model_penalty import PenaltySlip


class LibrarianManagementService:
    """Service for librarians to manage users"""

    def get_user_info(self, user_id: str) -> Dict:
        """
        Get detailed user information including reader info and card status
        
        Args:
            user_id: The user ID to look up
            
        Returns:
            Dictionary with user details, reader info, and card info
        """
        try:
            # Query user with related reader and reading card info
            user = (
                db.session.query(User)
                .options(
                    joinedload(User.reader).joinedload(Reader.reading_card)
                )
                .filter(User.user_id == user_id)
                .first()
            )

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {user_id} not found"
                )

            # Build user info response
            user_info = {
                "user_id": user.user_id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "phone_number": user.phone_number,
                "age": user.age,
                "dob": str(user.dob) if user.dob else None,
                "address": user.address,
                "gender": user.gender.value if user.gender else None,
                "role": user.role.value,
            }

            # Add reader-specific info if user is a reader
            if user.reader:
                reader = user.reader
                
                # Count currently borrowed books (active or overdue status)
                currently_borrowed = (
                    db.session.query(BorrowSlipDetail)
                    .join(BorrowSlip)
                    .filter(
                        BorrowSlip.reader_id == reader.reader_id,
                        BorrowSlipDetail.status.in_([
                            BorrowStatusEnum.active,
                            BorrowStatusEnum.overdue,
                            BorrowStatusEnum.pending_return
                        ])
                    )
                    .count()
                )
                
                # Count total borrowed books (all time) from BorrowSlipDetail
                total_borrowed = (
                    db.session.query(BorrowSlipDetail)
                    .join(BorrowSlip)
                    .filter(BorrowSlip.reader_id == reader.reader_id)
                    .count()
                )
                
                reader_info = {
                    "reader_id": reader.reader_id,
                    "total_borrowed": total_borrowed,
                    "currently_borrowed": currently_borrowed,
                    "infraction_count": reader.infraction_count,
                }

                # Add reading card info if exists
                if reader.reading_card:
                    card = reader.reading_card
                    reader_info["reading_card"] = {
                        "card_id": card.card_id,
                        "card_type": card.card_type.value,
                        "fee": card.fee,
                        "register_date": str(card.register_date),
                        "register_office": card.register_office,
                        "status": card.status.value,
                    }

                user_info["reader_info"] = reader_info

            return user_info

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user info: {str(e)}"
            )

    def get_user_current_borrows(self, user_id: str) -> List[Dict]:
        """
        Get all currently borrowed books for a user
        
        Args:
            user_id: The user ID
            
        Returns:
            List of currently borrowed books with details
        """
        try:
            # First verify the user exists and is a reader
            user = db.session.query(User).filter(User.user_id == user_id).first()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {user_id} not found"
                )

            if not user.reader:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User {user_id} is not a reader"
                )

            # Query all active borrow details for this reader
            borrow_details = (
                db.session.query(BorrowSlipDetail)
                .join(BorrowSlip)
                .join(Book)
                .join(BookTitle)
                .options(
                    joinedload(BorrowSlipDetail.book).joinedload(Book.book_title),
                    joinedload(BorrowSlipDetail.borrow_slip),
                    joinedload(BorrowSlipDetail.penalty)
                )
                .filter(
                    BorrowSlip.reader_id == user.reader.reader_id,
                    BorrowSlipDetail.status.in_([
                        BorrowStatusEnum.active,
                        BorrowStatusEnum.overdue,
                        BorrowStatusEnum.pending_return
                    ])
                )
                .all()
            )

            # Build response
            borrowed_books = []
            for detail in borrow_details:
                book = detail.book
                book_title_obj = book.book_title

                # Check if overdue
                is_overdue = False
                days_overdue = 0
                if detail.return_date and not detail.real_return_date:
                    days_overdue = (datetime.now() - detail.return_date).days
                    is_overdue = days_overdue > 0

                book_info = {
                    "borrow_detail_id": detail.id,
                    "book_id": book.book_id,
                    "book_title_id": book_title_obj.book_title_id,
                    "title": book_title_obj.name,
                    "author": book_title_obj.author,
                    "category": book_title_obj.category,
                    "publisher": book_title_obj.publisher.name if book_title_obj.publisher else None,
                    "borrow_slip_id": detail.borrow_slip_id,
                    "borrow_date": detail.borrow_slip.borrow_date.strftime("%Y-%m-%d %H:%M:%S"),
                    "due_date": detail.return_date.strftime("%Y-%m-%d %H:%M:%S") if detail.return_date else None,
                    "status": detail.status.value,
                    "is_overdue": is_overdue,
                    "days_overdue": days_overdue if is_overdue else 0,
                }

                # Add penalty info if exists
                if detail.penalty:
                    penalty = detail.penalty
                    book_info["penalty"] = {
                        "penalty_id": penalty.penalty_id,
                        "penalty_type": penalty.penalty_type.value,
                        "description": penalty.description,
                        "status": penalty.status.value,
                    }

                borrowed_books.append(book_info)

            return borrowed_books

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user's borrowed books: {str(e)}"
            )

    def remove_ban(self, user_id: str, reason: Optional[str] = None) -> Dict:
        """
        Remove ban/suspension from a user by setting their card status to Active
        
        Args:
            user_id: The user ID
            reason: Optional reason for removing the ban
            
        Returns:
            Success message with updated card status
        """
        try:
            # Get user and verify they're a reader
            user = (
                db.session.query(User)
                .options(joinedload(User.reader).joinedload(Reader.reading_card))
                .filter(User.user_id == user_id)
                .first()
            )

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {user_id} not found"
                )

            if not user.reader:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User {user_id} is not a reader and doesn't have a reading card"
                )

            reader = user.reader
            if not reader.reading_card:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Reader {reader.reader_id} doesn't have a reading card"
                )

            card = reader.reading_card
            old_status = card.status.value

            # Check if card is actually banned/suspended
            if card.status not in [CardStatusEnum.suspended, CardStatusEnum.blocked]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Card is not banned or suspended. Current status: {old_status}"
                )

            # Remove ban by setting status to Active
            card.status = CardStatusEnum.active
            db.session.commit()

            message = f"Successfully removed ban for user {user.username}"
            if reason:
                message += f". Reason: {reason}"

            return {
                "success": True,
                "message": message,
                "user_id": user_id,
                "username": user.username,
                "reader_id": reader.reader_id,
                "card_id": card.card_id,
                "old_status": old_status,
                "new_status": card.status.value,
            }

        except HTTPException:
            raise
        except Exception as e:
            db.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to remove ban: {str(e)}"
            )

    def list_all_readers(self, 
                        status_filter: Optional[str] = None,
                        limit: int = 100,
                        offset: int = 0) -> Dict:
        """
        Get list of all readers with their card status
        
        Args:
            status_filter: Optional filter by card status (Active, Suspended, Blocked, Expired)
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of readers with their info and card status
        """
        try:
            query = (
                db.session.query(User)
                .join(Reader)
                .join(ReadingCard)
                .options(
                    joinedload(User.reader).joinedload(Reader.reading_card)
                )
            )

            # Apply status filter if provided
            if status_filter:
                try:
                    status_enum = CardStatusEnum[status_filter.lower()]
                    query = query.filter(ReadingCard.status == status_enum)
                except KeyError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid status filter. Must be one of: {', '.join([s.value for s in CardStatusEnum])}"
                    )

            # Get total count
            total = query.count()

            # Apply pagination
            users = query.limit(limit).offset(offset).all()

            readers_list = []
            for user in users:
                reader = user.reader
                card = reader.reading_card

                # Count currently borrowed books (active or overdue status)
                currently_borrowed = (
                    db.session.query(BorrowSlipDetail)
                    .join(BorrowSlip)
                    .filter(
                        BorrowSlip.reader_id == reader.reader_id,
                        BorrowSlipDetail.status.in_([
                            BorrowStatusEnum.active,
                            BorrowStatusEnum.overdue,
                            BorrowStatusEnum.pending_return
                        ])
                    )
                    .count()
                )

                # Count total borrowed books (all time) from BorrowSlipDetail
                total_borrowed = (
                    db.session.query(BorrowSlipDetail)
                    .join(BorrowSlip)
                    .filter(BorrowSlip.reader_id == reader.reader_id)
                    .count()
                )

                reader_info = {
                    "user_id": user.user_id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "reader_id": reader.reader_id,
                    "total_borrowed": total_borrowed,
                    "currently_borrowed": currently_borrowed,
                    "infraction_count": reader.infraction_count,
                    "card_id": card.card_id,
                    "card_type": card.card_type.value,
                    "card_status": card.status.value,
                    "register_date": str(card.register_date),
                }

                readers_list.append(reader_info)

            return {
                "total": total,
                "limit": limit,
                "offset": offset,
                "readers": readers_list
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to list readers: {str(e)}"
            )

    def get_user_borrow_history(self, 
                                user_id: str,
                                status: Optional[str] = None,
                                page: int = 1,
                                page_size: int = 10) -> Dict:
        """
        Get borrow history for a specific user
        
        Args:
            user_id: The user ID
            status: Optional filter by status
            page: Page number
            page_size: Number of items per page
            
        Returns:
            Paginated borrow history with book details
        """
        try:
            # Verify the user exists and is a reader
            user = db.session.query(User).filter(User.user_id == user_id).first()

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {user_id} not found"
                )

            if not user.reader:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User {user_id} is not a reader and has no borrow history"
                )

            # Use the HistoryService to get borrow history
            from app.services.srv_history import HistoryService
            history_service = HistoryService()
            
            history_result = history_service.get_borrow_history(
                reader_id=user.reader.reader_id,
                status=status,
                page=page,
                page_size=page_size
            )

            # Add user information to the response
            history_result["user_info"] = {
                "user_id": user.user_id,
                "username": user.username,
                "full_name": user.full_name,
                "reader_id": user.reader.reader_id
            }

            return history_result

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user borrow history: {str(e)}"
            )
