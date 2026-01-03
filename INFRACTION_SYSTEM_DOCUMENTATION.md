# Infraction Tracking & Card Blocking System

## Overview
Implemented a comprehensive infraction tracking system that monitors late book returns and automatically blocks reading cards based on library policies.

## Business Rules Implemented

### Rule 1: Infractions for Late Returns (>5 days)
- When a book is returned **more than 5 days late**, an infraction is recorded
- Infractions are tracked in the `Reader.infraction_count` field
- Late fees still apply (5,000 VND per day)

### Rule 2: Three Infractions = Permanent Block
- When a reader accumulates **3 infractions**, their reading card is permanently blocked
- Card status changes to `CardStatusEnum.blocked`
- No further book borrowing is allowed

### Rule 3: 30+ Days Late = Immediate Block
- Returning a book **30 or more days late** results in immediate permanent card blocking
- This bypasses the 3-infraction rule
- Applied regardless of previous infraction count

## Database Changes

### 1. Reader Model (`model_reader.py`)
```python
infraction_count = Column(Integer, default=0)
```
- Tracks the number of infractions accumulated by each reader
- Defaults to 0 for new readers

### 2. CardStatusEnum (`model_reading_card.py`)
```python
class CardStatusEnum(str, enum.Enum):
    active = "Active"
    expired = "Expired"
    suspended = "Suspended"
    blocked = "Blocked"  # NEW STATUS
```
- Added `blocked` status for permanently blocked cards

## Service Logic Updates

### Return Service (`srv_return.py`)

#### Process Return Logic Enhancement
When processing a return, the system now:

1. **Calculates days overdue**
   ```python
   days_overdue = (return_datetime.date() - due_date.date()).days if is_overdue else 0
   ```

2. **Checks for 30+ days late (immediate block)**
   ```python
   if days_overdue >= 30:
       reading_card.status = CardStatusEnum.blocked
       card_blocked = True
       block_reason = f"Returned book {days_overdue} days late (≥30 days)"
   ```

3. **Adds infraction for 5+ days late**
   ```python
   elif days_overdue > 5:
       reader.infraction_count += 1
       infraction_added = True
       
       # Check if 3 infractions reached
       if reader.infraction_count >= 3:
           reading_card.status = CardStatusEnum.blocked
           card_blocked = True
           block_reason = f"Accumulated {reader.infraction_count} infractions"
   ```

4. **Returns detailed response**
   ```python
   response = {
       # ... existing fields ...
       "infraction_added": infraction_added,
       "total_infractions": reader.infraction_count,
       "card_blocked": card_blocked,
       "block_reason": block_reason
   }
   ```

#### New Reader Status Endpoint
```python
@staticmethod
def get_reader_status(reader_id: str) -> dict:
    """Get comprehensive reader status for librarian return interface"""
    # Returns: card status, infractions, borrow limits, active loans, etc.
```

### Borrow Service (`srv_borrow.py`)

#### Create Borrow Request
- Enhanced validation to check for blocked cards
- Prevents blocked readers from creating new borrow requests
```python
if card.status == CardStatusEnum.blocked:
    raise HTTPException(
        status_code=403, 
        detail=f"Reading card is permanently blocked. Cannot borrow books. (Infractions: {reader.infraction_count})"
    )
```

#### Approve Borrow Request
- Librarians cannot approve requests from blocked readers
- System automatically rejects the request and returns an error
```python
if card and card.status == CardStatusEnum.blocked:
    borrow_slip.status = BorrowStatusEnum.rejected
    db.session.commit()
    raise HTTPException(
        status_code=403,
        detail=f"Cannot approve: Reader's card is permanently blocked (Infractions: {reader.infraction_count})"
    )
```

## API Changes

### New Endpoint: Get Reader Status
**`GET /returns/reader-status/{reader_id}`**

Returns comprehensive reader information including:
- Reader ID, full name
- Card type (Standard/VIP) and status
- **Infraction count** (NEW)
- Borrow limits and available slots
- Active loans with overdue information
- Can borrow status

**Response Example:**
```json
{
  "reader_id": "R001",
  "full_name": "John Doe",
  "card_type": "Standard",
  "card_status": "Blocked",
  "infraction_count": 3,
  "borrow_limit": 5,
  "current_borrowed_count": 2,
  "available_slots": 0,
  "can_borrow": false,
  "active_loans": [...],
  "overdue_loans": [...]
}
```

### Enhanced Endpoint: Process Return
**`POST /returns/process-return`**

Now includes in response:
- `infraction_added`: Boolean indicating if an infraction was recorded
- `total_infractions`: Current total infractions for the reader
- `card_blocked`: Boolean indicating if the card was blocked
- `block_reason`: Explanation of why the card was blocked (if applicable)

## Frontend Updates

### TypeScript Types (`types.ts`)

#### New Enum: CardStatus
```typescript
export enum CardStatus {
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  SUSPENDED = 'Suspended',
  BLOCKED = 'Blocked'  // NEW
}
```

#### Updated Interface: ReaderStatusResponse
```typescript
export interface ReaderStatusResponse {
  // ... existing fields ...
  infraction_count?: number;  // NEW FIELD
  // ... remaining fields ...
}
```

## Database Migration

### Migration File: `add_infraction_tracking.py`
```python
def upgrade():
    op.add_column('readers', sa.Column('infraction_count', sa.Integer(), 
                   nullable=False, server_default='0'))

def downgrade():
    op.drop_column('readers', 'infraction_count')
```

**To apply migration:**
```bash
alembic upgrade head
```

## User Experience Impact

### For Readers:
1. **Transparent Feedback**: Readers can see their infraction count in their profile
2. **Clear Warnings**: When infractions are added, they're notified immediately
3. **Prevention of Borrowing**: Blocked readers see clear error messages explaining why they can't borrow

### For Librarians:
1. **Automatic Enforcement**: System automatically blocks cards based on rules
2. **Visibility**: Librarian dashboard shows infraction counts and card status
3. **Clear Indicators**: When processing returns, librarians see if an infraction was added or if a card was blocked

## Testing Scenarios

### Scenario 1: Minor Late Return (1-5 days)
- **Action**: Return book 3 days late
- **Result**: Late fee applied, NO infraction added
- **Card Status**: Remains active

### Scenario 2: Moderate Late Return (6-29 days)
- **Action**: Return book 10 days late
- **Result**: Late fee applied, infraction added (count increments)
- **Card Status**: Remains active (unless reaching 3 infractions)

### Scenario 3: Third Infraction
- **Action**: Return book >5 days late for the 3rd time
- **Result**: Late fee, infraction added, **card blocked permanently**
- **Card Status**: Changed to "Blocked"

### Scenario 4: Extreme Late Return (30+ days)
- **Action**: Return book 35 days late
- **Result**: Late fee, **immediate card block** (no infraction needed)
- **Card Status**: Changed to "Blocked"

### Scenario 5: Blocked Reader Attempts to Borrow
- **Action**: Blocked reader tries to create borrow request
- **Result**: HTTP 403 error with message explaining permanent block
- **UI**: Error message displayed to user

### Scenario 6: Librarian Approves Blocked Reader's Request
- **Action**: Librarian attempts to approve old pending request from now-blocked reader
- **Result**: Request auto-rejected, HTTP 403 error returned
- **UI**: Error message explaining reader is blocked

## Error Messages

### For Readers:
- **Creating Borrow Request**: 
  > "Reading card is permanently blocked. Cannot borrow books. (Infractions: 3)"

### For Librarians:
- **Approving Blocked Reader**:
  > "Cannot approve: Reader's card is permanently blocked (Infractions: 3)"

## Future Enhancements (Optional)

1. **Infraction Expiry**: Add a time-based expiry for infractions (e.g., infractions older than 1 year are cleared)
2. **Appeal System**: Allow readers to appeal infractions or blocks
3. **Warnings**: Send email/SMS warnings at 2 infractions before permanent block
4. **Unblock Mechanism**: Allow managers to manually unblock cards with justification
5. **Infraction History**: Track detailed history of each infraction (date, book, days late)

## Summary

This implementation provides a robust, automated system for tracking late returns and enforcing library policies. The system is transparent, consistent, and provides clear feedback to both readers and librarians about infraction status and consequences.
