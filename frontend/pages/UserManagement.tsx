import React, { useState, useEffect } from 'react';
import Fuse from 'fuse.js';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { 
  Search, 
  User, 
  BookOpen, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard,
  Shield,
  Ban,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react';
import { UserInfo, UserBorrowedBook, ReaderListItem, CardStatus, UserBorrowHistoryRecord, UserBorrowHistoryResponse } from '../types';
import Swal from 'sweetalert2';

export const UserManagement: React.FC = () => {
  const [detailsTab, setDetailsTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userBorrows, setUserBorrows] = useState<UserBorrowedBook[]>([]);
  const [userHistory, setUserHistory] = useState<UserBorrowHistoryRecord[]>([]);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, pageSize: 20, totalPages: 1, totalCount: 0 });
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [readersList, setReadersList] = useState<ReaderListItem[]>([]);
  const [allReaders, setAllReaders] = useState<ReaderListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

  useEffect(() => {
    loadReadersList();
  }, [statusFilter]);

  const loadReadersList = async (search: string = '') => {
    setLoading(true);
    try {
      // Load all readers with status filter if not already loaded or filter changed
      if (allReaders.length === 0 || !search.trim()) {
        const response = await api.listReaders(statusFilter, 500, 0); // Load readers for fuzzy search (max 500)
        setAllReaders(response.readers);
        
        if (!search.trim()) {
          setReadersList(response.readers);
          setPagination({ ...pagination, total: response.total });
          setLoading(false);
          return;
        }
      }
      
      // Perform fuzzy search
      if (search.trim()) {
        const fuse = new Fuse(allReaders.length > 0 ? allReaders : readersList, {
          keys: [
            { name: 'username', weight: 2 },
            { name: 'full_name', weight: 1.5 },
            { name: 'email', weight: 1 },
            { name: 'card_id', weight: 1 }
          ],
          threshold: 0.4, // Lower is more strict (0.0 = exact match, 1.0 = match anything)
          includeScore: true,
          minMatchCharLength: 2,
          ignoreLocation: true
        });
        
        const results = fuse.search(search);
        const readers = results.map(result => result.item);
        
        if (readers.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'No Results',
            text: 'No readers found matching your search',
            timer: 2000,
            showConfirmButton: false
          });
        }
        
        setReadersList(readers);
        setPagination({ ...pagination, total: readers.length });
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load readers list'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    await loadReadersList(searchQuery);
  };

  const handleViewUserDetails = async (userId: string) => {
    setLoading(true);
    setDetailsTab('current'); // Reset to current tab when viewing a new user
    try {
      const [userInfo, borrows] = await Promise.all([
        api.getUserInfo(userId),
        api.getUserCurrentBorrows(userId)
      ]);
      
      setSelectedUser(userInfo);
      setUserBorrows(borrows);
      setUserHistory([]); // Clear previous history
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load user details'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserHistory = async (page: number = 1) => {
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const response = await api.getUserBorrowHistory(
        selectedUser.user_id,
        historyStatusFilter,
        page,
        historyPagination.pageSize
      );
      
      setUserHistory(response.history);
      setHistoryPagination({
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
        totalCount: response.total_count
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load borrow history'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load history when switching to history tab
  useEffect(() => {
    if (detailsTab === 'history' && selectedUser && userHistory.length === 0) {
      loadUserHistory();
    }
  }, [detailsTab, selectedUser]);

  // Reload history when filter changes
  useEffect(() => {
    if (detailsTab === 'history' && selectedUser) {
      loadUserHistory(1);
    }
  }, [historyStatusFilter]);

  const handleRemoveBan = async () => {
    if (!selectedUser) return;

    const cardStatus = selectedUser.reader_info?.reading_card?.status;
    if (cardStatus !== CardStatus.SUSPENDED && cardStatus !== CardStatus.BLOCKED) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Remove Ban',
        text: `User's card is not banned or suspended. Current status: ${cardStatus}`
      });
      return;
    }

    const { value: reason } = await Swal.fire({
      title: 'Remove Ban',
      input: 'textarea',
      inputLabel: 'Reason for removing ban (optional)',
      inputPlaceholder: 'Enter reason...',
      showCancelButton: true,
      confirmButtonText: 'Remove Ban',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancel'
    });

    if (reason === undefined) return; // User cancelled

    setLoading(true);
    try {
      const response = await api.removeBan(selectedUser.user_id, reason || undefined);
      
      Swal.fire({
        icon: 'success',
        title: 'Ban Removed',
        text: response.message,
        timer: 2000,
        showConfirmButton: false
      });

      // Refresh user info
      await handleViewUserDetails(selectedUser.user_id);
      
      // Refresh list
      setSearchQuery('');
      setAllReaders([]); // Force reload
      await loadReadersList();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: error.message || 'Failed to remove ban'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case CardStatus.ACTIVE:
        return 'text-green-600 bg-green-100';
      case CardStatus.SUSPENDED:
        return 'text-yellow-600 bg-yellow-100';
      case CardStatus.BLOCKED:
        return 'text-red-600 bg-red-100';
      case CardStatus.EXPIRED:
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case CardStatus.ACTIVE:
        return <CheckCircle className="w-4 h-4" />;
      case CardStatus.SUSPENDED:
        return <AlertTriangle className="w-4 h-4" />;
      case CardStatus.BLOCKED:
        return <Ban className="w-4 h-4" />;
      case CardStatus.EXPIRED:
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          Reader Management
        </h1>
        <p className="text-gray-600">Search readers, view information, borrowed books, and manage bans</p>
      </div>

      {/* All Readers Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search readers by username..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {searchQuery ? `Search Results (${pagination.total})` : `All Readers (${pagination.total})`}
          </h2>
          <div className="flex items-center gap-4">
            {!searchQuery && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
                <option value="expired">Expired</option>
              </select>
            )}
            <Button
              onClick={() => {
                setSearchQuery('');
                setAllReaders([]); // Force reload
                loadReadersList();
              }}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Card
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Borrowed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Infractions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {readersList.map((reader) => (
                    <tr key={reader.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-100 rounded-full p-2 mr-3">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{reader.full_name}</div>
                            <div className="text-xs text-gray-500">@{reader.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{reader.email}</div>
                        <div className="text-xs text-gray-500">{reader.phone_number || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{reader.card_type}</div>
                        <div className="text-xs text-gray-500">{reader.card_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <BookOpen className="w-4 h-4 inline mr-1" />
                          {reader.currently_borrowed || 0} active
                        </div>
                        <div className="text-xs text-gray-500">
                          {reader.total_borrowed} total
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {reader.infraction_count} infractions
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(reader.card_status)}`}>
                          {getStatusIcon(reader.card_status)}
                          <span className="ml-1">{reader.card_status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          size="sm"
                          onClick={() => handleViewUserDetails(reader.user_id)}
                          disabled={loading}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {readersList.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                No readers found
              </div>
            )}
          </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                User Details
              </h2>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserBorrows([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* User Info Section */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-gray-900">{selectedUser.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Username</label>
                    <p className="text-gray-900">@{selectedUser.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      Email
                    </label>
                    <p className="text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      Phone
                    </label>
                    <p className="text-gray-900">{selectedUser.phone_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Date of Birth
                    </label>
                    <p className="text-gray-900">{selectedUser.dob || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Age</label>
                    <p className="text-gray-900">{selectedUser.age || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Address
                    </label>
                    <p className="text-gray-900">{selectedUser.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Reader Info Section */}
              {selectedUser.reader_info && (
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Reader Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Total Borrowed</label>
                      <p className="text-2xl font-bold text-blue-600">{selectedUser.reader_info.total_borrowed}</p>
                      <p className="text-xs text-gray-500">Lifetime total</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Currently Borrowed</label>
                      <p className="text-2xl font-bold text-green-600">{selectedUser.reader_info.currently_borrowed || 0}</p>
                      <p className="text-xs text-gray-500">Active loans</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Infractions</label>
                      <p className={`text-2xl font-bold ${selectedUser.reader_info.infraction_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedUser.reader_info.infraction_count}
                      </p>
                      <p className="text-xs text-gray-500">Violations</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Card Status</label>
                      <div className="mt-1">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 inline-flex ${getStatusColor(selectedUser.reader_info.reading_card?.status || '')}`}>
                          {getStatusIcon(selectedUser.reader_info.reading_card?.status || '')}
                          {selectedUser.reader_info.reading_card?.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedUser.reader_info.reading_card && (
                    <div className="border-t border-blue-200 pt-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Card Type</label>
                          <p className="text-gray-900">{selectedUser.reader_info.reading_card.card_type}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Card ID</label>
                          <p className="text-gray-900">{selectedUser.reader_info.reading_card.card_id}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Register Date</label>
                          <p className="text-gray-900">{selectedUser.reader_info.reading_card.register_date}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Register Office</label>
                          <p className="text-gray-900">{selectedUser.reader_info.reading_card.register_office}</p>
                        </div>
                      </div>

                      {/* Remove Ban Button */}
                      {(selectedUser.reader_info.reading_card.status === CardStatus.SUSPENDED ||
                        selectedUser.reader_info.reading_card.status === CardStatus.BLOCKED) && (
                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <Button
                            onClick={handleRemoveBan}
                            disabled={loading}
                            variant="primary"
                            className="w-full flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {selectedUser.reader_info.reading_card.status === CardStatus.BLOCKED 
                              ? 'Unblock Reader' 
                              : 'Remove Suspension'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Borrowed Books Section with Tabs */}
              <div className="bg-white rounded-lg border border-gray-200">
                {/* Sub-tabs for Current vs History */}
                <div className="border-b border-gray-200 px-6 pt-4">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setDetailsTab('current')}
                      className={`${
                        detailsTab === 'current'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <BookOpen className="w-4 h-4" />
                      Currently Borrowed ({userBorrows.length})
                    </button>
                    <button
                      onClick={() => setDetailsTab('history')}
                      className={`${
                        detailsTab === 'history'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <Clock className="w-4 h-4" />
                      Borrow History
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  {/* Current Borrows Tab */}
                  {detailsTab === 'current' && (
                    <>
                      {userBorrows.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No books currently borrowed
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {userBorrows.map((borrow) => (
                            <div
                              key={borrow.borrow_detail_id}
                              className={`border rounded-lg p-4 ${
                                borrow.is_overdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900 mb-1">{borrow.title}</h4>
                                  <p className="text-sm text-gray-600 mb-2">by {borrow.author}</p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-600">ISBN:</span> {borrow.isbn}
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Publisher:</span> {borrow.publisher || 'N/A'}
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Category:</span> {borrow.category || 'N/A'}
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Borrowed:</span> {new Date(borrow.borrow_date).toLocaleDateString()}
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Due:</span> {borrow.due_date ? new Date(borrow.due_date).toLocaleDateString() : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  {borrow.is_overdue ? (
                                    <div className="text-right">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <AlertTriangle className="w-4 h-4 mr-1" />
                                        {borrow.days_overdue} days overdue
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      On time
                                    </span>
                                  )}
                                </div>
                              </div>

                              {borrow.penalty && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center gap-2 text-sm">
                                    <AlertCircle className="w-4 h-4 text-orange-600" />
                                    <span className="font-medium text-orange-600">Penalty:</span>
                                    <span className="text-gray-700">{borrow.penalty.penalty_type} - {borrow.penalty.description}</span>
                                    <span className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                                      borrow.penalty.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {borrow.penalty.status}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* History Tab */}
                  {detailsTab === 'history' && (
                    <>
                      {/* Status Filter */}
                      <div className="mb-4 flex justify-between items-center">
                        <select
                          value={historyStatusFilter}
                          onChange={(e) => setHistoryStatusFilter(e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="returned">Returned</option>
                          <option value="overdue">Overdue</option>
                          <option value="pending">Pending</option>
                          <option value="rejected">Rejected</option>
                          <option value="lost">Lost</option>
                        </select>
                        <p className="text-sm text-gray-500">
                          Total: {historyPagination.totalCount} records
                        </p>
                      </div>

                      {loading && userHistory.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-4">Loading history...</p>
                        </div>
                      ) : userHistory.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No borrow history found
                        </div>
                      ) : (
                        <>
                          <div className="space-y-4 mb-4">
                            {userHistory.map((record) => (
                              <div
                                key={record.borrow_detail_id}
                                className={`border rounded-lg p-4 ${
                                  record.is_overdue && record.status === 'Active'
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-gray-900">{record.book_name}</h4>
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        record.status === 'Returned' ? 'bg-green-100 text-green-800' :
                                        record.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                                        record.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                        record.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                        record.status === 'Lost' ? 'bg-gray-100 text-gray-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {record.status}
                                      </span>
                                    </div>
                                    {record.author && (
                                      <p className="text-sm text-gray-600 mb-2">by {record.author}</p>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                      <div>
                                        <span className="text-gray-600">Borrowed:</span>{' '}
                                        {record.borrow_date ? new Date(record.borrow_date).toLocaleDateString() : 'N/A'}
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Due Date:</span>{' '}
                                        {record.due_date ? new Date(record.due_date).toLocaleDateString() : 'N/A'}
                                      </div>
                                      {record.actual_return_date && (
                                        <div>
                                          <span className="text-gray-600">Returned:</span>{' '}
                                          {new Date(record.actual_return_date).toLocaleDateString()}
                                        </div>
                                      )}
                                      {record.category && (
                                        <div>
                                          <span className="text-gray-600">Category:</span> {record.category}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {record.is_overdue && record.status === 'Active' && (
                                    <div className="ml-4">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        <AlertTriangle className="w-4 h-4 mr-1" />
                                        Overdue
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {record.penalty && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-sm">
                                      <AlertCircle className="w-4 h-4 text-orange-600" />
                                      <span className="font-medium text-orange-600">Penalty:</span>
                                      <span className="text-gray-700">
                                        {record.penalty.penalty_type} - {record.penalty.description}
                                      </span>
                                      <span className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
                                        record.penalty.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {record.penalty.status}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Pagination */}
                          {historyPagination.totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-6">
                              <Button
                                onClick={() => loadUserHistory(historyPagination.page - 1)}
                                disabled={historyPagination.page === 1 || loading}
                                variant="outline"
                                size="sm"
                              >
                                Previous
                              </Button>
                              <span className="text-sm text-gray-600">
                                Page {historyPagination.page} of {historyPagination.totalPages}
                              </span>
                              <Button
                                onClick={() => loadUserHistory(historyPagination.page + 1)}
                                disabled={historyPagination.page >= historyPagination.totalPages || loading}
                                variant="outline"
                                size="sm"
                              >
                                Next
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
