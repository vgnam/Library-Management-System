from fastapi_sqlalchemy import db
from typing import Optional
from rapidfuzz import fuzz
from sqlalchemy import text

from app.models.model_book_title import BookTitle


class BookSearchService:
    """Service for handling book search operations"""

    @staticmethod
    def search_books(
            keyword: Optional[str] = None,
            category: Optional[str] = None,
            publisher: Optional[str] = None,
            page: int = 1,
            page_size: int = 10
    ):
        """
        Optimized search using vw_available_books view.
        Eliminates N+1 query problem.
        """
        
        # Query the view instead of base tables
        query = db.session.execute(
            text("SELECT * FROM vw_available_books")
        )
        
        # Convert to list of dicts
        columns = query.keys()
        candidates = [dict(zip(columns, row)) for row in query.fetchall()]
        
        # Apply exact filters
        if publisher:
            candidates = [c for c in candidates if c['publisher_name'] == publisher]
        
        if category:
            candidates = [c for c in candidates if c['category'] == category]
        
        # =============================
        # 1. Fuzzy search (single keyword)
        # =============================
        if keyword:
            kw = keyword.lower()

            def fuzzy_match(book: dict) -> int:
                title_score = fuzz.partial_ratio(kw, (book['name'] or "").lower())
                author_score = fuzz.partial_ratio(kw, (book['author'] or "").lower())
                publisher_score = fuzz.partial_ratio(
                    kw, (book['publisher_name'] or "").lower()
                )
                category_score = fuzz.partial_ratio(
                    kw, (book['category'] or "").lower()
                )
                return max(title_score, author_score, publisher_score, category_score)

            scored = [(book, fuzzy_match(book)) for book in candidates]
            scored = [item for item in scored if item[1] > 30]  # threshold
            scored.sort(key=lambda x: x[1], reverse=True)

            total = len(scored)
            page_items = scored[(page - 1) * page_size: page * page_size]
            books = [item[0] for item in page_items]
        else:
            # No fuzzy → normal paginate
            total = len(candidates)
            books = candidates[(page - 1) * page_size: page * page_size]

        # =============================
        # 2. Return response (NO MORE N+1 QUERIES!)
        # =============================
        books_list = []
        for b in books:
            books_list.append({
                "book_title_id": b['book_title_id'],
                "name": b['name'],
                "author": b['author'],
                "publisher": b['publisher_name'],
                "publisher_id": b['publisher_id'],
                "category": b['category'],
                "isbn": b['isbn'],
                "price": b['price'] if b['price'] else 0,
                "total_books": b['total_books'],
                "borrowed_books": b['borrowed_books'],
                "available_books": b['available_books']
            })
        
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "books": books_list
        }

    @staticmethod
    def get_all_categories():
        """Get all unique categories from book titles"""
        result = db.session.execute(
            text("SELECT DISTINCT category FROM vw_available_books WHERE category IS NOT NULL ORDER BY category")
        )
        category_list = [row[0] for row in result.fetchall() if row[0] and row[0].strip()]
        
        return {
            "categories": category_list,
            "total": len(category_list)
        }