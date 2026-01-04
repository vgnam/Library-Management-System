import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemStatistics, LibrarianInfo, CreateLibrarianRequest } from '../types';
import { Button } from '../components/Button';
import Swal from 'sweetalert2';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export const ManagerDashboard: React.FC = () => {
  const [statistics, setStatistics] = useState<SystemStatistics | null>(null);
  const [librarians, setLibrarians] = useState<LibrarianInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'statistics' | 'librarians'>('statistics');
  
  // Create librarian form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateLibrarianRequest>({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone_number: '',
    years_of_experience: 0
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'statistics') {
        const stats = await api.getSystemStatistics();
        setStatistics(stats);
      } else {
        const libs = await api.listLibrarians();
        setLibrarians(libs);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const result = await api.createLibrarian(createFormData);
      setCreateSuccess(result.message);
      
      // Reset form
      setCreateFormData({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone_number: '',
        years_of_experience: 0
      });
      
      // Reload librarians list
      setTimeout(() => {
        setShowCreateForm(false);
        setCreateSuccess(null);
        loadData();
      }, 2000);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create librarian');
    }
  };

  const handleDeleteLibrarian = async (libId: string, username: string) => {
    const result = await Swal.fire({
      title: 'Delete Librarian?',
      html: `Are you sure you want to delete librarian <strong>${username}</strong>?<br><br><span style="color: #dc2626; font-size: 0.875rem;">This action cannot be undone.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await api.deleteLibrarian(libId);
      
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: response.message,
        timer: 2000,
        showConfirmButton: false
      });
      
      loadData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: err.message || 'Failed to delete librarian'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600 mt-2">System overview and management</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('statistics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'statistics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            System Statistics
          </button>
          <button
            onClick={() => setActiveTab('librarians')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'librarians'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manage Librarians
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && statistics && (
        <div className="space-y-6">
          {/* Cards Statistics with Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Reading Cards</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  title="Total Issued"
                  value={statistics.cards.total_issued}
                  color="blue"
                />
                <StatCard
                  title="Active"
                  value={statistics.cards.active}
                  color="green"
                />
                <StatCard
                  title="Suspended"
                  value={statistics.cards.suspended}
                  color="yellow"
                />
                <StatCard
                  title="Blocked"
                  value={statistics.cards.blocked}
                  color="red"
                />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: statistics.cards.active },
                        { name: 'Suspended', value: statistics.cards.suspended },
                        { name: 'Blocked', value: statistics.cards.blocked }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Users Statistics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Users</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Total Readers"
                value={statistics.users.total_readers}
                color="blue"
              />
              <StatCard
                title="Total Librarians"
                value={statistics.users.total_librarians}
                color="purple"
              />
            </div>
          </div>

          {/* Borrowing Statistics with Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Borrowing Frequency</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Total Borrows"
                    value={statistics.borrowing.total_borrows}
                    color="blue"
                  />
                  <StatCard
                    title="Active"
                    value={statistics.borrowing.active_borrows}
                    color="green"
                  />
                  <StatCard
                    title="Overdue"
                    value={statistics.borrowing.overdue_borrows}
                    color="red"
                  />
                  <StatCard
                    title="Returned"
                    value={statistics.borrowing.returned_borrows}
                    color="gray"
                  />
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-700">
                    Return Rate: <span className="font-semibold">{statistics.borrowing.return_rate}%</span>
                  </p>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Active', value: statistics.borrowing.active_borrows, fill: '#10b981' },
                      { name: 'Overdue', value: statistics.borrowing.overdue_borrows, fill: '#ef4444' },
                      { name: 'Returned', value: statistics.borrowing.returned_borrows, fill: '#6b7280' }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8">
                      {[
                        { name: 'Active', value: statistics.borrowing.active_borrows, fill: '#10b981' },
                        { name: 'Overdue', value: statistics.borrowing.overdue_borrows, fill: '#ef4444' },
                        { name: 'Returned', value: statistics.borrowing.returned_borrows, fill: '#6b7280' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Infractions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Infractions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Total Infractions"
                value={statistics.infractions.total_infractions}
                color="red"
              />
              <StatCard
                title="Readers with Infractions"
                value={statistics.infractions.readers_with_infractions}
                color="orange"
              />
              <StatCard
                title="Average per Reader"
                value={statistics.infractions.average_per_reader.toFixed(2)}
                color="yellow"
              />
            </div>
          </div>

          {/* Penalties with Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Penalties</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatCard
                    title="Total Penalties"
                    value={statistics.penalties.total_penalties}
                    color="red"
                  />
                  <StatCard
                    title="Unpaid Penalties"
                    value={statistics.penalties.unpaid_penalties}
                    color="orange"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Total Penalty Amount</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statistics.penalties.total_amount.toLocaleString('vi-VN')} VND
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded">
                    <p className="text-sm text-gray-600">Unpaid Amount</p>
                    <p className="text-2xl font-semibold text-red-600">
                      {statistics.penalties.unpaid_amount.toLocaleString('vi-VN')} VND
                    </p>
                  </div>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { 
                          name: 'Paid', 
                          value: statistics.penalties.total_penalties - statistics.penalties.unpaid_penalties,
                          amount: statistics.penalties.total_amount - statistics.penalties.unpaid_amount
                        },
                        { 
                          name: 'Unpaid', 
                          value: statistics.penalties.unpaid_penalties,
                          amount: statistics.penalties.unpaid_amount
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent, value }) => 
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: string, props: any) => [
                        `${value} penalties (${props.payload.amount.toLocaleString('vi-VN')} VND)`,
                        name
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Reading Trends with Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Reading Trends (Last 30 Days)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <StatCard
                title="Recent Borrows"
                value={statistics.trends.recent_borrows_30_days}
                color="blue"
              />
              <StatCard
                title="Average per Day"
                value={statistics.trends.avg_borrows_per_day.toFixed(2)}
                color="green"
              />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statistics.trends.daily_borrows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Borrows" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Librarians Tab */}
      {activeTab === 'librarians' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Librarian Accounts</h2>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? 'Cancel' : 'Create New Librarian'}
            </Button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Librarian</h3>
              
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {createError}
                </div>
              )}

              {createSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                  {createSuccess}
                </div>
              )}

              <form onSubmit={handleCreateLibrarian} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={50}
                      value={createFormData.username}
                      onChange={(e) => setCreateFormData({ ...createFormData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={createFormData.password}
                      onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={createFormData.full_name}
                      onChange={(e) => setCreateFormData({ ...createFormData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={createFormData.email}
                      onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={createFormData.phone_number}
                      onChange={(e) => setCreateFormData({ ...createFormData, phone_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={createFormData.years_of_experience}
                      onChange={(e) => setCreateFormData({ ...createFormData, years_of_experience: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button type="button" onClick={() => setShowCreateForm(false)} className="bg-gray-500 hover:bg-gray-600">
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Librarian
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Librarians List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experience
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Borrow Slips
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {librarians.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No librarians found
                    </td>
                  </tr>
                ) : (
                  librarians.map((lib) => (
                    <tr key={lib.lib_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {lib.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lib.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lib.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lib.years_of_experience} years
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lib.total_borrow_slips}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDeleteLibrarian(lib.lib_id, lib.username)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for statistics cards
interface StatCardProps {
  title: string;
  value: number | string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
    gray: 'bg-gray-50 text-gray-700',
  };

  return (
    <div className={`${colorClasses[color]} p-4 rounded-lg`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
};
