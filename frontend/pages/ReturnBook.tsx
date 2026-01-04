
import React, { useState } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Search, User, Book, AlertTriangle, CheckCircle, XCircle, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { ReaderStatusResponse, CurrentlyBorrowedBook } from '../types';

export const ReturnBook: React.FC = () => {
  const [readerId, setReaderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [readerData, setReaderData] = useState<ReaderStatusResponse | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [selectedBook, setSelectedBook] = useState<CurrentlyBorrowedBook | null>(null);
  const [actionType, setActionType] = useState<'return' | 'damage' | 'lost' | null>(null);
  const [damageDesc, setDamageDesc] = useState('');
  const [fineAmount, setFineAmount] = useState('');

  const fetchReaderStatus = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!readerId.trim()) return;

    setLoading(true);
    setError('');
    setReaderData(null);
    setSuccessMsg('');

    try {
      const data = await api.getReaderStatus(readerId);
      setReaderData(data);
    } catch (err: any) {
      setError(err.message || 'Reader not found or error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (book: CurrentlyBorrowedBook, type: 'return' | 'damage' | 'lost') => {
    setSelectedBook(book);
    setActionType(type);
    setDamageDesc('');
    setFineAmount('');
  };

  const closeModal = () => {
    setSelectedBook(null);
    setActionType(null);
  };

  const processAction = async () => {
    if (!selectedBook || !readerData) return;

    setLoading(true);
    setError('');

    try {
      let result;
      if (actionType === 'return') {
        // Librarian processes return (good condition default)
        result = await api.processReturn(selectedBook.borrow_detail_id);
        
        // Check for permanent card block
        if (result?.data?.card_blocked && result?.data?.unblock_instructions) {
          setError(`🚫 ${result.data.unblock_instructions}`);
        }
        // Check for card unsuspension
        else if (result?.data?.card_unsuspended) {
          setSuccessMsg(`Book "${selectedBook.title}" returned successfully. ✅ Card status restored to Active!`);
        } else {
          setSuccessMsg(`Book "${selectedBook.title}" returned successfully.`);
        }
      } else if (actionType === 'damage') {
        result = await api.reportDamage({
          borrow_detail_id: selectedBook.borrow_detail_id,
          damage_description: damageDesc,
          fine_amount: fineAmount ? parseFloat(fineAmount) : undefined
        });
        
        // Check for permanent card block
        if (result?.data?.card_blocked && result?.data?.unblock_instructions) {
          setError(`🚫 ${result.data.unblock_instructions}`);
        }
        else if (result?.data?.card_unsuspended) {
          setSuccessMsg(`Damage reported for "${selectedBook.title}". Fine applied. ✅ Card status restored to Active!`);
        } else {
          setSuccessMsg(`Damage reported for "${selectedBook.title}". Fine applied.`);
        }
      } else if (actionType === 'lost') {
        result = await api.reportLost({
          borrow_detail_id: selectedBook.borrow_detail_id
        });
        
        // Check for permanent card block
        if (result?.data?.card_blocked && result?.data?.unblock_instructions) {
          setError(`🚫 ${result.data.unblock_instructions}`);
        }
        else if (result?.data?.card_unsuspended) {
          setSuccessMsg(`Book "${selectedBook.title}" reported lost. Compensation required. ✅ Card status restored to Active!`);
        } else {
          setSuccessMsg(`Book "${selectedBook.title}" reported lost. Compensation required.`);
        }
      }

      // Close modal and refresh data to show updated list
      closeModal();
      await fetchReaderStatus();

    } catch (err: any) {
      setError(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
      {/* Search Header */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Process Returns</h1>
        <p className="text-gray-500 mb-6 text-sm">Scan a Reader ID to view active loans and process returns, damages, or lost items.</p>

        <form onSubmit={fetchReaderStatus} className="flex gap-4">
          <div className="relative flex-grow max-w-lg">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
             </div>
             <input
               type="text"
               value={readerId}
               onChange={(e) => setReaderId(e.target.value)}
               placeholder="Enter Reader ID (e.g., RD001)..."
               className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow"
             />
          </div>
          <Button type="submit" isLoading={loading} disabled={!readerId.trim()} className="h-[46px]">
            Fetch Reader
          </Button>
        </form>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-2 animate-fade-in-up">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {readerData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Reader Profile Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit md:sticky md:top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{readerData.full_name}</h3>
                <p className="text-sm text-gray-500 font-mono">{readerData.reader_id}</p>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Card Type</span>
                <span className="font-bold text-primary uppercase">{readerData.card_type}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Account Status</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                  readerData.card_status === 'Active' ? 'bg-green-100 text-green-700' : 
                  readerData.card_status === 'Suspended' ? 'bg-yellow-100 text-yellow-700' :
                  readerData.card_status === 'Blocked' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {readerData.card_status}
                </span>
              </div>
              
              {/* Blocked Card Warning */}
              {readerData.card_status === 'Blocked' && (
                <div className="p-3 bg-red-50 border-l-4 border-red-600 rounded-r-lg">
                  <p className="text-xs font-bold text-red-800 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    🚫 PERMANENTLY BLOCKED
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    ⚠️ Reader must pay ALL outstanding fines and contact library management for review.
                  </p>
                  <p className="text-xs text-red-600 mt-1 font-semibold">
                    Will NOT be automatically unblocked.
                  </p>
                </div>
              )}
              
              {/* Suspension Warning */}
              {readerData.card_status === 'Suspended' && (
                <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                  <p className="text-xs font-bold text-yellow-800 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Suspended - Overdue Books
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Process all overdue returns to restore active status
                  </p>
                </div>
              )}
              
              {/* Infraction Count Display */}
              {readerData.infraction_count !== undefined && readerData.infraction_count > 0 && (
                <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg">
                  <p className="text-xs font-bold text-orange-800">
                    ⚠️ Infractions: {readerData.infraction_count}/3
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    {3 - readerData.infraction_count} more infraction(s) until permanent block
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 mt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Active Loans</span>
                  <span className="font-bold text-gray-900">{readerData.current_borrowed_count} / {readerData.borrow_limit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((readerData.current_borrowed_count / readerData.borrow_limit) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Loans List */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                <Book className="h-5 w-5 text-gray-500" /> Active Loans ({readerData.active_loans.length})
                </h3>
            </div>

            {readerData.active_loans.length === 0 ? (
              <div className="bg-white border border-gray-200 border-dashed rounded-xl p-12 text-center text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3 opacity-50" />
                <p className="text-lg font-medium">All clear!</p>
                <p>Reader has no active loans to return.</p>
              </div>
            ) : (
              readerData.active_loans.map((book) => (
                <div key={book.borrow_detail_id} className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col sm:flex-row justify-between gap-4 transition-all hover:shadow-md ${book.is_overdue ? 'border-l-4 border-l-red-500 border-gray-200' : 'border-l-4 border-l-green-500 border-gray-200'}`}>
                  <div className="flex-grow">
                    <h4 className="font-bold text-lg text-gray-900">{book.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">By {book.author}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs">
                      <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">
                        Borrowed: {formatDate(book.borrow_date)}
                      </span>
                      <span className={`px-2 py-1 rounded font-bold ${book.is_overdue ? 'bg-red-500 text-white' : 'bg-green-100 text-green-700'}`}>
                        Due: {formatDate(book.due_date)}
                        {book.is_overdue && ` (${book.days_overdue} days overdue)`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 min-w-[140px]">
                    <Button
                        size="sm"
                        onClick={() => handleActionClick(book, 'return')}
                        className="w-full justify-center bg-green-600 hover:bg-green-700 shadow-sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Return
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleActionClick(book, 'damage')}
                            className="flex-1 justify-center text-xs"
                        >
                        Damage
                        </Button>
                        <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleActionClick(book, 'lost')}
                            className="flex-1 justify-center text-xs"
                        >
                        Lost
                        </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {selectedBook && actionType && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">

            {/* Modal Header */}
            <div className={`p-4 text-white flex justify-between items-center ${
                actionType === 'return' ? 'bg-green-600' : 
                actionType === 'damage' ? 'bg-yellow-600' : 'bg-red-600'
            }`}>
                <h3 className="text-lg font-bold capitalize flex items-center gap-2">
                    {actionType === 'return' && <CheckCircle className="h-5 w-5" />}
                    {actionType === 'damage' && <AlertTriangle className="h-5 w-5" />}
                    {actionType === 'lost' && <XCircle className="h-5 w-5" />}
                    {actionType === 'return' ? 'Confirm Return' :
                     actionType === 'damage' ? 'Report Damage' : 'Report Lost Book'}
                </h3>
                <button onClick={closeModal} className="text-white/80 hover:text-white"><XCircle className="h-6 w-6" /></button>
            </div>

            <div className="p-6">
                <p className="text-gray-600 mb-6 text-sm">
                  You are processing <span className="font-bold text-gray-900">{selectedBook.title}</span>.
                </p>

                {actionType === 'return' && (
                    <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm mb-4">
                        Confirm that the book is in <strong>Good Condition</strong> and has been returned to the shelf.
                    </div>
                )}

                {actionType === 'damage' && (
                <div className="space-y-4 mb-4">
                    <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                        <div className="flex items-center gap-1"><FileText className="h-3 w-3" /> Damage Description</div>
                    </label>
                    <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                        rows={3}
                        value={damageDesc}
                        onChange={(e) => setDamageDesc(e.target.value)}
                        placeholder="E.g., Torn cover, water damage on page 50..."
                    />
                    </div>
                    <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                        <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Fine Amount (VND)</div>
                    </label>
                    <input
                        type="number"
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={fineAmount}
                        onChange={(e) => setFineAmount(e.target.value)}
                        placeholder="Leave blank for automatic calculation"
                    />
                    </div>
                </div>
                )}

                {actionType === 'lost' && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-lg text-sm text-red-800 mb-4">
                    <strong className="block mb-1">⚠️ Warning</strong>
                    Reporting a book as lost will mark it as unavailable in the catalog and may apply a full replacement fee to the reader's account.
                </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={closeModal} disabled={loading}>Cancel</Button>
                <Button
                    variant={actionType === 'return' ? 'primary' : 'danger'}
                    className={actionType === 'return' ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={processAction}
                    isLoading={loading}
                    disabled={actionType === 'damage' && !damageDesc.trim()}
                >
                    Confirm Process
                </Button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
