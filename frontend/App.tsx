import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { BookSearch } from './pages/BookSearch';
import { LibrarianDashboard } from './pages/LibrarianDashboard';
import { BorrowHistory } from './pages/BorrowHistory';
import { api } from './services/api';
import { UserRole } from './types';

// Simple Route Guard
const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles?: UserRole[] }) => {
  const token = api.getToken();
  const userRole = localStorage.getItem('userRole') as UserRole;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Main App Routes */}
          
          {/* Root now points to BookSearch for Readers */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={[UserRole.READER]}>
              <BookSearch />
            </ProtectedRoute>
          } />

          {/* Keep /books as an alias or redirect to / */}
          <Route path="/books" element={<Navigate to="/" replace />} />
          
          <Route path="/borrow-history" element={
            <ProtectedRoute allowedRoles={[UserRole.READER]}>
              <BorrowHistory />
            </ProtectedRoute>
          } />

          {/* Librarian Routes */}
          <Route path="/librarian/dashboard" element={
             <ProtectedRoute allowedRoles={[UserRole.LIBRARIAN, UserRole.MANAGER]}>
              <LibrarianDashboard />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;