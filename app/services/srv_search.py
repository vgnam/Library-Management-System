from fastapi_sqlalchemy import db
from typing import Optional
from rapidfuzz import fuzz

from app.models.model_book_title import BookTitle
from app.models.model_book import Book


class BookSearchService:
    """Service for handling book search operations"""

    @staticmethod
    def search_books(
            keyword: Optional[str] = None,     # only one fuzzy input
            category: Optional[str] = None,
            publisher: Optional[str] = None,   # exact filter
            page: int = 1,
            page_size: int = 10
    ):
        """
        Fuzzy search for books using a single `keyword`.
        Keyword is matched against: title, author, publisher.name
        """

        query = db.session.query(BookTitle)

        # Exact publisher filter (DB optimized)
        if publisher:
            query = query.filter(BookTitle.publisher.has(name=publisher))

        if category:
            query = query.filter(BookTitle.category.has(name=category))

        candidates = query.all()

        # =============================
        # 1. Fuzzy search (single keyword)
        # =============================
        if keyword:
            kw = keyword.lower()

            def fuzzy_match(book: BookTitle) -> int:
                title_score = fuzz.partial_ratio(kw, (book.name or "").lower())
                author_score = fuzz.partial_ratio(kw, (book.author or "").lower())
                publisher_score = fuzz.partial_ratio(
                    kw, (book.publisher.name if book.publisher else "").lower()
                )

                category_score = fuzz.partial_ratio(
                    kw, (book.category or "").lower()
                )

                # choose max score among the three
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
        # 2. Return response
        # =============================
        books_list = []
        for b in books:
            # Count total books for this book title
            total_books = db.session.query(Book).filter(
                Book.book_title_id == b.book_title_id
            ).count()
            
            # Count borrowed books (being_borrowed = True)
            borrowed_books = db.session.query(Book).filter(
                Book.book_title_id == b.book_title_id,
                Book.being_borrowed == True
            ).count()
            
            # Available books = total - borrowed
            available_books = total_books - borrowed_books
            
            books_list.append({
                "book_title_id": b.book_title_id,
                "name": b.name,
                "author": b.author,
                "publisher": b.publisher.name if b.publisher else None,
                "publisher_id": b.publisher_id,
                "category": b.category,
                "isbn": b.isbn,
                "price": b.price if b.price else 0,
                "total_books": total_books,
                "borrowed_books": borrowed_books,
                "available_books": available_books
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
        categories = db.session.query(BookTitle.category).distinct().all()
        # Filter out None and empty strings
        category_list = [c[0] for c in categories if c[0] and c[0].strip()]
        category_list.sort()
        return {
            "categories": category_list,
            "total": len(category_list)
        }