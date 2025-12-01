import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Check, X, RefreshCw, Book, Calendar, User } from 'lucide-react';
import { BorrowRequest, BorrowStatus } from '../types';

export const LibrarianDashboard: React.FC = () => {
  const [manualId, setManualId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setRefreshing(true);
    try {
      const data = await api.getPendingRequests();
      setRequests(data);
    } catch (err: any) {
      console.warn("Failed to fetch requests (API might be missing):", err);
      setRequests([]); 
    } finally {
      setRefreshing(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;

    setLoading(true);
    setMessage(null);
    try {
      if (action === 'approve') {
        await api.approveRequest(id);
        setMessage({ type: 'success', text: `Request approved successfully.` });
      } else {
        await api.rejectRequest(id);
        setMessage({ type: 'success', text: `Request rejected.` });
      }
      
      // Refresh list after action
      fetchRequests();
      if (manualId === id) setManualId('');
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || `Failed to ${action} request.` });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: BorrowStatus) => {
    switch (status) {
      case BorrowStatus.PENDING:
        return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">PENDING</span>;
      case BorrowStatus.ACTIVE:
        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">ACTIVE</span>;
      case BorrowStatus.REJECTED:
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">REJECTED</span>;
      case BorrowStatus.RETURNED:
        return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">RETURNED</span>;
      case BorrowStatus.OVERDUE:
        return <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">OVERDUE</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Librarian Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage borrowing requests and returns</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-md border flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.type === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Manual Action Box */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Action</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Enter Borrow Slip ID manually..." 
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="flex-grow border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button onClick={() => handleAction(manualId, 'approve')} disabled={!manualId || loading}>Approve</Button>
            <Button onClick={() => handleAction(manualId, 'reject')} variant="danger" disabled={!manualId || loading}>Reject</Button>
          </div>
        </div>
      </div>

      {/* Pending Requests List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg">Pending Requests ({requests.length})</h3>
        
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
            {refreshing ? 'Loading requests...' : 'No pending requests found. Good job!'}
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => (
              <div key={req.borrow_slip_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 transition hover:shadow-md">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {/* Info Section */}
                  <div className="flex-grow space-y-3">
                    <div className="flex items-center gap-2">
                        {getStatusBadge(req.status)}
                        <span className="text-xs text-gray-400 font-mono">{req.borrow_slip_id}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{req.reader_name || 'Unknown Reader'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(req.request_date).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center gap-2 mb-2">
                             <Book className="h-4 w-4 text-gray-500" />
                             <span className="text-sm font-medium text-gray-900">Requested Books ({req.books_count}):</span>
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-600 pl-1">
                            {req.books && req.books.length > 0 ? (
                                req.books.map((book, idx) => (
                                    <li key={idx} className="truncate">{book.name || book.book_id}</li>
                                ))
                            ) : (
                                <li>{req.books_count} items (Details unavailable)</li>
                            )}
                        </ul>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="flex md:flex-col justify-end gap-2 md:w-32 md:border-l md:border-gray-100 md:pl-4">
                     <Button 
                        size="sm" 
                        onClick={() => handleAction(req.borrow_slip_id, 'approve')}
                        disabled={loading}
                        className="w-full justify-center bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger"
                        onClick={() => handleAction(req.borrow_slip_id, 'reject')}
                        disabled={loading}
                        className="w-full justify-center"
                      >
                        Reject
                      </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};