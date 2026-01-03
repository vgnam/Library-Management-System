# Librarian User Borrow History Feature

## Overview
Added functionality for librarians to view the complete borrow history of any user in the library management system.

## New Endpoint

### `GET /api/librarian/users/{user_id}/borrow-history`

**Description:** Allows librarians to view complete borrow history for any user.

**Authentication:** Requires librarian token

**Path Parameters:**
- `user_id` (string): The user ID to retrieve borrow history for

**Query Parameters:**
- `status` (optional): Filter by borrow status
  - Valid values: `pending`, `active`, `returned`, `overdue`, `rejected`
- `page` (optional): Page number for pagination (default: 1)
- `page_size` (optional): Items per page (default: 10, max: 100)

## Implementation Details

### Service Layer
**File:** `app/services/srv_librarian_management.py`

Added method: `get_user_borrow_history(user_id, status, page, page_size)`

**Features:**
- Validates user exists and is a reader
- Leverages existing `HistoryService.get_borrow_history()` method
- Adds user information to the response
- Proper error handling with HTTP exceptions

### API Layer
**File:** `app/api/api_librarian_management.py`

Added endpoint: `GET /librarian/users/{user_id}/borrow-history`

**Features:**
- Librarian authentication required
- Input validation for query parameters
- Comprehensive API documentation

## Response Format

```json
{
  "user_info": {
    "user_id": "string",
    "username": "string",
    "full_name": "string",
    "reader_id": "string"
  },
  "total": 0,
  "page": 1,
  "page_size": 10,
  "total_pages": 0,
  "history": [
    {
      "borrow_slip_id": "string",
      "borrow_detail_id": 0,
      "borrow_date": "2024-01-15T10:00:00",
      "due_date": "2024-01-30T10:00:00",
      "actual_return_date": "2024-01-28T10:00:00",
      "status": "Returned",
      "book": {
        "book_id": "string",
        "title": "string",
        "author": "string",
        "due_date": "2024-01-30T10:00:00",
        "actual_return_date": "2024-01-28T10:00:00",
        "is_returned": true,
        "is_overdue": false,
        "days_overdue": 0,
        "status": "Returned"
      },
      "penalty": {
        "penalty_id": "string",
        "penalty_type": "Late",
        "description": "string",
        "fine_amount": 0,
        "days_overdue": 0,
        "status": "Paid",
        "real_time_calculated": true
      }
    }
  ]
}
```

## Usage Examples

### 1. Get all borrow history for a user
```bash
curl -X GET "http://localhost:8000/api/librarian/users/user123/borrow-history" \
  -H "Authorization: Bearer {librarian_token}"
```

### 2. Get overdue books for a user
```bash
curl -X GET "http://localhost:8000/api/librarian/users/user123/borrow-history?status=overdue" \
  -H "Authorization: Bearer {librarian_token}"
```

### 3. Get returned books with pagination
```bash
curl -X GET "http://localhost:8000/api/librarian/users/user123/borrow-history?status=returned&page=1&page_size=20" \
  -H "Authorization: Bearer {librarian_token}"
```

## Error Responses

### User Not Found
```json
{
  "detail": "User with ID user123 not found"
}
```
Status Code: `404 NOT FOUND`

### User is Not a Reader
```json
{
  "detail": "User user123 is not a reader and has no borrow history"
}
```
Status Code: `400 BAD REQUEST`

### Unauthorized Access
```json
{
  "detail": "User is not a librarian"
}
```
Status Code: `403 FORBIDDEN`

## Benefits

1. **Complete Visibility:** Librarians can view complete borrow history of any user
2. **Flexible Filtering:** Filter by status to find specific types of borrows
3. **Pagination Support:** Handle large histories efficiently
4. **Penalty Information:** View penalty details including real-time fine calculations
5. **Overdue Tracking:** Automatically identifies overdue books
6. **User Context:** Response includes user information for context

## Related Endpoints

The new endpoint complements existing librarian management features:
- `GET /librarian/users/{user_id}` - Get user details
- `GET /librarian/users/{user_id}/current-borrows` - Get current borrows only
- `GET /librarian/readers` - List all readers
- `POST /librarian/users/{user_id}/remove-ban` - Remove user ban

## Notes

- The endpoint uses the same `HistoryService.get_borrow_history()` method that readers use for their own history
- Overdue status is automatically updated in the database before fetching history
- Penalty amounts are calculated in real-time for late penalties
- The response includes both user context and pagination metadata
