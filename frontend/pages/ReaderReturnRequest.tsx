
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CurrentlyBorrowedBook, BorrowStatus } from '../types';
import { Button } from '../components/Button';
import { BookOpen, Clock, RotateCcw, AlertCircle, CheckCircle, Calendar, Hourglass, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';


export const ReaderReturnRequest: React.FC = () => {
  const [activeLoans, setActiveLoans] = useState<CurrentlyBorrowedBook[]>([]);
  const [cardStatus, setCardStatus] = useState<string>('Active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Initial fetch on mount
  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);
      // Fetch currently borrowed books from the history API
      const response = await api.getCurrentlyBorrowed();
      setActiveLoans(response.currently_borrowed_books || []);
      setCardStatus(response.card_status || 'Active');
    } catch (err: any) {
      if (err.message && err.message.includes('Session expired')) {
        navigate('/login');
      }
      setError(err.message || 'Failed to load active loans.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnRequest = async (book: CurrentlyBorrowedBook) => {

    setProcessingId(book.borrow_detail_id);
    setError('');
    setSuccessMsg('');

    try {
      // Send POST request to backend
      await api.requestBookReturn({
        borrow_detail_id: book.borrow_detail_id
      });
      // Refresh the list to reflect the new status (e.g., PendingReturn)
      await fetchActiveLoans();

    } catch (err: any) {
      // Error notification
      Swal.fire({
        icon: 'error',
        title: 'Request Failed',
        text: err.message || "Failed to submit return request"
      });
    } finally {
      setProcessingId(null);
    }
  };


  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading && activeLoans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Blocked Card Warning */}
      {cardStatus === 'Blocked' && (
        <div className="bg-red-50 border-4 border-red-600 rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-600 mb-2">🚫 CARD PERMANENTLY BLOCKED</h3>
              <div className="space-y-2 text-gray-800">
                <p className="font-semibold">⚠️ Your reading card has been permanently blocked.</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>You can <strong>ONLY return books</strong> through this page</li>
                  <li><strong>CANNOT borrow</strong> any new books</li>
                  <li>Even after returning all books, your card <strong>remains blocked</strong></li>
                  <li>Must <strong>pay ALL fines</strong> and contact library management for review</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Return Books</h1>
        <p className="text-gray-600">
          View your currently borrowed books and initiate a return request.
          <br />
          <span className="text-sm text-gray-500 italic">Note: The return is finalized only when a librarian physically receives the book.</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {activeLoans.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 border-dashed p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Active Loans</h3>
          <p className="text-gray-500 mt-1">You don't have any books to return right now.</p>
          <Button className="mt-6" onClick={() => navigate('/')}>Browse Collection</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activeLoans.map((book) => {
             // Check if already requested based on status
             const isPendingReturn = book.status === BorrowStatus.PENDING_RETURN;

             return (
              <div key={book.borrow_detail_id} className={`bg-white rounded-lg border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow ${book.is_overdue ? 'border-red-200 bg-red-50/10' : 'border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg hidden sm:block ${book.is_overdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-primary'}`}>
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{book.title}</h3>
                    <p className="text-gray-600 mb-2">by {book.author}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar className="h-4 w-4" />
                        Borrowed: {formatDate(book.borrow_date)}
                      </span>
                      <span className={`font-medium px-2 py-0.5 rounded text-xs flex items-center gap-1 ${book.is_overdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        <Clock className="h-3 w-3" />
                        Due: {formatDate(book.due_date)}
                        {book.is_overdue && ` (${book.days_overdue} days late)`}
                      </span>
                    </div>
                    
                    {/* Hiển thị tiền phạt */}
                    {book.penalty && book.penalty.is_overdue && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-1">
                          <DollarSign className="h-4 w-4" />
                          Late Fee: {book.penalty.fine_amount.toLocaleString('vi-VN')} VND
                        </div>
                        <p className="text-xs text-red-600">
                          {book.penalty.days_overdue <= 30 
                            ? `${book.penalty.days_overdue} days × 5,000 VND = ${book.penalty.fine_amount.toLocaleString('vi-VN')} VND`
                            : `(${book.penalty.days_overdue} days × 5,000) + Book price ${book.penalty.book_price ? book.penalty.book_price.toLocaleString('vi-VN') : '0'} VND = ${book.penalty.fine_amount.toLocaleString('vi-VN')} VND`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {isPendingReturn ? (
                  <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-md font-medium cursor-default">
                    <Hourglass className="h-4 w-4" />
                    Return Requested
                  </div>
                ) : (
                  <Button
                    onClick={() => handleReturnRequest(book)}
                    isLoading={processingId === book.borrow_detail_id}
                    disabled={processingId !== null && processingId !== book.borrow_detail_id}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border-2 border-primary text-primary hover:bg-blue-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Request Return
                  </Button>
                )}
              </div>
             );
          })}
        </div>
      )}
    </div>
  );
};
