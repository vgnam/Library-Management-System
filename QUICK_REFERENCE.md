# User Management System - Quick Reference

## 🎯 Features Summary

### Backend API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/librarian/users/{user_id}` | GET | Get user information |
| `/api/librarian/users/{user_id}/current-borrows` | GET | Get user's borrowed books |
| `/api/librarian/users/{user_id}/remove-ban` | POST | Remove ban/suspension |
| `/api/librarian/readers` | GET | List all readers (with filters) |
| `/api/librarian/users/search/{username}` | GET | Search users by username |

### Frontend Route
- **URL**: `/#/librarian/users`
- **Access**: Librarians and Managers only

## 🚀 Quick Start

### For Librarians:
1. Login to the system
2. Click **"User Management"** in the navigation bar
3. Choose your workflow:
   - **Search Tab**: Find specific users
   - **All Readers Tab**: Browse all users with filters

## 📊 User Management Workflows

### Workflow 1: Search and View User
```
Search Users Tab → Enter Username → Click User → View Details
```

### Workflow 2: Review Suspended Users
```
All Readers Tab → Filter: "Suspended" → View List → Click "View Details"
```

### Workflow 3: Remove User Ban
```
Find User → View Details → Click "Remove Ban" → Enter Reason → Confirm
```

### Workflow 4: Check User's Books
```
Find User → View Details → Scroll to "Currently Borrowed Books" → Review List
```

## 🎨 Visual Elements

### Card Status Badges
- 🟢 **Active** - Green badge, user can borrow
- 🟡 **Suspended** - Yellow badge, temporarily banned
- 🔴 **Blocked** - Red badge, permanently banned
- ⚫ **Expired** - Gray badge, card expired

### Book Status Cards
- ✅ **On Time** - White background, green badge
- ⚠️ **Overdue** - Red background, warning badge with days count

## 💡 Key Features

### Search Tab
- ✓ Real-time username search
- ✓ Partial matching supported
- ✓ Shows card status at a glance
- ✓ Click to view full details

### All Readers Tab
- ✓ Paginated list (50 per page)
- ✓ Filter by status
- ✓ Shows borrowing statistics
- ✓ Infraction counts visible
- ✓ One-click refresh

### User Details Modal
- ✓ Personal information
- ✓ Contact details
- ✓ Reader statistics
- ✓ Card information
- ✓ Currently borrowed books
- ✓ Overdue indicators
- ✓ Penalty information
- ✓ Remove ban button

## 🔧 Technical Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL/MySQL (via SQLAlchemy)
- **Authentication**: JWT tokens
- **Service Layer**: `srv_librarian_management.py`
- **API Layer**: `api_librarian_management.py`

### Frontend
- **Framework**: React + TypeScript
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Alerts**: SweetAlert2
- **State**: React Hooks

## 📝 Important Notes

### Permissions
- ✅ Librarians can access all features
- ✅ Managers can access all features
- ❌ Readers cannot access this page

### Ban Removal Rules
- Can only remove bans from Suspended or Blocked cards
- Cannot remove ban from Active or Expired cards
- Reason is optional but recommended
- Action is logged for audit purposes

### Data Refresh
- Search results: Manual refresh required
- Reader list: Auto-refresh on filter change
- User details: Refreshes after ban removal
- Background updates: Not implemented yet

## 🐛 Common Issues & Solutions

### Issue: "User not found"
**Solution**: Verify the user ID or username is correct

### Issue: "Cannot remove ban - not banned"
**Solution**: Check current card status; only Suspended/Blocked can be unbanned

### Issue: "Session expired"
**Solution**: Login again; JWT token may have expired

### Issue: Search returns no results
**Solution**: Try partial username; check spelling

### Issue: Details not loading
**Solution**: Check network tab; verify API is running

## 📱 Mobile Support

The interface is fully responsive:
- Hamburger menu for navigation
- Stacked cards on mobile
- Scrollable tables
- Touch-friendly buttons
- Full-screen modals

## 🔐 Security Features

- JWT-based authentication
- Role-based access control
- Input validation
- SQL injection prevention
- XSS protection
- Error message sanitization

## 📈 Performance

- Pagination limits database load
- Lazy loading of user details
- Parallel API calls where possible
- Efficient state management
- Optimized re-renders

## 🎓 For Developers

### Adding New Features

1. **Backend**: Update `srv_librarian_management.py`
2. **API**: Add endpoint in `api_librarian_management.py`
3. **Types**: Define in `frontend/types.ts`
4. **Service**: Add method in `frontend/services/api.ts`
5. **UI**: Update `frontend/pages/UserManagement.tsx`

### File Locations
```
Backend:
  app/services/srv_librarian_management.py
  app/api/api_librarian_management.py
  app/api/api_router.py

Frontend:
  frontend/types.ts
  frontend/services/api.ts
  frontend/pages/UserManagement.tsx
  frontend/App.tsx
  frontend/components/Layout.tsx

Documentation:
  LIBRARIAN_USER_MANAGEMENT.md
  FRONTEND_USER_MANAGEMENT_GUIDE.md
  QUICK_REFERENCE.md (this file)
```

## 🎯 Testing Checklist

### Backend Testing
- [ ] Get user info API works
- [ ] Get user borrows API works
- [ ] Remove ban API works
- [ ] List readers API works with filters
- [ ] Search API works with partial match
- [ ] Authentication required
- [ ] Librarian role verified

### Frontend Testing
- [ ] Page loads correctly
- [ ] Search functionality works
- [ ] List displays with pagination
- [ ] Status filters work
- [ ] User details modal opens
- [ ] Ban removal workflow complete
- [ ] Error messages display correctly
- [ ] Loading states work
- [ ] Navigation works
- [ ] Mobile responsive

## 📞 Support

For issues or questions:
1. Check documentation files
2. Review error messages in browser console
3. Check backend logs
4. Verify API endpoints with Swagger UI at `/docs`

## 🎉 Success Criteria

You've successfully implemented the feature when:
- ✅ Librarians can search for any user
- ✅ Librarians can view all users in a filterable list
- ✅ Librarians can view detailed user information
- ✅ Librarians can see user's current borrowed books
- ✅ Librarians can remove bans with optional reason
- ✅ All operations are secure and role-protected
- ✅ UI is responsive and user-friendly
- ✅ Error handling is comprehensive
