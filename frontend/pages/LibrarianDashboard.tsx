
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Check, X, RefreshCw, Book, Calendar, User, Clock, RotateCcw, AlertTriangle, AlertCircle } from 'lucide-react';
import { BorrowRequest, BorrowStatus, ReturnRequest } from '../types';
import Swal from 'sweetalert2';

export const LibrarianDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Data State
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'borrow') {
        const data = await api.getPendingRequests();
        setBorrowRequests(data);
      } else {
        const data = await api.getReturnRequests();
        setReturnRequests(data);
      }
    } catch (err: any) {
      console.warn("Failed to fetch requests:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproveReject = async (id: string, action: 'approve' | 'reject') => {  
    setLoading(true);
    setMessage(null);
    try {
      if (action === 'approve') {
        await api.approveRequest(id);
      } else {
        await api.rejectRequest(id);
      }
      fetchData();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err.message || `Failed to ${action} request.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReturn = async (returnReq: ReturnRequest) => {
    // Tính toán penalty nếu overdue
    const today = new Date();
    const dueDate = returnReq.due_date ? new Date(returnReq.due_date) : null;
    let penaltyInfo = '';
    
    if (dueDate && today > dueDate) {
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const lateFee = daysOverdue * 5000;
      penaltyInfo = `<br><span style="color: #dc2626; font-weight: 600;">Late Fee: ${lateFee.toLocaleString('vi-VN')} VND (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)</span>`;
    }
  
    const result = await Swal.fire({
      title: 'Confirm Return',
      html: `Mark "${returnReq.book_title}" as Returned (Good Condition)${penaltyInfo}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, mark as returned',
      cancelButtonText: 'Cancel'
    });
  
    if (!result.isConfirmed) return;
  
    setLoading(true);
    setMessage(null);
  
    try {
      await api.processReturn(returnReq.borrow_detail_id);
  
      Swal.fire({
        icon: "success",
        title: "Book Returned!",
        timer: 1500,
        showConfirmButton: false,
      });
  
      fetchData();
  
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: err.message || "Failed to return book.",
        timer: 2000,
        showConfirmButton: false,
      });
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
          <p className="text-gray-500 mt-1">Manage borrowing approvals and returns</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-md border flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.type === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('borrow')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'borrow'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Borrow Requests {borrowRequests.length > 0 && `(${borrowRequests.length})`}
          </button>
          <button
            onClick={() => setActiveTab('return')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'return'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Return Requests {returnRequests.length > 0 && `(${returnRequests.length})`}
          </button>
        </nav>
      </div>

      {/* CONTENT AREA */}
      <div>
        {activeTab === 'borrow' ? (
          /* --- BORROW REQUESTS --- */
          <div className="space-y-4">
            {borrowRequests.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
                {refreshing ? 'Loading requests...' : 'No pending borrow requests.'}
              </div>
            ) : (
              <div className="grid gap-4">
                {borrowRequests.map((req) => (
                  <div key={req.borrow_slip_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 transition hover:shadow-md">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
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
                                {req.books?.map((book, idx) => (
                                    <li key={idx} className="truncate">{book.name || book.book_id}</li>
                                ))}
                            </ul>
                        </div>
                      </div>
                      <div className="flex md:flex-col justify-end gap-2 md:w-32 md:border-l md:border-gray-100 md:pl-4">
                         <Button size="sm" onClick={() => handleApproveReject(req.borrow_slip_id, 'approve')} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">Approve</Button>
                         <Button size="sm" variant="danger" onClick={() => handleApproveReject(req.borrow_slip_id, 'reject')} disabled={loading} className="w-full">Reject</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* --- RETURN REQUESTS --- */
          <div className="space-y-4">
             {returnRequests.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
                {refreshing ? 'Loading requests...' : 'No return requests found.'}
              </div>
            ) : (
              <div className="grid gap-4">
                {returnRequests.map((req) => {
                  // Tính penalty nếu overdue
                  const today = new Date();
                  const dueDate = req.due_date ? new Date(req.due_date) : null;
                  let isOverdue = false;
                  let daysOverdue = 0;
                  let lateFee = 0;
                  
                  if (dueDate && today > dueDate) {
                    isOverdue = true;
                    daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                    lateFee = daysOverdue * 5000;
                  }

                  return (
                    <div key={req.borrow_detail_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 transition hover:shadow-md flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-2">
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">RETURN REQUESTED</span>
                          {isOverdue && (
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> OVERDUE
                            </span>
                          )}
                        </div>
                        
                        <h4 className="font-bold text-lg text-gray-900">{req.book_title}</h4>
                        
                        <div className="flex items-center gap-4 text-sm mt-2">
                          <div className="flex items-center gap-1 text-gray-700">
                            <User className="h-4 w-4 text-gray-400" />
                            {req.reader_name}
                          </div>
                          <div className="flex items-center gap-1 text-gray-700">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            Req: {req.request_date ? new Date(req.request_date).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                            <Clock className="h-4 w-4" />
                            Due: {req.due_date ? new Date(req.due_date).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>

                        {/* PENALTY INFO - THÊM ĐOẠN NÀY */}
                        {isOverdue && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-semibold text-red-900">
                                  Overdue Penalty
                                </p>
                                <p className="text-xs text-red-700 mt-0.5">
                                  {daysOverdue} day{daysOverdue > 1 ? 's' : ''} late • <span className="font-bold">{lateFee.toLocaleString('vi-VN')} VND</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center md:w-48">
                        <Button onClick={() => handleQuickReturn(req)} disabled={loading} className="w-full flex items-center justify-center gap-2">
                          <RotateCcw className="h-4 w-4" /> Process Return
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
