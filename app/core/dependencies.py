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
from app.core.security import decode_access_token

tz_vn = pytz.timezone("Asia/Ho_Chi_Minh")


def check_reader_infractions(token: str) -> dict:
    """
    Dependency to automatically check and update reader infractions.
    Called before any reader endpoint execution.
    
    Returns infraction info if any updates were made.
    """
    try:
        print("🔵 [READER] check_reader_infractions called")
        
        # Decode token to get user_id
        payload = decode_access_token(token)
        user_id = payload.get("user_id")
        
        if not user_id:
            print("🔵 [READER] No user_id in token")
            return None
            
        # Get reader
        reader = db.session.query(Reader).filter(Reader.user_id == user_id).first()
        if not reader:
            return None
        
        # Get reading card
        reading_card = db.session.query(ReadingCard).filter(
            ReadingCard.reader_id == reader.reader_id
        ).first()
        
        if not reading_card:
            return None
        
        # Check all active and overdue borrows
        active_borrows = db.session.query(BorrowSlipDetail).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlip.reader_id == reader.reader_id,
            BorrowSlipDetail.status.in_([BorrowStatusEnum.active, BorrowStatusEnum.overdue])
        ).all()
        
        now = datetime.now(tz=tz_vn)
        infractions_added = 0
        card_blocked = False
        block_reason = None
        changes_made = False
        
        for detail in active_borrows:
            due_date = detail.return_date
            if due_date and due_date.tzinfo is None:
                due_date = tz_vn.localize(due_date)
            
            if due_date and now > due_date:
                days_overdue = (now.date() - due_date.date()).days
                
                # Rule 1: >5 days late = add infraction (only if not already counted)
                if days_overdue > 5 and detail.status == BorrowStatusEnum.active:
                    # Mark as overdue to prevent counting again
                    detail.status = BorrowStatusEnum.overdue
                    reading_card.infraction_count += 1
                    infractions_added += 1
                    changes_made = True
                    
                    # Rule 3: 30+ days late = immediate permanent block (after adding infraction)
                    if days_overdue >= 30:
                        if reading_card.status != CardStatusEnum.blocked:
                            reading_card.status = CardStatusEnum.blocked
                            card_blocked = True
                            block_reason = f"Book {detail.book_id} is {days_overdue} days late (≥30 days) - {reading_card.infraction_count} infractions"
                            break  # Stop checking other books
                    # Rule 2: 3 infractions = permanent block
                    elif reading_card.infraction_count >= 3:
                        if reading_card.status != CardStatusEnum.blocked:
                            reading_card.status = CardStatusEnum.blocked
                            card_blocked = True
                            block_reason = f"Accumulated {reading_card.infraction_count} infractions"
                            break  # Stop checking other books
        
        # Commit changes if any
        if changes_made:  # ← SỬA: từ "if chasult = {"
            db.session.commit()
            
            result = {  # ← SỬA: thêm "result = "
                "infractions_added": infractions_added,
                "total_infractions": reading_card.infraction_count,
                "card_blocked": card_blocked,
                "block_reason": block_reason,
                "card_status": reading_card.status.value
            }
            print(f"🔵 [READER] Updated: {result}")
            return result
        
        print("🔵 [READER] No infractions to update")
        return None
        
    except Exception as e:
        print(f"❌ Error in check_reader_infractions: {e}")
        import traceback
        traceback.print_exc()  # ← SỬA: đóng ngoặc
        return None  # ← SỬA: xóa except duplicate


def check_all_readers_infractions() -> dict:
    """
    Dependency for librarians to check and update infractions for ALL readers.
    Scans all active/overdue borrows in the system and updates accordingly.
    
    Returns summary of infractions updated.
    """
    try:
        print("🔴 [LIBRARIAN] check_all_readers_infractions called")
        
        # Get all active and overdue borrow details
        active_borrows = db.session.query(BorrowSlipDetail).join(
            BorrowSlip, BorrowSlipDetail.borrow_slip_id == BorrowSlip.bs_id
        ).filter(
            BorrowSlipDetail.status.in_([BorrowStatusEnum.active, BorrowStatusEnum.overdue])
        ).all()
        
        print(f"🔴 Found {len(active_borrows)} active/overdue borrows to check")
        
        now = datetime.now(tz=tz_vn)
        total_infractions_added = 0
        total_cards_blocked = 0
        readers_affected = set()
        
        for detail in active_borrows:
            due_date = detail.return_date

            if due_date and due_date.tzinfo is None:
                due_date = tz_vn.localize(due_date)
            
            if due_date and now > due_date:
                days_overdue = (now.date() - due_date.date()).days
                
                # Only process if >5 days and not already marked overdue
                if days_overdue > 5 and detail.status == BorrowStatusEnum.active:
                    # Get borrow slip and reader
                    slip = db.session.query(BorrowSlip).filter(
                        BorrowSlip.bs_id == detail.borrow_slip_id
                    ).first()
                    
                    if not slip:
                        continue
                    
                    reader = db.session.query(Reader).filter(
                        Reader.reader_id == slip.reader_id
                    ).first()
                    
                    if not reader:
                        continue
                    
                    reading_card = db.session.query(ReadingCard).filter(
                        ReadingCard.reader_id == reader.reader_id
                    ).first()
                    
                    if not reading_card:
                        continue
                    
                    # Mark as overdue to prevent counting again
                    detail.status = BorrowStatusEnum.overdue
                    reading_card.infraction_count += 1
                    total_infractions_added += 1
                    readers_affected.add(reader.reader_id)
                    
                    # Check if should block
                    if days_overdue >= 30 or reading_card.infraction_count >= 3:
                        if reading_card.status != CardStatusEnum.blocked:
                            reading_card.status = CardStatusEnum.blocked
                            total_cards_blocked += 1
        
        # Commit all changes
        if total_infractions_added > 0 or total_cards_blocked > 0:
            db.session.commit()
            
            result = {
                "infractions_added": total_infractions_added,
                "cards_blocked": total_cards_blocked,
                "readers_affected": len(readers_affected)
            }
            print(f"🔴 [LIBRARIAN] Updated: {result}")
            return result
        
        print("🔴 [LIBRARIAN] No infractions to update")
        return None
        
    except Exception as e:
        print(f"❌ Error in check_all_readers_infractions: {e}")
        import traceback
        traceback.print_exc()
        return None