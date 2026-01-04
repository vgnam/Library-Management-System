# Temporary Suspension System

## Overview
Implemented an automatic suspension system that temporarily bans users who have overdue books, preventing them from borrowing new books until all overdue items are returned.

## How It Works

### 🔴 **Auto-Suspension (Temporary Ban)**

#### When Suspension Occurs:
1. **At Borrow Attempt**: When a user with an active card tries to borrow a book
2. **System Check**: Automatically checks if the user has any overdue books
3. **Auto-Suspend**: If overdue books are found, the card status changes from `Active` → `Suspended`
4. **Immediate Block**: The borrow request is rejected with a clear explanation

#### User Experience:
```
❌ Error Message:
"Your card has been suspended due to 2 overdue book(s). 
Please return all overdue books before borrowing again."
```

### 🟢 **Auto-Unsuspension (Restoration)**

#### When Unsuspension Occurs:
1. **At Book Return**: When a suspended user returns a book
2. **System Check**: Automatically checks if any overdue books remain
3. **Auto-Unsuspend**: If no overdue books remain, card status changes from `Suspended` → `Active`
4. **Confirmation**: Librarian and user are notified of status restoration

#### User Experience:
```
✅ Success Message:
"Book 'The Great Gatsby' returned successfully. 
✅ Card status restored to Active!"
```

## Business Logic

### Suspension Rules:

1. **Prevention is Key**: Users cannot create borrow requests if they have overdue books
2. **Immediate Action**: Suspension happens instantly when user tries to borrow with overdue books
3. **Clear Communication**: Users are told exactly how many overdue books they have
4. **Cannot Bypass**: Librarians cannot approve borrow requests from suspended users
5. **Automatic Recovery**: As soon as all overdue books are returned, suspension is lifted

### Important Notes:
- ⚠️ Suspension is **temporary** - it's automatically lifted when issues are resolved
- 🚫 Suspension is **different from blocking** - blocked status is permanent (3 infractions or 30+ days late)
- 📋 Suspended users can still return books (required to restore status)
- 🔄 System checks for overdue books in real-time during each operation

## Implementation Details

### Backend Changes

#### 1. Borrow Service Enhancement (`srv_borrow.py`)

**Auto-Suspend on Borrow Attempt:**
```python
# Check for overdue books and auto-suspend if needed
overdue_result = HistoryService.get_overdue_books(reader.reader_id)
overdue_count = overdue_result.get("total_overdue", 0)

if overdue_count > 0 and card.status == CardStatusEnum.active:
    # Auto-suspend user with overdue books
    card.status = CardStatusEnum.suspended
    db.session.commit()
    raise HTTPException(
        status_code=403,
        detail=f"Your card has been suspended due to {overdue_count} overdue book(s). 
                Please return all overdue books before borrowing again."
    )
```

**Prevent Suspended Users from Borrowing:**
```python
if card.status == CardStatusEnum.suspended:
    overdue_count = overdue_result.get("total_overdue", 0)
    
    if overdue_count > 0:
        raise HTTPException(
            status_code=403,
            detail=f"Reading card is suspended. You have {overdue_count} overdue book(s). 
                    Please return all overdue books before borrowing again."
        )
```

**Prevent Librarians from Approving Suspended Users:**
```python
if card and card.status == CardStatusEnum.suspended:
    overdue_result = HistoryService.get_overdue_books(borrow_slip.reader_id)
    overdue_count = overdue_result.get("total_overdue", 0)
    
    borrow_slip.status = BorrowStatusEnum.rejected
    db.session.commit()
    
    if overdue_count > 0:
        raise HTTPException(
            status_code=403,
            detail=f"Cannot approve: Reader's card is suspended due to {overdue_count} 
                    overdue book(s). Reader must return all overdue books first."
        )
```

#### 2. Return Service Enhancement (`srv_return.py`)

**Auto-Unsuspend After Returning All Overdue Books:**
```python
# Check if reader has no more overdue books and unsuspend if suspended
if reading_card and reading_card.status == CardStatusEnum.suspended:
    overdue_result = HistoryService.get_overdue_books(reader.reader_id)
    remaining_overdue = overdue_result.get("total_overdue", 0)
    
    if remaining_overdue == 0:
        # No more overdue books - unsuspend the card
        reading_card.status = CardStatusEnum.active
        card_unsuspended = True

# Return response includes unsuspension status
response = {
    # ... other fields ...
    "card_unsuspended": card_unsuspended
}
```

### Frontend Changes

#### 1. BookSearch Page (`BookSearch.tsx`)

**Overdue Warning Banner:**
```tsx
{readerStats.has_overdue && (
  <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-red-800">
          ⚠️ Account Alert: Overdue Books Detected
        </p>
        <p className="text-xs text-red-700 mt-1">
          You have overdue books. Your account may be suspended. 
          Please return overdue books immediately to avoid penalties.
        </p>
      </div>
    </div>
  </div>
)}
```

**Enhanced Error Handling:**
```tsx
// Check if error is about suspension or overdue books
if (msg.includes('suspended') || msg.includes('overdue')) {
  setWarningMsg(msg);  // Show as warning (yellow)
} else {
  setErrorMsg(msg);    // Show as error (red)
}
```

#### 2. ReturnBook Page (`ReturnBook.tsx`)

**Suspension Status Indicator:**
```tsx
{readerData.card_status === 'Suspended' && (
  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
    <p className="text-xs font-bold text-yellow-800 flex items-center gap-1">
      <AlertCircle className="h-4 w-4" />
      Suspended - Overdue Books
    </p>
    <p className="text-xs text-yellow-700 mt-1">
      Process all overdue returns to restore active status
    </p>
  </div>
)}
```

**Infraction Counter:**
```tsx
{readerData.infraction_count > 0 && (
  <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
    <p className="text-xs font-bold text-orange-800">
      ⚠️ Infractions: {readerData.infraction_count}/3
    </p>
    <p className="text-xs text-orange-700 mt-1">
      {3 - readerData.infraction_count} more infraction(s) until permanent block
    </p>
  </div>
)}
```

**Unsuspension Notification:**
```tsx
if (result?.data?.card_unsuspended) {
  setSuccessMsg(`Book returned successfully. ✅ Card status restored to Active!`);
}
```

## User Flow Examples

### Scenario 1: User Tries to Borrow with Overdue Books

1. **User**: Selects books to borrow in BookSearch page
2. **User**: Clicks "Submit Borrow Request"
3. **System**: Detects 2 overdue books
4. **System**: Changes card status: `Active` → `Suspended`
5. **User Sees**: Yellow warning message
   > "Your card has been suspended due to 2 overdue book(s). Please return all overdue books before borrowing again."
6. **User Action Required**: Must return overdue books

### Scenario 2: Suspended User Returns First Overdue Book

1. **Librarian**: Processes return of first overdue book
2. **System**: Checks remaining overdue books
3. **System**: Finds 1 more overdue book remaining
4. **Status**: Card remains `Suspended`
5. **Librarian Sees**: Normal return confirmation (no unsuspension yet)

### Scenario 3: Suspended User Returns Last Overdue Book

1. **Librarian**: Processes return of last overdue book
2. **System**: Checks remaining overdue books
3. **System**: Finds 0 overdue books remaining
4. **System**: Changes card status: `Suspended` → `Active`
5. **Librarian Sees**: 
   > "Book returned successfully. ✅ Card status restored to Active!"
6. **User Can Now**: Borrow books again

### Scenario 4: Librarian Tries to Approve Suspended User's Request

1. **Scenario**: User submitted borrow request before suspension
2. **Librarian**: Tries to approve old pending request
3. **System**: Detects user is now suspended
4. **System**: Auto-rejects the request
5. **Librarian Sees**: Error message
   > "Cannot approve: Reader's card is suspended due to 3 overdue book(s). Reader must return all overdue books first."

## Status Comparison

| Card Status | Can Borrow? | Can Return? | How to Fix |
|-------------|-------------|-------------|------------|
| **Active** | ✅ Yes | ✅ Yes | N/A (Good standing) |
| **Suspended** | ❌ No | ✅ Yes | Return all overdue books |
| **Blocked** | ❌ No | ✅ Yes | Contact administrator (Permanent) |
| **Expired** | ❌ No | ✅ Yes | Renew card |

## Visual Indicators

### For Readers:
- 🟡 **Yellow Border**: Suspension warning
- 🔴 **Red Border**: Overdue books alert
- 🟢 **Green Checkmark**: Status restored message
- 🟠 **Orange Badge**: Infraction counter

### For Librarians:
- 🟡 **Suspended Badge**: Shows in reader profile
- 📊 **Infraction Count**: Shows X/3 progress
- ⚠️ **Warning Box**: Explains suspension reason
- ✅ **Success Alert**: Confirms unsuspension

## API Response Examples

### Borrow Request with Overdue Books:
```json
{
  "detail": "Your card has been suspended due to 2 overdue book(s). Please return all overdue books before borrowing again."
}
```
**HTTP Status**: 403 Forbidden

### Return Book - Unsuspension:
```json
{
  "success": true,
  "data": {
    "message": "Book return processed successfully",
    "borrow_detail_id": "BD123",
    "card_unsuspended": true,
    "infraction_added": false,
    "total_infractions": 1,
    "card_blocked": false
  }
}
```

### Reader Status with Suspension:
```json
{
  "reader_id": "R001",
  "full_name": "John Doe",
  "card_status": "Suspended",
  "infraction_count": 2,
  "can_borrow": false,
  "overdue_loans": [
    {
      "title": "The Great Gatsby",
      "days_overdue": 5
    }
  ]
}
```

## Testing Checklist

- [ ] User with overdue books gets auto-suspended when trying to borrow
- [ ] Suspended user sees clear error message with overdue count
- [ ] Suspended user can still return books
- [ ] Card auto-unsuspends after returning all overdue books
- [ ] Librarian sees unsuspension confirmation message
- [ ] Overdue warning banner shows in BookSearch for users with overdue books
- [ ] Librarian cannot approve requests from suspended users
- [ ] Suspension status shows correctly in ReturnBook page
- [ ] Infraction counter displays correctly
- [ ] Active users with no overdue books are not affected

## Benefits

1. **Automatic Enforcement**: No manual suspension needed
2. **Fair System**: Users can always restore their status by returning books
3. **Clear Communication**: Users always know why they're suspended and how to fix it
4. **Real-Time**: Status changes immediately based on current conditions
5. **Progressive Discipline**: Combines with infraction system for long-term violations
6. **User-Friendly**: Automatic restoration when issues resolved

## Future Enhancements

1. **Email Notifications**: Send email when card is suspended/unsuspended
2. **Grace Period**: Allow 1-2 day grace period before auto-suspension
3. **Partial Unsuspension**: Allow limited borrowing while some overdue books remain
4. **Suspension History**: Track suspension events for analytics
5. **Warning System**: Send warnings before suspension occurs
