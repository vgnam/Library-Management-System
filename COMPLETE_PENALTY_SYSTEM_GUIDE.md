# Complete Library Penalty & Suspension System

## 🎯 System Overview

This library management system now includes a comprehensive three-tier enforcement system to ensure proper book handling and timely returns:

1. **💰 Financial Penalties** - Late fees and damage compensation
2. **⚠️ Infraction Tracking** - Progressive discipline for repeat offenders
3. **🚫 Automatic Suspension** - Temporary ban for users with overdue books

---

## 📊 The Three-Tier System

### Tier 1: Financial Penalties (Immediate)
**Applies to**: Every late or damaged return

| Violation Type | Penalty | When Applied |
|----------------|---------|--------------|
| Late Return | 5,000 VND/day | Any overdue return |
| Damaged Book | 50,000 - 500,000 VND | Book returned damaged |
| Lost Book | 150% of book price | Book reported lost |

### Tier 2: Infraction System (Cumulative)
**Applies to**: Returns more than 5 days late

| Infractions | Result | Recovery |
|-------------|--------|----------|
| 1-2 infractions | Warning + Late fee | Tracked permanently |
| 3 infractions | **Permanent card block** | No recovery - contact admin |
| 30+ days late | **Immediate permanent block** | No recovery - contact admin |

### Tier 3: Suspension System (Temporary)
**Applies to**: Any user with overdue books

| Status | Trigger | Recovery |
|--------|---------|----------|
| Active → Suspended | User tries to borrow with overdue books | Return all overdue books |
| Suspended → Active | All overdue books returned | Automatic restoration |

---

## 🔄 Complete User Journey

### Example: Progressive Discipline

#### Week 1: First Late Return (3 days)
- ✅ **Return**: Book returned 3 days late
- 💰 **Financial**: 15,000 VND late fee
- ⚠️ **Infraction**: None (≤5 days)
- 🎫 **Card Status**: Active
- **Can Borrow**: Yes

#### Week 2: Second Late Return (7 days)
- ✅ **Return**: Book returned 7 days late
- 💰 **Financial**: 35,000 VND late fee
- ⚠️ **Infraction**: +1 (total: 1/3)
- 🎫 **Card Status**: Active
- **Can Borrow**: Yes (with warning)

#### Week 3: User Tries to Borrow While Book is Overdue
- 🚫 **Action**: User tries to borrow new book
- 🔍 **System Check**: Detects 1 overdue book
- 🚫 **Auto-Suspend**: Card status changed to Suspended
- ❌ **Result**: Borrow request rejected
- 📧 **Message**: "Your card has been suspended due to 1 overdue book(s). Please return all overdue books before borrowing again."
- **Can Borrow**: No

#### Week 4: User Returns Overdue Book
- ✅ **Return**: Overdue book returned (14 days late)
- 💰 **Financial**: 70,000 VND late fee
- ⚠️ **Infraction**: +1 (total: 2/3)
- 🔓 **Auto-Unsuspend**: Card status restored to Active
- ✅ **Message**: "Book returned successfully. ✅ Card status restored to Active!"
- **Can Borrow**: Yes

#### Week 5: Third Late Return (8 days)
- ✅ **Return**: Book returned 8 days late
- 💰 **Financial**: 40,000 VND late fee
- ⚠️ **Infraction**: +1 (total: 3/3)
- 🚫 **PERMANENT BLOCK**: Card status changed to Blocked
- ❌ **Message**: "Card permanently blocked - 3 infractions accumulated"
- **Can Borrow**: Never (requires admin intervention)

---

## 🎭 User Experience by Card Status

### 🟢 Active (Normal Status)
**What User Can Do:**
- ✅ Browse and search books
- ✅ Submit borrow requests
- ✅ Return books
- ✅ View borrow history

**What System Does:**
- Checks for overdue books on borrow attempt
- Auto-suspends if overdue books found

### 🟡 Suspended (Temporary Ban)
**What User Can Do:**
- ✅ Browse and search books
- ❌ Cannot submit borrow requests
- ✅ Can (and must) return books
- ✅ View borrow history

**What System Does:**
- Blocks all borrow attempts
- Shows clear error messages
- Auto-restores to Active when all overdue books returned

**User Sees:**
```
⚠️ Account Alert: Overdue Books Detected
You have overdue books. Your account may be suspended.
Please return overdue books immediately to avoid penalties.
```

### 🔴 Blocked (Permanent Ban)
**What User Can Do:**
- ✅ Browse and search books
- ❌ Cannot submit borrow requests
- ✅ Can return books (to clear outstanding items)
- ✅ View borrow history

**What System Does:**
- Blocks all borrow attempts permanently
- Shows infraction count in profile
- Requires administrator intervention to unblock

**User Sees:**
```
❌ Reading card is permanently blocked. Cannot borrow books.
(Infractions: 3)
```

---

## 👨‍💼 Librarian Interface

### Processing Returns

When processing a return, librarian sees:

**Standard Return (On Time):**
```
✅ Book returned successfully
Late Fee: 0 VND
Infraction: None
```

**Late Return (6 days):**
```
✅ Book returned successfully
Late Fee: 30,000 VND
⚠️ Infraction Added (Total: 1/3)
```

**Late Return Triggering Block:**
```
✅ Book returned successfully
Late Fee: 40,000 VND
⚠️ Infraction Added (Total: 3/3)
🚫 CARD BLOCKED - 3 infractions accumulated
```

**Suspended User Returns Last Overdue Book:**
```
✅ Book returned successfully
Late Fee: 70,000 VND
⚠️ Infraction Added (Total: 2/3)
✅ Card Status Restored to Active
```

### Approving Borrow Requests

**Normal User:**
```
✅ Borrow request approved
Due Date: [Date + 45/60 days]
```

**Suspended User:**
```
❌ Cannot approve: Reader's card is suspended due to 2 overdue book(s).
Reader must return all overdue books first.
```

**Blocked User:**
```
❌ Cannot approve: Reader's card is permanently blocked (Infractions: 3)
```

---

## 📱 Visual Indicators

### Reader Dashboard (BookSearch Page)

#### Active User - Good Standing:
```
┌──────────────────────────────────────────┐
│ Account Type: STANDARD                   │
│ Currently borrowed: 2 / 5 books         │
│ You can borrow: 3 more books            │
└──────────────────────────────────────────┘
```

#### Active User - Has Overdue:
```
┌──────────────────────────────────────────┐
│ ⚠️ Account Alert: Overdue Books Detected │
│ You have overdue books. Your account    │
│ may be suspended. Please return overdue │
│ books immediately to avoid penalties.   │
├──────────────────────────────────────────┤
│ Account Type: STANDARD                   │
│ Currently borrowed: 3 / 5 books         │
│ You can borrow: 2 more books            │
└──────────────────────────────────────────┘
```

### Librarian Interface (ReturnBook Page)

#### Profile Card - Suspended User:
```
┌─────────────────────────────┐
│ John Doe                    │
│ R001                        │
├─────────────────────────────┤
│ Card Type: STANDARD         │
│ Status: [Suspended]         │
├─────────────────────────────┤
│ ⚠️ Suspended - Overdue Books│
│ Process all overdue returns │
│ to restore active status    │
├─────────────────────────────┤
│ ⚠️ Infractions: 2/3         │
│ 1 more infraction(s) until │
│ permanent block             │
└─────────────────────────────┘
```

---

## 🔧 Technical Implementation Summary

### Database Changes
- ✅ Added `infraction_count` to Reader model
- ✅ Added `blocked` status to CardStatusEnum
- ✅ Migration script created

### Backend Logic
- ✅ Auto-suspend on borrow with overdue books
- ✅ Auto-unsuspend when all overdue books returned
- ✅ Track infractions for returns >5 days late
- ✅ Block cards at 3 infractions or 30+ days late
- ✅ Prevent borrowing for suspended/blocked users
- ✅ Prevent librarians from approving suspended/blocked users

### Frontend Enhancements
- ✅ Overdue warning banner
- ✅ Suspension status indicators
- ✅ Infraction counter display
- ✅ Unsuspension confirmation messages
- ✅ Enhanced error handling with context

### API Endpoints
- ✅ Reader status endpoint with infraction data
- ✅ Return processing includes suspension/infraction info
- ✅ Error responses include actionable guidance

---

## 📈 Enforcement Logic Flow

```
┌─────────────────────────────────────────────┐
│         User Attempts to Borrow             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Check Status  │
         └───────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   [Blocked?]        [Suspended?]
        │                 │
        │ Yes             │ Yes
        ▼                 ▼
    🚫 Reject         🚫 Reject
   "Permanent"       "Return overdue"
        │                 │
        │ No              │ No
        └────────┬────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Check Overdue │
         └───────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   [Has Overdue?]    [No Overdue?]
        │                 │
        │ Yes             │
        ▼                 │
    Auto-Suspend          │
    🚫 Reject             │
   "X overdue books"      │
        │                 │
        │                 ▼
        │            ✅ Allow
        │           "Request created"
        │                 │
        └─────────────────┘
```

---

## 🎓 Best Practices

### For Readers:
1. ✅ Return books on time to avoid fees
2. ✅ Return books within 5 days of due date to avoid infractions
3. ✅ Check borrow history regularly for due dates
4. ⚠️ If suspended, return ALL overdue books immediately

### For Librarians:
1. 🔍 Check reader status before processing returns
2. 📊 Review infraction count when processing late returns
3. ⚠️ Note suspension warnings in reader profiles
4. 📧 Communicate clearly about blocks and suspensions

### For Administrators:
1. 📊 Monitor infraction trends
2. 🔓 Handle unblock requests for permanent blocks
3. ⚙️ Adjust penalty rates in `FINE_RATES` configuration
4. 📈 Generate reports on suspension/block statistics

---

## 🚀 Quick Reference

### Key Numbers to Remember:
- **5 days**: Late threshold for infractions
- **3 infractions**: Permanent block trigger
- **30 days**: Instant permanent block
- **5,000 VND**: Daily late fee
- **150%**: Lost book compensation rate

### Status Hierarchy:
1. **Active** → Normal operations
2. **Suspended** → Temporary ban (recoverable)
3. **Blocked** → Permanent ban (admin intervention required)

### Recovery Paths:
- **Suspended** → Return all overdue books → **Active**
- **Blocked** → Contact administrator → **Active** (if approved)

---

## 📚 Documentation Files

1. **INFRACTION_SYSTEM_DOCUMENTATION.md** - Detailed infraction and blocking system
2. **SUSPENSION_SYSTEM_DOCUMENTATION.md** - Detailed suspension system
3. **THIS FILE** - Complete system overview

For detailed technical documentation, see the individual system documentation files.
