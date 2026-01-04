import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookSearchResult } from '../types';
import { Button } from '../components/Button';
import { Search, ShoppingBag, AlertCircle, BookOpen, Check, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Helper to calculate relevance score
const calculateRelevanceScore = (book: BookSearchResult, keyword: string): number => {
  const term = keyword.toLowerCase().trim();
  if (!term) return 0;

  const title = (book.name || '').toLowerCase();
  const author = (book.author || '').toLowerCase();
  const category = (book.category || '').toLowerCase();
  const publisher = (book.publisher || '').toLowerCase();

  let score = 0;

  // 1. Exact Matches (Highest Priority)
  if (title === term) score += 1000;
  if (author === term) score += 500;

  // 2. Starts With (High Priority)
  if (title.startsWith(term)) score += 300;
  if (author.startsWith(term)) score += 150;

  // 3. Contains Whole Phrase (Medium Priority)
  if (title.includes(term)) score += 100;
  if (author.includes(term)) score += 50;
  if (publisher.includes(term)) score += 20;

  // 4. Individual Word Overlap (Low Priority, handles partial matches)
  const words = term.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 1) {
    words.forEach(word => {
      if (title.includes(word)) score += 10;
      if (author.includes(word)) score += 5;
      if (publisher.includes(word)) score += 2;
    });
  }

  return score;
};

export const BookSearch: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const PAGE_SIZE = 12;

  const [books, setBooks] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const [readerStats, setReaderStats] = useState<{
    card_type: string;
    card_status: string;
    max_books: number;
    current_active_books: number;
    remaining_slots: number;
    has_overdue: boolean;
  } | null>(null);

  const navigate = useNavigate();

  // Initial load
  useEffect(() => {
    executeSearch(1);
    fetchReaderStats();
  }, []);

  const fetchReaderStats = async () => {
    try {
      const res = await api.getCurrentlyBorrowed();
      if (res) {
        // Use values directly from backend
        setReaderStats({
          card_type: res.card_type || 'Standard',
          card_status: res.card_status || 'Active',
          max_books: res.max_books || 5,
          current_active_books: res.total_borrowed || 0,
          remaining_slots: res.remaining_slots || 0,
          has_overdue: res.has_overdue || false
        });
        console.log('Reader Stats Set:', {
          has_overdue: res.has_overdue === true,
          remaining_slots: res.remaining_slots || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch reader stats', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const executeSearch = async (page: number) => {
    setLoading(true);
    setErrorMsg('');
    setHasSearched(true);

    try {
      const res = await api.searchBooks({ keyword: keyword, page: page });
      let fetchedBooks = res.books || [];

      // Re-rank results based on relevance to keyword
      if (keyword.trim()) {
        fetchedBooks.sort((a, b) => {
          const scoreA = calculateRelevanceScore(a, keyword);
          const scoreB = calculateRelevanceScore(b, keyword);
          return scoreB - scoreA; // Descending order (Higher score first)
        });
      }

      setBooks(fetchedBooks);
      setTotalRecords(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / PAGE_SIZE));
      setCurrentPage(page);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('Session expired')) {
        navigate('/login');
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg || 'Failed to load books.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      executeSearch(newPage);
    }
  };

  const getBookId = (book: BookSearchResult) => book.id || book.book_title_id || '';

  const toggleBookSelection = (bookId: string) => {
    if (!bookId) return;
    console.log('🔍 Toggle Book - readerStats:', readerStats);

    setSelectedBooks(prev => {
      if (prev.includes(bookId)) {
        // Deselecting - always allowed
        setWarningMsg('');
        return prev.filter(id => id !== bookId);
      } else {
        // Selecting - check limits
        if (readerStats) {
          // 🚫 CHECK 1: Card is permanently blocked
          if (readerStats.card_status === 'Blocked') {
            setErrorMsg(
              'Cannot borrow books. Your card is permanently blocked. Please contact library management.'
            );
            setTimeout(() => setErrorMsg(''), 5000);
            return prev;
          }

          console.log('📌 has_overdue value:', readerStats.has_overdue);
          console.log('📌 has_overdue type:', typeof readerStats.has_overdue);

          // 🚫 CHECK 2: Has overdue books
          if (readerStats.has_overdue) {
            console.log('🚫 BLOCKED: User has overdue books!');
            setErrorMsg(
              'Cannot borrow books. You have overdue books. Please return them first.'
            );
            setTimeout(() => setErrorMsg(''), 5000);
            return prev;
          }

          // Number of books being selected in this request
          const booksToSelect = prev.length + 1;

          // Check: selected books must be <= remaining slots
          if (booksToSelect > readerStats.remaining_slots) {
            setWarningMsg(
              `Cannot select more books. You have ${readerStats.current_active_books} active books and can only borrow ${readerStats.remaining_slots} more (${booksToSelect} selected). Your ${readerStats.card_type} card limit is ${readerStats.max_books} books.`
            );
            setTimeout(() => setWarningMsg(''), 5000);
            return prev;
          }
        }

        setWarningMsg('');
        return [...prev, bookId];
      }
    });
  };

  const handleCreateRequest = async () => {
    if (selectedBooks.length === 0) return;

    // 🚫 CHECK 1: Card is blocked
    if (readerStats?.card_status === 'Blocked') {
      setErrorMsg(
        'Cannot create request. Your card is permanently blocked. Please contact library management.'
      );
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    // 🚫 CHECK 2: Has overdue books
    if (readerStats?.has_overdue) {
      setErrorMsg(
        'Cannot create request. You have overdue books. Please return them first.'
      );
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    // 🚫 CHECK 3: Exceeds remaining slots
    if (readerStats && selectedBooks.length > readerStats.remaining_slots) {
      setErrorMsg(
        `Cannot create request. You can only borrow ${readerStats.remaining_slots} more books (you have ${readerStats.current_active_books} active, max ${readerStats.max_books}).`
      );
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }

    try {
      setLoading(true);
      await api.createBorrowRequest(selectedBooks);
      setSuccessMsg('Borrow request created successfully!');
      setSelectedBooks([]);
      // Refresh reader stats after successful request
      await fetchReaderStats();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      if (err.message && err.message.includes('Session expired')) {
        navigate('/login');
      }
      const msg = err instanceof Error ? err.message : String(err);
      // Check if error is about suspension or overdue books
      if (msg.includes('suspended') || msg.includes('overdue')) {
        setWarningMsg(msg);
        setTimeout(() => setWarningMsg(''), 8000);
      } else {
        setErrorMsg(msg || 'Failed to create request');
        setTimeout(() => setErrorMsg(''), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Blocked Card Warning Modal */}
      {readerStats?.card_status === 'Blocked' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-red-600 mb-2">
                🚫 CARD PERMANENTLY BLOCKED
              </h2>
              <p className="text-gray-600 text-lg">
                Your reading card has been permanently blocked
              </p>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6">
              <p className="font-semibold text-red-800 mb-3 text-lg">⚠️ Important:</p>
              <ul className="space-y-2 text-red-700">
                <li className="flex items-start">
                  <span className="mr-2">*</span>
                  <span>You can ONLY return books that you currently have</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">*</span>
                  <span>You CANNOT borrow any new books</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">*</span>
                  <span>Even after returning all books, your card will remain blocked</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">*</span>
                  <span>You must pay ALL outstanding fines</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">*</span>
                  <span>Contact library management for card review and possible reactivation</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/return-request')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors w-full"
            >
              Go to Return Books
            </button>
          </div>
        </div>
      )}

      {/* Browse Collection Header & Search */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <BookOpen className="text-blue-600" />
            Browse Collection
          </h1>

          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search books by title, author, category, publisher..."
                value={keyword}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {/* Result Count Display */}
          {hasSearched && (
            <div className="mt-4 text-gray-600">
              <Layers className="inline w-5 h-5 mr-2" />
              Found <span className="font-semibold text-gray-900">{totalRecords}</span> results
              {keyword && <span> matching "<span className="font-semibold text-blue-600">{keyword}</span>"</span>}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{errorMsg}</p>
          </div>
        </div>
      )}

      {warningMsg && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-700">{warningMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded flex items-start gap-3">
            <Check className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Reader Stats Info */}
      {readerStats && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          {/* OVERDUE WARNING BANNER */}
          {readerStats.has_overdue && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded mb-4 flex items-start gap-3">
              <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5 w-6 h-6" />
              <div>
                <p className="font-semibold text-orange-800 text-lg">
                  ⚠️ Account Alert: Overdue Books Detected
                </p>
                <p className="text-orange-700 mt-1">
                  You have overdue books. Your account may be suspended. Please return overdue books immediately to avoid penalties.
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-wrap gap-6 items-center">
            <div>
              <span className="text-gray-600">Account Type:</span>{' '}
              <span className="font-semibold text-blue-700">{readerStats.card_type}</span>
            </div>
            <div>
              <span className="text-gray-600">Currently borrowed:</span>{' '}
              <span className="font-semibold">{readerStats.current_active_books} / {readerStats.max_books}</span> books
            </div>
            <div>
              <span className="text-gray-600">You can borrow:</span>{' '}
              <span className={`font-bold text-lg ${readerStats.remaining_slots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {readerStats.remaining_slots}
              </span>{' '}
              more book{readerStats.remaining_slots !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart */}
      {selectedBooks.length > 0 && (
        <div className="fixed bottom-8 right-8 bg-white rounded-lg shadow-2xl p-6 border border-gray-200 max-w-sm z-50">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="text-blue-600" />
            <span className="font-semibold text-lg">
              {selectedBooks.length} book(s) selected
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedBooks([]);
                setWarningMsg('');
              }}>Clear</Button>
            <Button 
              onClick={handleCreateRequest}
              disabled={readerStats?.card_status === 'Blocked' || readerStats?.has_overdue === true}
            >
              Create Borrow Request
            </Button>
          </div>
        </div>
      )}

      {/* Grid of Books - 12 books per page displayed in 4 columns on large screens */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No books found.
            </div>
          )}

          {books.map((book) => {
            const bookId = getBookId(book);
            const isSelected = selectedBooks.includes(bookId);
            const isOutOfStock =
              typeof book.available_books === 'number' && book.available_books === 0;
            const isBlocked = readerStats?.card_status === 'Blocked';
            const hasOverdue = readerStats?.has_overdue === true;
            const cannotBorrow = isOutOfStock || isBlocked || hasOverdue;

            return (
              <div
                key={bookId}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 border-2 ${
                  isSelected ? 'border-blue-500' : 'border-transparent'
                }`}
              >

                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 h-14">
                  {book.name}
                </h3>

                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">By:</span> {book.author}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Category:</span> {book.category}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Publisher:</span> {book.publisher}
                </p>

                {typeof book.available_books === 'number' && (
                  <div className="mb-4">
                    <p className={`text-sm font-semibold ${book.available_books > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {book.available_books > 0 ? `${book.available_books} left` : 'Out of Stock'}
                    </p>
                  </div>
                )}

                <div className="mt-auto">
                  <Button
                    onClick={() => toggleBookSelection(bookId)}
                    disabled={cannotBorrow}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Selected
                      </>
                    ) : isBlocked ? (
                      "Card Blocked"
                    ) : hasOverdue ? (
                      "Overdue Books"
                    ) : isOutOfStock ? (
                      "Out of Stock"
                    ) : (
                      "Select to Borrow"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {books.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <p className="text-gray-600">
              Showing page <span className="font-semibold">{currentPage}</span> of{' '}
              <span className="font-semibold">{totalPages}</span>
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};