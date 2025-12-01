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
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="bg-primary p-6 text-center">
          <BookOpen className="h-12 w-12 text-white mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-blue-100 mt-1">Sign in to access the National Library</p>
        </div>

        <div className="p-8">
          <div className="flex rounded-md bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setRole(UserRole.READER)}
              className={`flex-1 text-sm font-medium py-1.5 rounded-sm transition-all ${
                role === UserRole.READER ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Reader
            </button>
            <button
              onClick={() => setRole(UserRole.LIBRARIAN)}
              className={`flex-1 text-sm font-medium py-1.5 rounded-sm transition-all ${
                role === UserRole.LIBRARIAN ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Librarian
            </button>
            <button
              onClick={() => setRole(UserRole.MANAGER)}
              className={`flex-1 text-sm font-medium py-1.5 rounded-sm transition-all ${
                role === UserRole.MANAGER ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Manager
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none"
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={loading}>
              Sign In
            </Button>
          </form>
          
          {role === UserRole.READER && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  Register here
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};