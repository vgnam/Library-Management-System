import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { ReaderType, Gender } from '../types';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    dob: '',
    gender: Gender.MALE,
    phone: '',
    address: '',
    reader_type: ReaderType.STANDARD
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value as string);
      });

      await api.registerReader(data);
      // Automatically redirect to login on success
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-primary px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Create Reader Account</h2>
          <p className="text-blue-100 mt-1">Join the National Library today</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input name="full_name" type="text" required onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input name="username" type="text" required onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" required onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input name="password" type="password" required minLength={6} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" type="tel" onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input name="dob" type="date" onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select name="gender" onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none">
                <option value={Gender.MALE}>Male</option>
                <option value={Gender.FEMALE}>Female</option>
                <option value={Gender.OTHER}>Other</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input name="address" type="text" onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-primary focus:border-primary outline-none" />
            </div>

            <div className="md:col-span-2 bg-blue-50 p-4 rounded-md border border-blue-100">
               <label className="block text-sm font-medium text-gray-700 mb-2">Membership Type</label>
               <div className="flex gap-4">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" name="reader_type" value={ReaderType.STANDARD} defaultChecked onChange={handleChange} className="text-primary focus:ring-primary" />
                   <span className="font-medium">Standard</span>
                   <span className="text-xs text-gray-500">(5 books, 45 days)</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="radio" name="reader_type" value={ReaderType.VIP} onChange={handleChange} className="text-primary focus:ring-primary" />
                   <span className="font-medium">VIP</span>
                   <span className="text-xs text-gray-500">(8 books, 60 days, Rare access)</span>
                 </label>
               </div>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={loading}>Register</Button>
            <p className="text-center mt-4 text-sm text-gray-600">
              Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};