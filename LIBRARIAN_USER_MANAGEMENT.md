# Librarian User Management System

## Overview
This module provides librarians with comprehensive tools to manage library users, view their borrowing activities, and handle card bans/suspensions.

## Features

### 1. View User Information
Librarians can view detailed information about any user in the system.

**Endpoint:** `GET /api/librarian/users/{user_id}`

**Returns:**
- User details (username, email, phone, address, etc.)
- Reader information (if user is a reader)
- Reading card details and status
- Total books borrowed
- Infraction count

**Example Response:**
```json
{
  "user_id": "user123",
  "username": "john_doe",
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone_number": "1234567890",
  "age": 25,
  "dob": "1999-01-15",
  "address": "123 Main St",
  "gender": "Male",
  "role": "reader",
  "reader_info": {
    "reader_id": "reader123",
    "total_borrowed": 15,
    "infraction_count": 1,
    "reading_card": {
      "card_id": "card123",
      "card_type": "Standard",
      "fee": 50000,
      "register_date": "2024-01-01",
      "register_office": "Main Library",
      "status": "Active"
    }
  }
}
```

### 2. View User's Borrow History
Get complete borrow history for any user including past and current borrows.

**Endpoint:** `GET /api/librarian/users/{user_id}/borrow-history`

**Query Parameters:**
- `status` (optional): Filter by status (pending, active, returned, overdue, rejected)
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 10, max: 100)

**Returns:**
- User information
- Paginated borrow history
- Book details for each borrow
- Penalty information (if any)
- Overdue status and days

**Example Request:**
```
GET /api/librarian/users/user123/borrow-history?status=overdue&page=1&page_size=10
```

**Example Response:**
```json
{
  "user_info": {
    "user_id": "user123",
    "username": "john_doe",
    "full_name": "John Doe",
    "reader_id": "reader123"
  },
  "total": 25,
  "page": 1,
  "page_size": 10,
  "total_pages": 3,
  "history": [
    {
      "borrow_slip_id": "BS001",
      "borrow_detail_id": 1,
      "borrow_date": "2024-01-15T10:00:00",
      "due_date": "2024-01-30T10:00:00",
      "actual_return_date": null,
      "status": "Overdue",
      "book": {
        "book_id": "BK001",
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "due_date": "2024-01-30T10:00:00",
        "actual_return_date": null,
        "is_returned": false,
        "is_overdue": true,
        "days_overdue": 5,
        "status": "Overdue"
      },
      "penalty": {
        "penalty_id": "PEN001",
        "penalty_type": "Late",
        "description": "Overdue: 5 days. Fine: 25,000 VND",
        "fine_amount": 25000,
        "days_overdue": 5,
        "status": "Unpaid",
        "real_time_calculated": true
      }
    }
  ]
}
```

### 3. View User's Current Borrowed Books
See all books currently borrowed by a user, including overdue status and penalties.

**Endpoint:** `GET /api/librarian/users/{user_id}/current-borrows`

**Returns:**
- List of all currently borrowed books
- Book details (title, author, ISBN, publisher)
- Borrow date and due date
- Overdue status and days overdue
- Penalty information (if any)

**Example Response:**
```json
[
  {
    "borrow_detail_id": "detail123",
    "book_id": "book456",
    "isbn": "978-0-123456-78-9",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "publisher": "Scribner",
    "borrow_slip_id": "slip789",
    "borrow_date": "2025-12-01 10:00:00",
    "due_date": "2025-12-15 23:59:59",
    "status": "Overdue",
    "is_overdue": true,
    "days_overdue": 17,
    "penalty": {
      "penalty_id": "penalty123",
      "penalty_type": "Late",
      "description": "Book returned late",
      "status": "Pending"
    }
  }
]
```

### 3. Remove Ban/Suspension
Librarians can remove bans or suspensions from user reading cards, allowing them to borrow books again.

**Endpoint:** `POST /api/librarian/users/{user_id}/remove-ban`

**Query Parameters:**
- `reason` (optional): Reason for removing the ban

**What it does:**
- Changes card status from `Suspended` or `Blocked` to `Active`
- Allows user to borrow books again
- Records the action

**Example Response:**
```json
{
  "success": true,
  "message": "Successfully removed ban for user john_doe. Reason: Books returned, fine paid",
  "user_id": "user123",
  "username": "john_doe",
  "reader_id": "reader123",
  "card_id": "card123",
  "old_status": "Suspended",
  "new_status": "Active"
}
```

### 4. List All Readers
Get a paginated list of all readers with filtering options.

**Endpoint:** `GET /api/librarian/readers`

**Query Parameters:**
- `status_filter` (optional): Filter by card status (active, suspended, blocked, expired)
- `limit` (default: 100, max: 500): Number of results per page
- `offset` (default: 0): Number of results to skip

**Example Response:**
```json
{
  "total": 150,
  "limit": 100,
  "offset": 0,
  "readers": [
    {
      "user_id": "user123",
      "username": "john_doe",
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone_number": "1234567890",
      "reader_id": "reader123",
      "total_borrowed": 15,
      "infraction_count": 1,
      "card_id": "card123",
      "card_type": "Standard",
      "card_status": "Active",
      "register_date": "2024-01-01"
    }
  ]
}
```

### 5. Search User by Username
Search for users by username (supports partial matching).

**Endpoint:** `GET /api/librarian/users/search/{username}`

**Example:** `/api/librarian/users/search/john` will find all users with "john" in their username

**Example Response:**
```json
[
  {
    "user_id": "user123",
    "username": "john_doe",
    "full_name": "John Doe",
    "email": "john@example.com",
    "role": "reader",
    "reader_id": "reader123",
    "total_borrowed": 15,
    "infraction_count": 1,
    "card_status": "Active"
  }
]
```

## Authentication

All endpoints require librarian authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

To get a token, use the librarian login endpoint:
```
POST /api/auth/librarian/login
```

## Card Status Types

- **Active**: User can borrow books normally
- **Suspended**: Temporarily banned (usually due to overdue books)
- **Blocked**: Permanently banned (usually due to multiple infractions)
- **Expired**: Card has expired and needs renewal

## Use Cases

### Scenario 1: User Calls About Their Account
1. Search for user by username: `GET /api/librarian/users/search/{username}`
2. Get full user info: `GET /api/librarian/users/{user_id}`
3. Check current borrows: `GET /api/librarian/users/{user_id}/current-borrows`

### Scenario 2: User Wants to Borrow but is Suspended
1. Check their current borrows: `GET /api/librarian/users/{user_id}/current-borrows`
2. Verify all overdue books are returned
3. Remove suspension: `POST /api/librarian/users/{user_id}/remove-ban?reason=All books returned`

### Scenario 3: Review All Suspended Users
1. List all suspended readers: `GET /api/librarian/readers?status_filter=suspended`
2. Check each user's borrowed books
3. Take appropriate action (contact user, remove ban if resolved, etc.)

### Scenario 4: Generate Report on Problem Borrowers
1. List blocked users: `GET /api/librarian/readers?status_filter=blocked`
2. Review their infraction count and borrow history
3. Make decisions about permanent bans or giving second chances

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid input (e.g., trying to unban a card that isn't banned)
- `403 Forbidden`: User is not a librarian
- `404 Not Found`: User or resource not found
- `500 Internal Server Error`: Server error

## Implementation Details

### Service Layer
**File:** `app/services/srv_librarian_management.py`

Contains the business logic for:
- Querying user information with related data
- Fetching active borrows with overdue calculations
- Managing card status changes
- Pagination and filtering

### API Layer
**File:** `app/api/api_librarian_management.py`

Defines the REST API endpoints with:
- Authentication verification
- Request/response handling
- Error handling
- Documentation

### Router Registration
**File:** `app/api/api_router.py`

The new router is registered and accessible under the `/api/librarian` prefix.

## Testing the Endpoints

### Using cURL

```bash
# Get user info
curl -X GET "http://localhost:8000/api/librarian/users/user123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get user's current borrows
curl -X GET "http://localhost:8000/api/librarian/users/user123/current-borrows" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Remove ban
curl -X POST "http://localhost:8000/api/librarian/users/user123/remove-ban?reason=Books%20returned" \
  -H "Authorization: Bearer YOUR_TOKEN"

# List all readers
curl -X GET "http://localhost:8000/api/librarian/readers?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by username
curl -X GET "http://localhost:8000/api/librarian/users/search/john" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Swagger UI

Navigate to `http://localhost:8000/docs` to access the interactive API documentation where you can test all endpoints.

## Security Considerations

1. **Authentication Required**: All endpoints require valid librarian JWT token
2. **Role Verification**: Each request verifies the user has librarian role
3. **Input Validation**: All inputs are validated before processing
4. **SQL Injection Prevention**: Using SQLAlchemy ORM prevents SQL injection
5. **Error Messages**: Error messages don't leak sensitive information

## Future Enhancements

Potential features to add:
- Export user data to CSV/Excel
- Bulk ban removal for multiple users
- Email notifications when ban is removed
- Audit log of all librarian actions
- Advanced filtering (by infraction count, total borrowed, etc.)
- User statistics and borrowing patterns
- Ability to add notes/comments about users
