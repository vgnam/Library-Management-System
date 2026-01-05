"""
Dependencies for automatic infraction checking and card blocking
"""
from datetime import datetime
from fastapi import Depends
from fastapi_sqlalchemy import db
import pytz

from app.models.model_reader import Reader
from app.models.model_reading_card import ReadingCard, CardStatusEnum
from app.models.model_borrow import BorrowSlip, BorrowSlipDetail, BorrowStatusEnum
from app.models.model_user import User, UserRoleEnum
from app.core.security import decode_access_token

tz_vn = pytz.timezone("Asia/Ho_Chi_Minh")


def log_user_access(user_id: str, action: str, resource: str, details: dict = None) -> bool:
    """
    Log user access/view events for audit trail.
    
    Args:
        user_id: User ID accessing the resource
        action: Action type (e.g., 'view', 'edit', 'search', 'list', 'create', 'delete')
        resource: Resource type (e.g., 'reader_profile', 'borrow_history', 'book_search')
        details: Optional additional details (e.g., {'reader_id': 'r123', 'book_title': 'xyz'})
    
    Returns:
        True if logged successfully, False otherwise
    """
    try:
        user = db.session.query(User).filter(User.user_id == user_id).first()
        if not user:
            print(f"⚠️ [ACCESS LOG] User not found: {user_id}")
            return False
        
        timestamp = datetime.now(tz=tz_vn)
        role = user.role.value if user.role else "unknown"
        
        log_message = f"📍 [{role.upper()}] {action.upper()} - {resource} | User: {user.username} ({user_id})"
        if details:
            log_message += f" | Details: {details}"
        log_message += f" | Time: {timestamp.isoformat()}"
        
        print(log_message)
        return True
        
    except Exception as e:
        print(f"❌ Error logging user access: {e}")
        return False


def log_reader_access(token: str, action: str, resource: str, details: dict = None) -> bool:
    """
    Log reader access/view events. Extract user_id from token.
    
    Args:
        token: JWT token
        action: Action type (e.g., 'view', 'search', 'borrow')
        resource: Resource type (e.g., 'profile', 'book_search', 'borrow_history')
        details: Optional additional details
    
    Returns:
        True if logged successfully, False otherwise
    """
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
        
        if not user_id:
            print("⚠️ [ACCESS LOG] No user_id in token")
            return False
        
        return log_user_access(user_id, action, resource, details)
        
    except Exception as e:
        print(f"❌ Error in log_reader_access: {e}")
        return False


def log_librarian_access(token: str, action: str, resource: str, details: dict = None) -> bool:
    """
    Log librarian access/view events. Extract user_id from token.
    
    Args:
        token: JWT token
        action: Action type (e.g., 'view', 'manage', 'search', 'approve')
        resource: Resource type (e.g., 'user_profile', 'borrow_requests', 'return_books')
        details: Optional additional details
    
    Returns:
        True if logged successfully, False otherwise
    """
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
        
        if not user_id:
            print("⚠️ [ACCESS LOG] No user_id in token")
            return False
        
        return log_user_access(user_id, action, resource, details)
        
    except Exception as e:
        print(f"❌ Error in log_librarian_access: {e}")
        return False


def log_manager_access(token: str, action: str, resource: str, details: dict = None) -> bool:
    """
    Log manager access/view events. Extract user_id from token.
    
    Args:
        token: JWT token
        action: Action type (e.g., 'view', 'manage', 'analyze')
        resource: Resource type (e.g., 'dashboard', 'statistics', 'user_list')
        details: Optional additional details
    
    Returns:
        True if logged successfully, False otherwise
    """
    try:
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
        
        if not user_id:
            print("⚠️ [ACCESS LOG] No user_id in token")
            return False
        
        return log_user_access(user_id, action, resource, details)
        
    except Exception as e:
        print(f"❌ Error in log_manager_access: {e}")
        return False


def _process_reader_infractions(reader_id: str) -> dict:
    """
    Core logic to check and update infractions for a single reader.
    This is the ONLY place where infraction logic is implemented.
    
    Rules:
    1. Any overdue books → Card status = SUSPENDED
    2. Any book > 5 days overdue → +1 INFRACTION
    3. 3 infractions OR book > 30 days overdue → Card status = BLOCKED (permanent)
    4. No overdue books and card was suspended → Restore to ACTIVE
    
    Args:
        reader_id: Reader ID to process
        
    Returns:
        dict with changes made or None
    """
    try:
        # Get reading card
        reading_card = db.session.query(ReadingCard).filter(
            ReadingCard.reader_id == reader_id
        ).first()

        if not reading_card:
            return None

        # IMPORTANT: If card is already BLOCKED, do NOT change status
        # Blocked is permanent and should not be changed by this function
        if reading_card.status == CardStatusEnum.blocked:
            print(f"🔴 Reader {reader_id} is already BLOCKED - no status change allowed")
            return {
                "infractions_added": 0,
                "total_infractions": reading_card.infraction_count,
                "card_blocked": True,
                "block_reason": "Already blocked",
                "card_status": reading_card.status.value
            }

        # Check ALL borrows that are not returned/lost (for 30 days block check)
        all_unreturned_borrows = db.session.query(BorrowSlipDetail).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlip.reader_id == reader_id,
            BorrowSlipDetail.status.notin_([BorrowStatusEnum.returned, BorrowStatusEnum.lost, BorrowStatusEnum.rejected])
        ).all()

        now = datetime.now(tz=tz_vn)
        infractions_added = 0
        card_blocked = False
        card_suspended = False
        block_reason = None
        changes_made = False
        has_overdue_books = False

        # First pass: Check for 30+ days overdue (regardless of status) → BLOCK
        for detail in all_unreturned_borrows:
            due_date = detail.return_date

            if due_date and due_date.tzinfo is None:
                due_date = tz_vn.localize(due_date)

            if due_date and now > due_date:
                days_overdue = (now.date() - due_date.date()).days
                
                # Rule 3: 30+ days late = immediate permanent block (ANY status)
                if days_overdue >= 30:
                    if reading_card.status != CardStatusEnum.blocked:
                        reading_card.status = CardStatusEnum.blocked
                        card_blocked = True
                        block_reason = f"Book {detail.book_id} is {days_overdue} days late (≥30 days)"
                        changes_made = True
                        print(f"🔴 BLOCKED: Reader {reader_id} - {block_reason}")
                        break

        # If already blocked, commit and return
        if card_blocked:
            db.session.commit()
            return {
                "infractions_added": 0,
                "total_infractions": reading_card.infraction_count,
                "card_blocked": True,
                "block_reason": block_reason,
                "card_status": reading_card.status.value
            }

        # Second pass: Check active/overdue for infractions and suspend
        for detail in all_unreturned_borrows:
            due_date = detail.return_date

            if due_date and due_date.tzinfo is None:
                due_date = tz_vn.localize(due_date)

            if due_date and now > due_date:
                days_overdue = (now.date() - due_date.date()).days
                has_overdue_books = True

                # Rule 2: >5 days late = add infraction (only count once when status is active)
                if days_overdue > 5 and detail.status == BorrowStatusEnum.active:
                    detail.status = BorrowStatusEnum.overdue
                    reading_card.infraction_count += 1
                    infractions_added += 1
                    changes_made = True

                    # Rule 3: 3 infractions = permanent block
                    if reading_card.infraction_count >= 3:
                        if reading_card.status != CardStatusEnum.blocked:
                            reading_card.status = CardStatusEnum.blocked
                            card_blocked = True
                            block_reason = f"Accumulated {reading_card.infraction_count} infractions"
                            changes_made = True
                            break

        # Rule 1: If there are overdue books but not blocked → suspend
        if has_overdue_books and not card_blocked:
            if reading_card.status != CardStatusEnum.suspended:
                reading_card.status = CardStatusEnum.suspended
                card_suspended = True
                changes_made = True

        # If no overdue books and was suspended → restore to active
        elif not has_overdue_books and reading_card.status == CardStatusEnum.suspended:
            reading_card.status = CardStatusEnum.active
            changes_made = True

        if changes_made:
            db.session.commit()
            return {
                "infractions_added": infractions_added,
                "total_infractions": reading_card.infraction_count,
                "card_blocked": card_blocked,
                "block_reason": block_reason,
                "card_status": reading_card.status.value
            }

        return None

    except Exception as e:
        print(f"❌ Error in _process_reader_infractions: {e}")
        import traceback
        traceback.print_exc()
        return None


def check_all_readers_infractions() -> dict:
    """
    Check and update infractions for ALL readers.
    Calls the core logic function for each reader with overdue books.
    """
    try:
        print("🔴 [CHECK] check_all_readers_infractions called")
        
        # Get ALL borrow details that are not returned/lost (to catch 30 day cases)
        all_unreturned = db.session.query(BorrowSlipDetail).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlipDetail.status.notin_([BorrowStatusEnum.returned, BorrowStatusEnum.lost, BorrowStatusEnum.rejected])
        ).all()
        
        # Collect unique reader IDs
        readers_to_check = set()
        for detail in all_unreturned:
            slip = db.session.query(BorrowSlip).filter(
                BorrowSlip.bs_id == detail.borrow_slip_id
            ).first()
            if slip:
                readers_to_check.add(slip.reader_id)
        
        print(f"🔴 [CHECK] Found {len(readers_to_check)} readers with unreturned borrows to check")
        
        # Process each reader using core logic
        total_infractions_added = 0
        total_cards_blocked = 0
        total_cards_suspended = 0
        
        for reader_id in readers_to_check:
            result = _process_reader_infractions(reader_id)
            if result:
                total_infractions_added += result.get("infractions_added", 0)
                if result.get("card_blocked"):
                    total_cards_blocked += 1
                    print(f"🔴 [CHECK] Reader {reader_id} BLOCKED: {result.get('block_reason')}")
                elif result.get("card_status") == "Suspended":
                    total_cards_suspended += 1
                    print(f"🟡 [CHECK] Reader {reader_id} SUSPENDED")
        
        if total_infractions_added > 0 or total_cards_blocked > 0 or total_cards_suspended > 0:
            result = {
                "infractions_added": total_infractions_added,
                "cards_blocked": total_cards_blocked,
                "cards_suspended": total_cards_suspended,
                "readers_affected": len(readers_to_check)
            }
            print(f"🔴 [CHECK] Updated: {result}")
            return result
        
        print("🔴 [CHECK] No infractions to update")
        return None
        
    except Exception as e:
        print(f"❌ Error in check_all_readers_infractions: {e}")
        import traceback
        traceback.print_exc()
        return None

