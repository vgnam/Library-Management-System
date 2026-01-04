import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BorrowHistoryRecord, HistoryBookInfo } from '../types';
import { Button } from '../components/Button';
import { BookOpen, Calendar, Clock, AlertCircle, CheckCircle, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';


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
  const [totalRecords, setTotalRecords] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const PAGE_SIZE = 12;

  useEffect(() => {
    console.log('Fetching history for filter:', activeFilter, 'page:', currentPage);
    fetchHistory();
  }, [activeFilter, currentPage]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params: any = {
        page: currentPage,
        pageSize: PAGE_SIZE
      };
      
      // Only add status if it's not "All"
      if (activeFilter !== 'All') {
        params.status = activeFilter;
      }
      
      console.log('API params:', params);
      const res = await api.getBorrowHistory(params);
      console.log('API response:', res);
      
      setHistory(res.history || []);
      setTotalPages(res.total_pages || 1);
      setTotalRecords(res.total || 0);
    } catch (err: any) {
      console.error('Error fetching history:', err);
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

  const handleCancelRequest = async (borrowSlipId: string, bookTitle: string) => {
    setLoading(true);
  
    try {
      await api.cancelBorrowRequest(borrowSlipId);
  
      setHistory(prev => prev.filter(item => item.borrow_slip_id !== borrowSlipId));

      await fetchHistory();
  
      Swal.fire({
        title: "Cancelled!",
        text: `You cancelled the request for "${bookTitle}".`,
        timer: 1200,
        showConfirmButton: false,
      });
  
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: err.message || "Failed to cancel request."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (status: string) => {
    console.log('Changing tab to:', status);
    setActiveFilter(status);
    setCurrentPage(1); // Reset to page 1 when changing filter
  };

  const handlePageChange = (newPage: number) => {
    console.log('Changing page to:', newPage);
    setCurrentPage(newPage);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const status = book.status || slipStatus;
    const statusLower = status.toLowerCase();
    
    // Rejected - Red
    if (statusLower === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-semibold">
          <AlertCircle className="h-3.5 w-3.5" /> Rejected
        </span>
      );
    }

    // Pending approval - Blue
    if (statusLower === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
          <Hourglass className="h-3.5 w-3.5" /> Pending
        </span>
      );
    }

    // Pending Return - Show in RED if overdue, YELLOW if on time
    if (statusLower === 'pending return' || statusLower === 'pendingreturn') {
      const isOverdue = book.is_overdue || statusLower.includes('overdue');
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isOverdue 
            ? 'bg-red-100 text-red-700' 
            : 'bg-yellow-50 text-yellow-700'
        }`}>
          <Clock className="h-3.5 w-3.5" /> 
          Pending Return
          {isOverdue && <span className="ml-1 text-[10px]">(Overdue)</span>}
        </span>
      );
    }

    // Returned - Gray
    if (book.actual_return_date || book.is_returned || statusLower === 'returned') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
          <CheckCircle className="h-3.5 w-3.5" /> Returned
        </span>
      );
    }

    // Lost - Dark Red
    if (statusLower === 'lost') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-900 text-white px-3 py-1 rounded-full text-xs font-semibold">
          <AlertCircle className="h-3.5 w-3.5" /> Lost
        </span>
      );
    }

    // Overdue - Red
    if (book.is_overdue || statusLower === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" /> Overdue
        </span>
      );
    }

    // Active/Borrowed - Green
    if (statusLower === 'active' || statusLower === 'borrowed') {
      return (
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
          <BookOpen className="h-3.5 w-3.5" /> Borrowed
        </span>
      );
    }

    // Default fallback - show the actual status
    return (
      <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
        {status}
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Penalty</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(record.borrow_date)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex flex-col">
                           <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
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


                      <td className="px-6 py-4 whitespace-nowrap">
                      {book.actual_return_date ? (
                           <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {formatDate(book.actual_return_date)}
                           </div>
                         ) : (book.status?.toLowerCase() === 'pending' || record.status?.toLowerCase() === 'pending') ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRequest(record.borrow_slip_id, book.title)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                          >
                            Cancel Request
                          </Button>
                         ) : (
                           <span className="text-gray-400 text-sm pl-6">-</span>
                         )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(book, record.status)}
                      </td>

                      <td className="px-6 py-4">
                        {record.penalty ? (
                          <div className="space-y-1.5 max-w-xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                record.penalty.status === 'Paid' 
                                  ? 'bg-green-100 text-green-700' 
                                  : record.penalty.status === 'Cancelled'
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                <AlertCircle className="h-3 w-3" />
                                {record.penalty.penalty_type}
                              </div>
                              <div className="flex items-center gap-1">
                                {record.penalty.real_time_calculated && record.penalty.status === 'Pending' && (
                                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" title="Live updating"></span>
                                )}
                                <span className={`text-xs font-bold ${
                                  record.penalty.status === 'Paid' 
                                    ? 'text-green-700' 
                                    : record.penalty.status === 'Cancelled'
                                    ? 'text-gray-600'
                                    : 'text-red-700'
                                }`}>
                                  {record.penalty.fine_amount.toLocaleString('vi-VN')} VND
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 line-clamp-2" title={record.penalty.description}>
                              {record.penalty.description}
                              {record.penalty.real_time_calculated && record.penalty.status === 'Pending' && (
                                <span className="ml-1 text-orange-600 font-medium">(Updates daily)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {/* Only show status badge if not returned or if paid/cancelled */}
                              {(record.status !== 'Returned' || record.penalty.status !== 'Pending') && (
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                  record.penalty.status === 'Paid' 
                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                    : record.penalty.status === 'Cancelled'
                                    ? 'bg-gray-50 text-gray-600 border border-gray-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                  {record.penalty.status === 'Paid' && <CheckCircle className="h-2.5 w-2.5" />}
                                  {record.penalty.status === 'Cancelled' && <AlertCircle className="h-2.5 w-2.5" />}
                                  {record.penalty.status === 'Pending' && <Clock className="h-2.5 w-2.5" />}
                                  {record.penalty.status}
                                </div>
                              )}
                              {/* Show days late info only for non-returned or if status is Paid/Cancelled */}
                              {record.penalty.days_overdue && record.penalty.days_overdue > 0 && 
                               (record.status !== 'Returned' || record.penalty.status !== 'Pending') && (
                                <span className="text-[10px] text-red-600 font-medium">
                                  {record.penalty.days_overdue} day{record.penalty.days_overdue > 1 ? 's' : ''} late
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No penalty</span>
                        )}
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
      {!loading && history.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * PAGE_SIZE, totalRecords)}</span> of{' '}
            <span className="font-medium">{totalRecords}</span> results
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {/* Show page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(currentPage + 1)}
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