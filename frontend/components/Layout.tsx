import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, User as UserIcon, LogOut, Menu, X } from 'lucide-react';
import { api } from '../services/api';
import { UserRole } from '../types';
import { 
  Book, MapPin, Phone, Mail 
} from 'lucide-react';

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
                {/* Public navigation for guests */}
                {!token && (
                  <>
                    <NavLink to="/browse">Browse Books</NavLink>
                  </>
                )}
                {token && userRole === UserRole.READER && (
                  <>
                    <NavLink to="/">Browse Collection</NavLink>
                    <NavLink to="/borrow-history">My Loans</NavLink>
                    <NavLink to="/return-request">Return Books</NavLink>
                  </>
                )}
                {token && userRole === UserRole.LIBRARIAN && (
                   <>
                    <NavLink to="/librarian/dashboard">Request Management</NavLink>
                    <NavLink to="/user-management">User Management</NavLink>
                    <NavLink to="/librarian/books">Book Management</NavLink>
                    <NavLink to="/librarian/acquisition">Book Acquisition</NavLink>
                   </>
                )}
                {token && userRole === UserRole.MANAGER && (
                   <>
                    <NavLink to="/manager/dashboard">Manager Dashboard</NavLink>
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
                   <Link to="/librarian/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Request Management</Link>
                   <Link to="/user-management" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">User Management</Link>
                   <Link to="/librarian/books" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Book Management</Link>
                   <Link to="/librarian/acquisition" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Book Acquisition</Link>
                  </>
                )}
                {token && userRole === UserRole.MANAGER && (
                  <>
                   <Link to="/manager/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Manager Dashboard</Link>
                  </>
                )}
                {!token && (
                  <>
                    <Link to="/browse" className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700">Browse Books</Link>
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

      <footer className="bg-white border-t border-slate-100 pt-24 pb-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl"><Book className="w-7 h-7" /></div>
              <span className="text-2xl font-black tracking-tighter uppercase">National Library</span>
            </div>
          </div>
          <div>
            <h4 className="font-black text-slate-900 mb-8 uppercase text-xs tracking-[0.2em]">Services</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-bold">
              <li><a href="#" className="hover:text-blue-600 transition-colors">Quick Search</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Online Borrowing</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Library Regulations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-slate-900 mb-8 uppercase text-xs tracking-[0.2em]">Opening Hours</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-bold">
              <li className="flex justify-between"><span>Monday - Friday:</span> <span className="text-slate-900">08:00 - 20:00</span></li>
              <li className="flex justify-between"><span>Saturday:</span> <span className="text-slate-900">08:00 - 12:00</span></li>
              <li className="flex justify-between"><span>Sunday:</span> <span className="text-red-500 uppercase">Closed</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-slate-900 mb-8 uppercase text-xs tracking-[0.2em]">Contact Us</h4>
            <div className="space-y-5 text-sm text-slate-500 font-bold">
              <div className="flex gap-4"><MapPin className="w-5 h-5 text-blue-600 shrink-0" /> <span>Hanoi, Vietnam</span></div>
              <div className="flex gap-4"><Phone className="w-5 h-5 text-blue-600 shrink-0" /> <span>(028) 1234 5678</span></div>
              <div className="flex gap-4"><Mail className="w-5 h-5 text-blue-600 shrink-0" /> <span>support@national_library.vn</span></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};