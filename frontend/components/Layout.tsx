
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, User as UserIcon, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { UserRole } from '../types';
import { AIChat } from './AIChat';

interface LayoutProps {
  children: React.ReactNode;
}

const NavLink = ({ to, children }: { to: string; children?: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-blue-800 text-white' 
          : 'text-blue-100 hover:bg-blue-700 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  const token = api.getToken();
  const userRole = localStorage.getItem('userRole') as UserRole | null;

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0 flex items-center gap-2">
                <div className="bg-white p-1 rounded-full">
                   <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <span className="text-white font-bold text-xl tracking-tight">National Library</span>
              </Link>
              
              <div className="hidden md:block ml-10 flex items-baseline space-x-4">
                {token && userRole === UserRole.READER && (
                  <>
                    <NavLink to="/">Browse Collection</NavLink>
                    <NavLink to="/borrow-history">My Loans</NavLink>
                    <NavLink to="/return-request">Return Books</NavLink>
                  </>
                )}
                {token && userRole === UserRole.LIBRARIAN && (
                   <>
                    <NavLink to="/librarian/dashboard">Dashboard</NavLink>
                    <NavLink to="/librarian/return">Return Books</NavLink>
                   </>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 space-x-4">
                {token ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                     <Link to="/login" className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium">Log in</Link>
                     <Link to="/register" className="bg-white text-primary hover:bg-blue-50 px-3 py-2 rounded-md text-sm font-medium">Register</Link>
                  </div>
                )}
              </div>
            </div>

            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-blue-200 hover:text-white hover:bg-blue-700 focus:outline-none"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
               {token && userRole === UserRole.READER && (
                  <>
                    <Link to="/" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Browse Collection</Link>
                    <Link to="/borrow-history" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">My Loans</Link>
                    <Link to="/return-request" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Return Books</Link>
                  </>
                )}
                {token && userRole === UserRole.LIBRARIAN && (
                  <>
                   <Link to="/librarian/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Dashboard</Link>
                   <Link to="/librarian/return" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Return Books</Link>
                  </>
                )}
                {!token && (
                  <>
                    <Link to="/login" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Login</Link>
                    <Link to="/register" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Register</Link>
                  </>
                )}
                {token && (
                   <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Sign Out</button>
                )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* AI Assistant FAB */}
      <div className="fixed bottom-6 right-6 z-50">
        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="bg-secondary hover:bg-yellow-500 text-white rounded-full p-4 shadow-xl transition-transform hover:scale-105 flex items-center justify-center"
          >
            <Sparkles className="h-6 w-6" />
          </button>
        )}
        {showChat && (
          <AIChat onClose={() => setShowChat(false)} />
        )}
      </div>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} National Library. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
