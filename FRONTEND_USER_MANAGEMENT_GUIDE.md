# Librarian User Management Frontend

## Overview
A comprehensive React-based user interface for librarians to manage library users, view borrowing activities, and handle card bans/suspensions.

## Features

### 1. **Search Users**
- Search for users by username (partial matching)
- View search results with user information and card status
- Click to view detailed information

### 2. **List All Readers**
- View paginated list of all readers in the system
- Filter by card status (Active, Suspended, Blocked, Expired)
- See borrowing statistics and infraction counts at a glance
- Refresh data with a single click

### 3. **View User Details**
- Comprehensive user profile with:
  - Personal information (name, email, phone, address, etc.)
  - Reader statistics (total borrowed books, infractions)
  - Reading card details and status
  - Currently borrowed books with overdue status
  - Penalty information

### 4. **Manage Bans**
- Remove suspensions or blocks from user accounts
- Add optional reason for ban removal
- Instant card status update
- Automatic refresh of user information

## User Interface

### Navigation
For librarians, the navigation bar includes:
- **Dashboard** - Borrow and return request management
- **User Management** - The new user management interface
- **Acquisition** - Book acquisition and procurement

### Tab Structure

#### Search Tab
- Search input with real-time search capability
- Results displayed as cards showing:
  - User avatar and name
  - Username and email
  - Card status badge
  - Quick "View Details" button

#### All Readers Tab
- Data table with columns:
  - User (avatar, name, username)
  - Contact (email, phone)
  - Card (type, ID)
  - Stats (borrowed count, infractions)
  - Status (color-coded badge)
  - Actions (View Details button)
- Status filter dropdown
- Refresh button
- Shows total count

### User Details Modal

When viewing a user's details, a modal displays:

#### Personal Information Section
- Full name, username
- Email, phone number
- Date of birth, age
- Address
- Gender

#### Reader Information Section (Blue background)
- **Statistics Cards:**
  - Total borrowed books
  - Infractions count
  - Card status
  
- **Card Details:**
  - Card type and ID
  - Registration date and office
  - Current status

- **Remove Ban Button:**
  - Only visible if card is Suspended or Blocked
  - Prompts for optional reason
  - Confirms before action

#### Currently Borrowed Books Section
- List of all active borrows with:
  - Book title and author
  - ISBN and publisher
  - Borrow date and due date
  - Overdue status (with days count)
  - Penalty information (if applicable)
  - Color-coded cards (red for overdue, white for on-time)

## Color Coding

### Card Status Colors
- **Active**: Green badge with checkmark icon
- **Suspended**: Yellow badge with warning icon
- **Blocked**: Red badge with ban icon
- **Expired**: Gray badge with clock icon

### Book Status Colors
- **On Time**: Green badge with checkmark
- **Overdue**: Red background card with warning badge

## Usage Guide

### Scenario 1: Finding a Specific User
1. Click on **User Management** in the navigation
2. Ensure you're on the **Search Users** tab
3. Enter username in the search box
4. Press Enter or click Search
5. Click on the user from search results

### Scenario 2: Reviewing All Suspended Users
1. Navigate to **User Management**
2. Click on **All Readers** tab
3. Select "Suspended" from the status filter dropdown
4. Review the list of suspended users
5. Click "View Details" on any user to see more information

### Scenario 3: Removing a Ban
1. Find and open the user's details (via search or list)
2. Verify their card shows "Suspended" or "Blocked" status
3. Review their current borrowed books
4. Click the "Remove Ban / Restore Access" button
5. Optionally enter a reason (e.g., "All books returned, fine paid")
6. Confirm the action
7. Card status updates to "Active" automatically

### Scenario 4: Checking User's Borrowed Books
1. Find the user via search or list
2. Open their details modal
3. Scroll to "Currently Borrowed Books" section
4. Review each book's status:
   - Check for overdue items (red cards)
   - View penalty information
   - Note due dates

## Technical Details

### Files Created/Modified

#### Backend Integration
- **Types**: `frontend/types.ts`
  - `UserInfo`, `UserBorrowedBook`, `ReaderListItem`
  - `ReadersListResponse`, `RemoveBanResponse`
  - `ReadingCardInfo`, `ReaderInfo`

- **API Service**: `frontend/services/api.ts`
  - `getUserInfo(userId)`
  - `getUserCurrentBorrows(userId)`
  - `removeBan(userId, reason?)`
  - `listReaders(statusFilter?, limit, offset)`
  - `searchUserByUsername(username)`

#### Frontend Components
- **Page**: `frontend/pages/UserManagement.tsx`
  - Main user management interface
  - Search and list functionality
  - User details modal
  - Ban removal workflow

- **Routing**: `frontend/App.tsx`
  - Added `/librarian/users` route
  - Protected route for librarians and managers

- **Navigation**: `frontend/components/Layout.tsx`
  - Added "User Management" link to librarian nav

### State Management

The component manages several state variables:
- `activeTab`: Current tab (search or list)
- `searchQuery`: Search input value
- `selectedUser`: Currently selected user for details view
- `userBorrows`: Borrowed books for selected user
- `searchResults`: Search results array
- `readersList`: All readers list
- `statusFilter`: Current status filter
- `pagination`: Pagination state
- `loading`: Loading indicator

### API Integration

All API calls use the centralized `api` service:
```typescript
// Search for users
const results = await api.searchUserByUsername(username);

// Get user details
const userInfo = await api.getUserInfo(userId);

// Get user's borrows
const borrows = await api.getUserCurrentBorrows(userId);

// Remove ban
const response = await api.removeBan(userId, reason);

// List readers with filters
const data = await api.listReaders(statusFilter, limit, offset);
```

### Error Handling

All operations include comprehensive error handling:
- Try-catch blocks around all API calls
- SweetAlert2 for user-friendly error messages
- Loading states during operations
- Graceful degradation for missing data

## Dependencies

### Required Libraries
- **React**: Core framework
- **react-router-dom**: Navigation and routing
- **lucide-react**: Icon library
- **sweetalert2**: Alert and confirmation dialogs
- **Tailwind CSS**: Styling

### Icons Used
- `Search`, `User`, `BookOpen`, `AlertCircle`, `CheckCircle`
- `XCircle`, `Clock`, `Mail`, `Phone`, `MapPin`
- `Calendar`, `CreditCard`, `Shield`, `Ban`, `RefreshCw`
- `X`, `AlertTriangle`

## Responsive Design

The interface is fully responsive:
- **Desktop**: Full table layout with all columns
- **Tablet**: Adjusted spacing and column widths
- **Mobile**: 
  - Stacked layout for user cards
  - Scrollable tables
  - Touch-friendly buttons
  - Modal adjusted for small screens

## Performance Considerations

- **Lazy Loading**: Details loaded only when user clicks
- **Pagination**: Lists limited to 50 items by default
- **Debounced Search**: Could be added for better performance
- **Parallel Loading**: User info and borrows loaded simultaneously
- **Optimistic Updates**: UI updates immediately after actions

## Future Enhancements

Potential improvements:
1. **Export Functionality**: Export user lists to CSV/Excel
2. **Bulk Actions**: Select multiple users for bulk operations
3. **Advanced Filters**: Filter by infraction count, borrowed count, etc.
4. **User Notes**: Add notes/comments about users
5. **Email Integration**: Send notifications to users
6. **Activity Log**: Track all librarian actions
7. **Statistics Dashboard**: Overview of user metrics
8. **Print View**: Print-friendly user reports

## Testing the Frontend

### Local Development
```bash
cd frontend
npm install
npm run dev
```

### Access the Page
1. Login as a librarian
2. Navigate to "User Management" in the top navigation
3. The page should load at `/#/librarian/users`

### Test Scenarios
1. **Search Test**: Search for "john" or any username
2. **List Test**: View all readers, apply different filters
3. **Details Test**: Click on any user to view details
4. **Ban Removal Test**: Find a suspended user and remove ban
5. **Refresh Test**: Use refresh button to reload data

## Security

- **Route Protection**: Only librarians and managers can access
- **Token Validation**: All API calls include JWT token
- **Role Verification**: Backend validates librarian role
- **Error Messages**: Generic messages, no sensitive data exposed
- **XSS Prevention**: React's built-in protection
- **CSRF Protection**: Token-based authentication

## Accessibility

- Semantic HTML elements
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Color contrast meets WCAG standards
- Focus indicators on interactive elements

## Browser Support

Tested and working on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### User Details Not Loading
- Check browser console for errors
- Verify API endpoint is accessible
- Ensure JWT token is valid
- Check user ID format

### Ban Removal Not Working
- Verify user's card is actually Suspended or Blocked
- Check if user has overdue books (might auto-suspend again)
- Review backend logs for errors

### Search Not Finding Users
- Try exact username match first
- Check if user exists in database
- Verify search is case-insensitive
- Look for typos

### Styling Issues
- Clear browser cache
- Verify Tailwind CSS is loaded
- Check for conflicting CSS
- Ensure all icons are imported correctly
