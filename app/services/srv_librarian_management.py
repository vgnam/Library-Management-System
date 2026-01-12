# app/services/srv_librarian_management.py
from fastapi import HTTPException, status
from fastapi_sqlalchemy import db
from sqlalchemy import text
from typing import List, Dict, Optional


class LibrarianManagementService:
    """Service for librarians to manage users"""

    def get_user_info(self, user_id: str) -> Dict:
        """
        Get detailed user information using view (OPTIMIZED - No N+1)
        """
        try:
            # Query the view directly with raw SQL
            query = text("""
                SELECT *
                FROM vw_reader_statistics
                WHERE user_id = :user_id
            """)

            result = db.session.execute(query, {"user_id": user_id})
            row = result.fetchone()

            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID {user_id} not found"
                )

            # Convert row to dict
            user_stats = dict(row._mapping)

            # Build response from view data
            user_info = {
                "user_id": user_stats["user_id"],
                "username": user_stats["username"],
                "full_name": user_stats["full_name"],
                "email": user_stats["email"],
                "phone_number": user_stats["phone_number"],
                "dob": str(user_stats["dob"]) if user_stats["dob"] else None,
                "address": user_stats["address"],
                "gender": user_stats["gender"],
                "role": "reader",
            }

            # Reader info (all from view - no additional queries!)
            reader_info = {
                "reader_id": user_stats["reader_id"],
                "total_borrowed": user_stats["total_borrowed"] or 0,
                "currently_borrowed": user_stats["currently_borrowed"] or 0,
                "returned_books": user_stats["returned_books"] or 0,
                "overdue_books": user_stats["overdue_books"] or 0,
                "late_returns": user_stats["late_returns"] or 0,
                "infraction_count": user_stats["infraction_count"] or 0,
                "total_penalties": user_stats["total_penalties"] or 0,
                "unpaid_penalties": user_stats["unpaid_penalties"] or 0,
            }

            # Reading card info (all from view!)
            if user_stats["card_id"]:
                reader_info["reading_card"] = {
                    "card_id": user_stats["card_id"],
                    "card_type": user_stats["card_type"],
                    "fee": float(user_stats["fee"]) if user_stats["fee"] else 0,
                    "register_date": str(user_stats["register_date"]),
                    "register_office": user_stats["register_office"],
                    "status": user_stats["card_status"],
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

    def list_all_readers(self,
                         status_filter: Optional[str] = None,
                         search: Optional[str] = None,
                         limit: int = 100,
                         offset: int = 0) -> Dict:
        """
        Get list of all readers using view (OPTIMIZED - Single query!)
        """
        try:
            # Build WHERE clause dynamically
            where_clauses = []
            params = {
                "limit": limit,
                "offset": offset
            }

            if status_filter:
                where_clauses.append("card_status = :status")
                params["status"] = status_filter.capitalize()

            if search:
                where_clauses.append("""
                    (username LIKE :search 
                    OR full_name LIKE :search 
                    OR email LIKE :search)
                """)
                params["search"] = f"%{search}%"

            where_sql = ""
            if where_clauses:
                where_sql = "WHERE " + " AND ".join(where_clauses)

            # Count query
            count_query = text(f"""
                SELECT COUNT(*) as total
                FROM vw_reader_statistics
                {where_sql}
            """)

            count_result = db.session.execute(count_query, params)
            total = count_result.fetchone()[0]

            # Data query
            data_query = text(f"""
                SELECT *
                FROM vw_reader_statistics
                {where_sql}
                ORDER BY register_date DESC
                OFFSET :offset ROWS
                FETCH NEXT :limit ROWS ONLY
            """)

            result = db.session.execute(data_query, params)
            rows = result.fetchall()

            # Build response - all data already in view!
            readers_list = []
            for row in rows:
                reader = dict(row._mapping)
                reader_info = {
                    "user_id": reader["user_id"],
                    "username": reader["username"],
                    "full_name": reader["full_name"],
                    "email": reader["email"],
                    "phone_number": reader["phone_number"],
                    "reader_id": reader["reader_id"],

                    # Statistics (pre-calculated in view!)
                    "total_borrowed": reader["total_borrowed"] or 0,
                    "currently_borrowed": reader["currently_borrowed"] or 0,
                    "returned_books": reader["returned_books"] or 0,
                    "overdue_books": reader["overdue_books"] or 0,
                    "late_returns": reader["late_returns"] or 0,
                    "infraction_count": reader["infraction_count"] or 0,
                    "total_penalties": reader["total_penalties"] or 0,
                    "unpaid_penalties": reader["unpaid_penalties"] or 0,

                    # Card info
                    "card_id": reader["card_id"],
                    "card_type": reader["card_type"],
                    "card_status": reader["card_status"],
                    "register_date": str(reader["register_date"]) if reader["register_date"] else None,
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

    def get_reader_statistics_summary(self) -> Dict:
        """
        Get summary statistics for all readers using view
        """
        try:
            query = text("""
                SELECT 
                    COUNT(*) as total_readers,
                    COALESCE(SUM(currently_borrowed), 0) as total_active_borrows,
                    COALESCE(SUM(overdue_books), 0) as total_overdue,
                    COALESCE(SUM(CASE WHEN card_status = 'Active' THEN 1 ELSE 0 END), 0) as active_cards,
                    COALESCE(SUM(CASE WHEN card_status = 'Blocked' THEN 1 ELSE 0 END), 0) as blocked_cards,
                    COALESCE(SUM(unpaid_penalties), 0) as total_unpaid_penalties
                FROM vw_reader_statistics
            """)

            result = db.session.execute(query)
            row = result.fetchone()
            stats = dict(row._mapping)

            return {
                "total_readers": stats["total_readers"] or 0,
                "total_active_borrows": stats["total_active_borrows"] or 0,
                "total_overdue": stats["total_overdue"] or 0,
                "active_cards": stats["active_cards"] or 0,
                "blocked_cards": stats["blocked_cards"] or 0,
                "total_unpaid_penalties": stats["total_unpaid_penalties"] or 0
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get statistics summary: {str(e)}"
            )

    def get_top_readers(self, limit: int = 10) -> List[Dict]:
        """
        Get top readers by total books borrowed
        """
        try:
            query = text("""
                SELECT 
                    reader_id,
                    username,
                    full_name,
                    total_borrowed,
                    currently_borrowed,
                    card_type,
                    card_status
                FROM vw_reader_statistics
                WHERE total_borrowed > 0
                ORDER BY total_borrowed DESC
                OFFSET 0 ROWS
                FETCH NEXT :limit ROWS ONLY
            """)

            result = db.session.execute(query, {"limit": limit})
            rows = result.fetchall()

            top_readers = []
            for row in rows:
                reader = dict(row._mapping)
                top_readers.append({
                    "reader_id": reader["reader_id"],
                    "username": reader["username"],
                    "full_name": reader["full_name"],
                    "total_borrowed": reader["total_borrowed"] or 0,
                    "currently_borrowed": reader["currently_borrowed"] or 0,
                    "card_type": reader["card_type"],
                    "card_status": reader["card_status"]
                })

            return top_readers

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get top readers: {str(e)}"
            )

    def get_readers_with_issues(self) -> Dict:
        """
        Get readers who have overdue books or unpaid penalties
        """
        try:
            query = text("""
                SELECT 
                    reader_id,
                    username,
                    full_name,
                    email,
                    phone_number,
                    overdue_books,
                    unpaid_penalties,
                    infraction_count,
                    card_status
                FROM vw_reader_statistics
                WHERE overdue_books > 0 OR unpaid_penalties > 0
                ORDER BY overdue_books DESC, unpaid_penalties DESC
            """)

            result = db.session.execute(query)
            rows = result.fetchall()

            readers_with_issues = []
            for row in rows:
                reader = dict(row._mapping)
                readers_with_issues.append({
                    "reader_id": reader["reader_id"],
                    "username": reader["username"],
                    "full_name": reader["full_name"],
                    "email": reader["email"],
                    "phone_number": reader["phone_number"],
                    "overdue_books": reader["overdue_books"] or 0,
                    "unpaid_penalties": reader["unpaid_penalties"] or 0,
                    "infraction_count": reader["infraction_count"] or 0,
                    "card_status": reader["card_status"]
                })

            return {
                "total": len(readers_with_issues),
                "readers": readers_with_issues
            }

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get readers with issues: {str(e)}"
            )