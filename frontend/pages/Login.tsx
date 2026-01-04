import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { UserRole } from '../types';
import { Button } from '../components/Button';
import { BookOpen } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(UserRole.READER);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(username, password, role);
      
      if (!response.access_token) {
        throw new Error("Invalid response from server: Missing access token");
      }

      api.setToken(response.access_token);
      localStorage.setItem('userRole', role);

      // Redirect based on role
      if (role === UserRole.LIBRARIAN) {
        navigate('/librarian/dashboard');
      } else if (role === UserRole.MANAGER) {
        navigate('/manager/dashboard');
      } else {
        // Reader goes to Browse Collection (Root)
        navigate('/');
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || 'Login failed. Please check your credentials and connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[700px]">
        
        {/* TRÁI: Library Image (Chỉ hiện trên màn hình lớn) */}
        <div className="hidden lg:block relative">
          <img 
            src="https://thuvienquocgia.vn/wp-content/uploads/2018/10/5-dieu-ban-doc-can-biet-ve-thu-vien-quoc-gia-viet-nam-1-3.jpg" 
            alt="Library"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay gradient đẹp hơn */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"></div>
          
          {/* Welcome Text Overlay */}
          <div className="absolute inset-0 flex items-center justify-center p-12 text-white text-center">
            <h2 className="text-5xl font-black mb-4 leading-tight">
              Welcome To<br />National Library
            </h2>
          </div>
        </div>
  
        {/* PHẢI: Login Form */}
        <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16 bg-white">
          <div className="w-full max-w-md mx-auto">
            {/* Header Form */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center mb-8">
                <h3 className="text-black text-2xl font-bold mt-2">
                  Sign in to access the National Library
                </h3>
              </div>
            </div>
  
            {/* Role Selector */}
            <div className="flex p-1.5 bg-gray-100 rounded-xl mb-8">
              {[
                { id: UserRole.READER, label: 'Reader' },
                { id: UserRole.LIBRARIAN, label: 'Librarian' },
                { id: UserRole.MANAGER, label: 'Manager' }
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    role === r.id 
                      ? 'bg-white text-primary shadow-md' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
  
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 animate-shake">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-gray-50"
                  placeholder="Enter your username"
                  required
                />
              </div>
  
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-gray-50"
                  placeholder="••••••••"
                  required
                />
              </div>
  
              <Button 
                type="submit" 
                className="w-full py-3 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform" 
                isLoading={loading}
              >
                Sign In
              </Button>
            </form>
            
            {role === UserRole.READER && (
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary font-bold hover:underline">
                    Create an account
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};