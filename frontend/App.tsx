
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { BookSearch } from './pages/BookSearch';
import { LibrarianDashboard } from './pages/LibrarianDashboard';
import { BorrowHistory } from './pages/BorrowHistory';
import { ReturnBook } from './pages/ReturnBook';
import { ReaderReturnRequest } from './pages/ReaderReturnRequest';
import { BookAcquisition } from './pages/BookAcquisition';
import { api } from './services/api';
import { UserRole } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';

// Simple Route Guard
const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles?: UserRole[] }) => {
  const token = api.getToken();
  const userRole = localStorage.getItem('userRole') as UserRole;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Instead of hard redirect to /, redirect based on role to avoid loops
    if (userRole === UserRole.LIBRARIAN || userRole === UserRole.MANAGER) {
      return <Navigate to="/librarian/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Smart Redirect for Root Path
const RootRedirect = () => {
  const token = api.getToken();
  const userRole = localStorage.getItem('userRole') as UserRole;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (userRole === UserRole.LIBRARIAN || userRole === UserRole.MANAGER) {
    return <Navigate to="/librarian/dashboard" replace />;
  }

  // Readers go to BookSearch
  return <BookSearch />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Root Route - Smart Redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Reader Routes */}
            <Route path="/books" element={<Navigate to="/" replace />} />

            <Route path="/borrow-history" element={
              <ProtectedRoute allowedRoles={[UserRole.READER]}>
                <BorrowHistory />
              </ProtectedRoute>
            } />

            <Route path="/return-request" element={
              <ProtectedRoute allowedRoles={[UserRole.READER]}>
                <ReaderReturnRequest />
              </ProtectedRoute>
            } />

            {/* Librarian Routes */}
            <Route path="/librarian/dashboard" element={
              <ProtectedRoute allowedRoles={[UserRole.LIBRARIAN, UserRole.MANAGER]}>
                <LibrarianDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/librarian/return" element={
              <ProtectedRoute allowedRoles={[UserRole.LIBRARIAN, UserRole.MANAGER]}>
                <ReturnBook />
              </ProtectedRoute>
            } />

            <Route path="/acquisition" element={
              <ProtectedRoute allowedRoles={[UserRole.LIBRARIAN, UserRole.MANAGER]}>
                <BookAcquisition />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
