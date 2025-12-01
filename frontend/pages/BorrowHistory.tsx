
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BorrowHistoryRecord, HistoryBookInfo } from '../types';
import { Button } from '../components/Button';
import { BookOpen, Calendar, Clock, AlertCircle, CheckCircle, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FILTER_TABS = [
  { label: 'All', value: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Returned', value: 'returned' },
  { label: 'Rejected', value: 'rejected' },
];

export const BorrowHistory: React.FC = () => {
  const [history, setHistory] = useState<BorrowHistoryRecord[]>([]);
  const [stats, setStats] = useState({ total_borrowed: 0, total_overdue: 0 });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const PAGE_SIZE = 10;

  useEffect(() => {
    fetchHistory();
  }, [activeFilter, currentPage]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getBorrowHistory({
        status: activeFilter,
        page: currentPage,
        pageSize: PAGE_SIZE
      });
      
      setHistory(res.history || []);
      setTotalPages(res.total_pages || Math.ceil((res.total || 0) / PAGE_SIZE) || 1);
    } catch (err: any) {
      if (err.message && err.message.includes('Session expired')) {
        navigate('/login');
      }
      setErrorMsg(err.message || 'Failed to load borrowing history.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [currentRes, overdueRes] = await Promise.all([
        api.getCurrentlyBorrowed(),
        api.getOverdueBooks()
      ]);
      
      setStats({
        total_borrowed: currentRes.total_borrowed || 0,
        total_overdue: overdueRes.total_overdue || 0
      });
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const handleTabChange = (status: string) => {
    setActiveFilter(status);
    setCurrentPage(1);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (book: HistoryBookInfo, slipStatus: string) => {
    // If slip is rejected, everything is rejected
    if (slipStatus.toLowerCase() === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">
          <AlertCircle className="h-3.5 w-3.5" /> Rejected
        </span>
      );
    }

    // If slip is pending, everything is pending
    if (slipStatus.toLowerCase() === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
          <Hourglass className="h-3.5 w-3.5" /> Pending
        </span>
      );
    }

    // If actual return date exists or status is explicitly Returned
    if (book.actual_return_date || book.is_returned || book.status === 'Returned') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
          <CheckCircle className="h-3.5 w-3.5" /> Returned
        </span>
      );
    }

    // If not returned and overdue (calculated by backend)
    if (book.is_overdue || book.status === 'Overdue') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" /> Overdue
        </span>
      );
    }

    // Otherwise it's active/borrowed
    return (
      <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
        <BookOpen className="h-3.5 w-3.5" /> Borrowed
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Borrowing History</h2>
          <p className="text-gray-500">Track your loans and deadlines</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg text-center">
             <span className="block text-xl font-bold text-blue-700">{stats.total_borrowed}</span>
             <span className="text-xs text-blue-600 uppercase font-semibold">Borrowed</span>
          </div>
          <div className="bg-red-50 border border-red-100 px-4 py-2 rounded-lg text-center">
             <span className="block text-xl font-bold text-red-700">{stats.total_overdue}</span>
             <span className="text-xs text-red-600 uppercase font-semibold">Overdue</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeFilter === tab.value
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:text-primary hover:bg-blue-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {errorMsg}
        </div>
      )}

      {/* Content Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
           <div className="p-12 flex justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
           </div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <RotateCcw className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg">No records found.</p>
            {activeFilter !== 'All' && (
              <Button variant="ghost" className="mt-2 text-primary" onClick={() => handleTabChange('All')}>
                View All History
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Info</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrowed Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Deadline <span className="font-normal normal-case text-gray-400">(Due Date)</span>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Returned On
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Direct iteration over history records (each record is a book detail) */}
                {history.map((record) => {
                  const book = record.book;
                  return (
                    <tr key={record.borrow_detail_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 flex-shrink-0 rounded flex items-center justify-center ${book.is_overdue && !book.actual_return_date ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-primary'}`}>
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[200px]" title={book.title}>
                              {book.title}
                            </div>
                            {book.author && <div className="text-xs text-gray-500">{book.author}</div>}
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              ID: {book.book_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Borrow Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(record.borrow_date)}
                        </div>
                      </td>

                      {/* Deadline / Due Date (From Slip) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex flex-col">
                           <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                              {/* Use due_date from record (slip) */}
                              {record.due_date ? (
                                  <>
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      {formatDate(record.due_date)}
                                  </>
                              ) : (
                                  <span className="text-gray-400 italic text-xs">
                                    {record.status === 'Pending' ? 'Pending Approval' : '-'}
                                  </span>
                              )}
                           </div>

                           {/* Overdue/Time Left Context */}
                           {record.due_date && !book.actual_return_date && (record.status === 'Active' || book.status === 'Active') && (
                             book.is_overdue ? (
                               <span className="text-xs text-red-600 font-bold mt-0.5">
                                 {book.days_overdue} day{book.days_overdue !== 1 ? 's' : ''} overdue
                               </span>
                             ) : (
                               <span className="text-xs text-green-600 mt-0.5">On time</span>
                             )
                           )}
                         </div>
                      </td>

                      {/* Actual Return Date (From Book Details or top-level if sync) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                         {book.actual_return_date ? (
                           <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {formatDate(book.actual_return_date)}
                           </div>
                         ) : (
                           <span className="text-gray-400 text-sm pl-6">-</span>
                         )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(book, record.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {history.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || loading}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
