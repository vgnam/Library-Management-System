
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CurrentlyBorrowedBook, BorrowStatus } from '../types';
import { Button } from '../components/Button';
import { BookOpen, Clock, RotateCcw, AlertCircle, CheckCircle, Calendar, Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ReaderReturnRequest: React.FC = () => {
  const [activeLoans, setActiveLoans] = useState<CurrentlyBorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  const fetchActiveLoans = async () => {
    try {
      setLoading(true);

      // Use the History API to get currently borrowed books
      const response = await api.getCurrentlyBorrowed();
      setActiveLoans(response.currently_borrowed_books || []);

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
    if (!window.confirm(`Request to return "${book.title}"?`)) return;

    setProcessingId(book.borrow_detail_id);
    setError('');
    setSuccessMsg('');

    try {
        await api.requestBookReturn({
            borrow_detail_id: book.borrow_detail_id
        });

        setSuccessMsg(`Return requested for "${book.title}". Please bring the book to the library.`);

        // Refresh to get the updated status
        await fetchActiveLoans();

    } catch (err: any) {
        setError(err.message || "Failed to submit return request");
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
             // Check if already requested (Assuming status in CurrentlyBorrowedBook reflects this)
             const isPendingReturn = book.status === BorrowStatus.PENDING_RETURN;

             return (
              <div key={book.borrow_detail_id} className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg hidden sm:block">
                    <BookOpen className="h-6 w-6 text-primary" />
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
                  </div>
                </div>

                {isPendingReturn ? (
                  <div className="w-full sm:w-auto flex items-center justify-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-md font-medium">
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
