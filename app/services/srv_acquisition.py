"""
Service for handling book acquisition (nhập sách)
"""
from datetime import datetime
from typing import List, Optional
from fastapi_sqlalchemy import db
from fastapi import HTTPException
import uuid

from app.models.model_acquisition import AcquisitionSlip, AcquisitionSlipDetail
from app.models.model_librarian import Librarian
from app.models.model_book_title import BookTitle
from app.models.model_book import Book
from app.models.model_publisher import Publisher


class AcquisitionService:
    """Service for handling book acquisition operations"""

    @staticmethod
    def create_acquisition_slip(
        librarian_id: str,
        books: List[dict]  # [{"book_title_id": "...", "quantity": 5, "price": 50000}]
    ) -> dict:
        """
        Create a new acquisition slip to add books to library
        
        Args:
            librarian_id: ID of the librarian creating the slip
            books: List of books to acquire with quantity and price
            
        Returns:
            dict with acquisition slip details
        """
        # Validate librarian exists
        librarian = db.session.query(Librarian).filter(
            Librarian.lib_id == librarian_id
        ).first()
        
        if not librarian:
            raise HTTPException(status_code=404, detail="Librarian not found")
        
        # Validate all book titles exist
        for book_item in books:
            book_title = db.session.query(BookTitle).filter(
                BookTitle.book_title_id == book_item["book_title_id"]
            ).first()
            
            if not book_title:
                raise HTTPException(
                    status_code=404,
                    detail=f"Book title {book_item['book_title_id']} not found"
                )
        
        # Create acquisition slip
        acq_id = f"ACQ{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:4]}"
        acquisition_slip = AcquisitionSlip(
            acq_id=acq_id,
            librarian_id=librarian_id,
            acc_date=datetime.utcnow()
        )
        
        db.session.add(acquisition_slip)
        
        # Create acquisition slip details and add books to inventory
        total_items = 0
        total_amount = 0
        details_list = []
        
        for book_item in books:
            book_title_id = book_item["book_title_id"]
            quantity = book_item["quantity"]
            price = book_item["price"]
            
            # Create acquisition detail
            detail_id = f"ACQD{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:4]}"
            detail = AcquisitionSlipDetail(
                id=detail_id,
                acquisition_slip_id=acq_id,
                book_title_id=book_title_id,
                quantity=quantity,
                price=price
            )
            db.session.add(detail)
            
            # Get book title info
            book_title = db.session.query(BookTitle).filter(
                BookTitle.book_title_id == book_title_id
            ).first()
            
            # Create individual book records for each copy
            for i in range(quantity):
                book_id = f"BOOK{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:6]}"
                new_book = Book(
                    book_id=book_id,
                    book_title_id=book_title_id,
                    condition="good",
                    being_borrowed=False
                )
                db.session.add(new_book)
            
            # Update book title inventory
            book_title.total_quantity += quantity
            book_title.available += quantity
            
            total_items += quantity
            total_amount += quantity * price
            
            details_list.append({
                "book_title_id": book_title_id,
                "book_name": book_title.name,
                "author": book_title.author,
                "quantity": quantity,
                "price": price,
                "subtotal": quantity * price
            })
        
        db.session.commit()
        
        return {
            "acq_id": acq_id,
            "librarian_id": librarian_id,
            "librarian_name": librarian.user.full_name,
            "acc_date": acquisition_slip.acc_date.isoformat(),
            "total_items": total_items,
            "total_amount": total_amount,
            "details": details_list
        }

    @staticmethod
    def get_acquisition_history(
        page: int = 1,
        page_size: int = 10,
        librarian_id: Optional[str] = None
    ) -> dict:
        """
        Get acquisition history with pagination
        
        Args:
            page: Page number
            page_size: Number of items per page
            librarian_id: Filter by librarian (optional)
            
        Returns:
            dict with acquisition slips and pagination info
        """
        query = db.session.query(AcquisitionSlip)
        
        if librarian_id:
            query = query.filter(AcquisitionSlip.librarian_id == librarian_id)
        
        query = query.order_by(AcquisitionSlip.acc_date.desc())
        
        total = query.count()
        
        # Pagination
        offset = (page - 1) * page_size
        slips = query.offset(offset).limit(page_size).all()
        
        results = []
        for slip in slips:
            # Calculate totals
            total_items = sum(detail.quantity for detail in slip.details)
            total_amount = sum(detail.quantity * detail.price for detail in slip.details)
            
            results.append({
                "acq_id": slip.acq_id,
                "librarian_id": slip.librarian_id,
                "librarian_name": slip.librarian.user.full_name,
                "acc_date": slip.acc_date.isoformat(),
                "total_items": total_items,
                "total_amount": total_amount,
                "details_count": len(slip.details)
            })
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "data": results
        }

    @staticmethod
    def get_acquisition_detail(acq_id: str) -> dict:
        """
        Get detailed information about a specific acquisition slip
        
        Args:
            acq_id: Acquisition slip ID
            
        Returns:
            dict with full acquisition slip details
        """
        slip = db.session.query(AcquisitionSlip).filter(
            AcquisitionSlip.acq_id == acq_id
        ).first()
        
        if not slip:
            raise HTTPException(status_code=404, detail="Acquisition slip not found")
        
        details_list = []
        total_items = 0
        total_amount = 0
        
        for detail in slip.details:
            book_title = db.session.query(BookTitle).filter(
                BookTitle.book_title_id == detail.book_title_id
            ).first()
            
            subtotal = detail.quantity * detail.price
            total_items += detail.quantity
            total_amount += subtotal
            
            details_list.append({
                "detail_id": detail.id,
                "book_title_id": detail.book_title_id,
                "book_name": book_title.name if book_title else "Unknown",
                "author": book_title.author if book_title else "Unknown",
                "category": book_title.category if book_title else "Unknown",
                "quantity": detail.quantity,
                "price": detail.price,
                "subtotal": subtotal
            })
        
        return {
            "acq_id": slip.acq_id,
            "librarian_id": slip.librarian_id,
            "librarian_name": slip.librarian.user.full_name,
            "acc_date": slip.acc_date.isoformat(),
            "total_items": total_items,
            "total_amount": total_amount,
            "details": details_list
        }

    @staticmethod
    def get_publishers() -> List[dict]:
        """Get all publishers for dropdown selection"""
        publishers = db.session.query(Publisher).all()
        
        return [
            {
                "pub_id": p.pub_id,
                "name": p.name,
                "address": p.address
            }
            for p in publishers
        ]

    @staticmethod
    def create_book_title(
        name: str,
        author: str,
        category: str,
        publisher_id: str
    ) -> dict:
        """
        Create a new book title if it doesn't exist
        
        Args:
            name: Book title name
            author: Author name
            category: Book category
            publisher_id: Publisher ID
            
        Returns:
            dict with book title info
        """
        # Check if book title already exists
        existing = db.session.query(BookTitle).filter(
            BookTitle.name == name,
            BookTitle.author == author
        ).first()
        
        if existing:
            return {
                "book_title_id": existing.book_title_id,
                "name": existing.name,
                "author": existing.author,
                "category": existing.category,
                "publisher_id": existing.publisher_id,
                "exists": True
            }
        
        # Validate publisher exists
        publisher = db.session.query(Publisher).filter(
            Publisher.pub_id == publisher_id
        ).first()
        
        if not publisher:
            raise HTTPException(status_code=404, detail="Publisher not found")
        
        # Create new book title
        book_title_id = f"BT{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:4]}"
        book_title = BookTitle(
            book_title_id=book_title_id,
            name=name,
            author=author,
            category=category,
            publisher_id=publisher_id,
            total_quantity=0,
            available=0
        )
        
        db.session.add(book_title)
        db.session.commit()
        
        return {
            "book_title_id": book_title.book_title_id,
            "name": book_title.name,
            "author": book_title.author,
            "category": book_title.category,
            "publisher_id": book_title.publisher_id,
            "exists": False
        }
